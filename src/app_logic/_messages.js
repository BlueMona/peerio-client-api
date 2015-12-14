/**
 * Peerio App Logic: messages
 */

var Peerio = this.Peerio || {};
Peerio._Messages = {};

Peerio._Messages.init = function () {
    'use strict';

    L.verbose('Peerio.Messages.init() start');

    var api = Peerio.Messages;
    delete Peerio.Messages.init;
    var net = Peerio.Net;
    Peerio.ACK_MSG = Peerio.ACK_MSG || ':::peerioAck:::';
    // Array, but contains same objects accessible both by index and by id
    api.cache = null;

    var getAllConversationsPromise = null;

    function onMessageAdded(message) {
        L.info('Handling MessageAdded server event');
        var convPromise = api.cache[message.conversationID] ? Promise.resolve() : api.getOneConversation(message.conversationID);

        convPromise.then(function () {
                return decryptMessage(message);
            })
            .then(function (decrypted) {
                if (!decrypted) return Promise.reject();
                decrypted.isModified = true;
                if (decrypted.fileIDs) decrypted.fileIDs.forEach(function (fileid) {
                    if (Peerio.Files.cache.hasOwnProperty(fileid)) return;
                    Peerio.Files.fetch(fileid);
                });
                return addMessageToCache(message.conversationID, decrypted);
            })
            .then(Peerio.Action.messageAdded.bind(null, message.conversationID));
    }

    function onMessageRead(data) {
        L.info('Handling MessageRead server event');
        var message = api.cache[data.conversationID].messages[data.messageID];

        Promise.map(data.recipients, function (recipient) {
            if (recipient.username === Peerio.user.username || !recipient.receipt || !recipient.receipt.encryptedReturnReceipt) return;

            return Peerio.Crypto.decryptReceipt(recipient.username, recipient.receipt.encryptedReturnReceipt)
                .then(function (decryptedReceipt) {
                    // decrypted receipt contains timestamp
                    if (decryptedReceipt.indexOf(message.receipt) === 0) {
                        if (message.receipts.indexOf(recipient.username) < 0)
                            message.receipts.push(recipient.username);
                    }
                });

        }).then(function () {
            Peerio.Action.receiptAdded(data.conversationID);
        });
    }

    function onConversationRemoved(data) {
        L.info('Handling ConversationRemoved server event');
        var i = _.findIndex(api.cache, function (c) {
            return c.id === data.id;
        });
        if (i < 0) return;
        api.cache.splice(i, 1);
        delete api.cache[data.id];
        Peerio.Action.conversationsUpdated();
    }

    net.subscribe('messageAdded', onMessageAdded);
    net.subscribe('messageRead', onMessageRead);
    net.subscribe('conversationRemoved', onConversationRemoved);

    // todo: request proof, error handling
    api.removeConversation = function (id) {
        L.info('Peerio.Messages.removeConversation({0})', id);
        net.removeConversation([id]);
    };

    api.getOneConversation = function (id) {
        L.info('Peerio.Messages.getOneConversation({0})', id);
        if (api.cache[id]) Promise.resolve();
        return net.getConversationPages([{id: id, page: -1}])
            .then(function (response) {
                return decryptConversations(response.conversations);
            })
            .then(addConversationsToCache);
    };

    /**
     * Loads conversations list with 1 original message in each of them.
     * Loads and decrypts page by page, adds each page to the cache.
     * Calls progress callback for every page, passing entire cache array to it.
     * Resolves once everything is loaded and decrypted.
     * @promise
     */
    api.getAllConversations = function () {
        L.info('Peerio.Messages.getAllConversations()');

        if (getAllConversationsPromise) return getAllConversationsPromise;

        if (api.cache) return Promise.resolve(api.cache);

        api.cache = [];
        // temporary paging based on what getConversationIDs returns
        return getAllConversationsPromise = net.getConversationIDs()
            .then(function (response) {
                // building array with arrays of requests to pull conversation with 1 message
                var ids = response.conversationID;
                var pages = [];
                for (var i = 0; i < ids.length; i++) {
                    var request = [];
                    for (var j = 0; j < 10 && i < ids.length; j++, i++) {
                        request.push({id: ids[i], page: -1});
                    }
                    pages.push(request);
                }
                return pages;
            })
            .then(function (pages) {
                if (pages.length === 0) Peerio.Action.conversationsUpdated();
                // Promise.each executes next function call after previous promise is resolved
                return Promise.each(pages, function (page) {
                    return net.getConversationPages(page)
                        .then(function (response) {
                            return decryptConversations(response.conversations);
                        })
                        .then(addConversationsToCache);

                });
            })
            .then(function () {
                getAllConversationsPromise = null;
            })
            .then(function () {
                return api.markModifiedConversations();
            })
            .return(api.cache);

    };

    api.loadAllConversationMessages = function (conversationID) {
        L.info('Peerio.Messages.loadAllConversationMessages({0})', conversationID);
        var conversation = api.cache[conversationID];
        if (conversation._pendingLoadPromise) return conversation._pendingLoadPromise;

        return conversation._pendingLoadPromise = new Promise(function (resolve, reject) {
            var page = 0;
            var load = function () {
                loadPage(conversation, page).then(function (length) {
                    if (length === 0) {
                        resolve(conversation);
                        return;
                    }
                    Peerio.Action.messageAdded(conversationID);
                    page++;
                    load();
                });
            };
            load();
        });
    };

    function loadPage(conversation, page) {
        return Peerio.Net.getConversationPages([{id: conversation.id, page: page}])
            .then(function (response) {
                var messages = response.conversations[conversation.id].messages;
                if (Object.keys(messages).length === 0) return [];
                return decryptMessages(messages);
            })
            .then(function (messages) {
                if (messages.length) addMessagesToCache(conversation, messages);
                return messages.length;
            });
    }

    api.markAsRead = function (conversation) {
        L.info('Peerio.Messages.markAsRead({0})', conversation.id);
        var toSend = [];
        Promise.map(conversation.messages, function (msg) {
            if (!msg.isModified) return;
            return Peerio.Crypto.encryptReceipt(msg.receipt.toString() + Date.now(), msg.sender)
                .then(function (receipt) {
                    toSend.push({id: msg.id, encryptedReturnReceipt: receipt});
                });
        }).then(function () {
            if (!toSend.length) return;
            return Peerio.Net.readMessages(toSend);
        }).then(function () {
            conversation.isModified = false;

        });
    };

    api.markModifiedConversations = function () {
        L.info('Peerio.Messages.markModifiedConversations()');
        return Peerio.Net.getModifiedMessageIDs()
            .then(function (resp) {
                return Peerio.Net.getMessages(resp.messageIDs);
            })
            .then(function (resp) {
                for (var id in resp.messages) {
                    if (!resp.messages.hasOwnProperty(id)) return;
                    var conv = api.cache[resp.messages[id].conversationID];
                    if (conv) conv.isModified = true;
                }
            });
    };

    function getEncryptedMessage(recipients, subject, body, fileIDs) {
        var message = {
            subject: subject,
            message: body,
            receipt: nacl.util.encodeBase64(nacl.randomBytes(32)),
            fileIDs: fileIDs || [],
            participants: recipients,
            sequence: 0
        };
        return Peerio.Crypto.encryptMessage(message, recipients);
    }

    function buildFileHeaders(recipients, fileIds) {
        return Promise.map(fileIds, function (id) {

            return generateFileHeader(recipients, id)
                .then(function (header) {
                    return {id: id, header: header};
                });

        }, Peerio.Crypto.recommendedConcurrency);
    }

    function generateFileHeader(recipients, id) {
        var publicKeys = [Peerio.user.publicKey];
        recipients.forEach(function (username) {
            var contact = Peerio.user.contacts[username];
            if (contact && contact.publicKey && publicKeys.indexOf(contact.publicKey) < 0) {
                publicKeys.push(contact.publicKey);
            }
        });
        return Peerio.Crypto.recreateHeader(publicKeys, Peerio.Files.cache[id].header);
    }

    api.sendMessage = function (recipients, subject, body, fileIds, conversationID) {
        L.info('Peerio.Messages.sendMessage({0}, , , {1}, {2})', recipients, fileIds, conversationID);
        if (recipients.indexOf(Peerio.user.username) < 0)
            recipients.push(Peerio.user.username);

        return getEncryptedMessage(recipients, subject, body, fileIds)
        // building data transfer object
            .then(function (encrypted) {
                if (!encrypted.header || !encrypted.body) return Promise.reject('Message encryption failed.');
                return {
                    recipients: recipients,
                    header: encrypted.header,
                    body: encrypted.body,
                    conversationID: conversationID,
                    isDraft: false

                };
            })
            // re-encrypting file headers (sharing files)
            .then(function (messageDTO) {
                return buildFileHeaders(recipients, fileIds)
                    .then(function (fileHeaders) {
                        messageDTO.files = fileHeaders;
                        return messageDTO;
                    });
            })
            .then(function (messageDTO) {
                return Peerio.Net.createMessage(messageDTO);
            });

    };

    api.sendACK = function (conversation) {
        api.sendMessage(conversation.participants, '', Peerio.ACK_MSG, [], conversation.id);
    };

    /**
     * adds conversations to cache with duplicate checks
     * and re-sorts the cache array by lastTimestamp
     * @param conversations
     */
    function addConversationsToCache(conversations) {
        conversations.forEach(function (item) {
            if (api.cache[item.id]) return;
            api.cache.push(item);
            api.cache[item.id] = item;
            if (item.original.isModified) item.isModified = true;
        });
        Peerio.Util.sortDesc(api.cache, 'lastTimestamp');
        Peerio.Action.conversationsUpdated();
    }

    function addMessagesToCache(conversation, messages) {
        var cachedMessages = conversation.messages;
        messages.forEach(function (item) {
            if (cachedMessages[item.id]) return;
            cachedMessages.push(item);
            cachedMessages[item.id] = item;
            if (item.isModified) conversation.isModified = true;
        });
        Peerio.Util.sortAsc(cachedMessages, 'timestamp');
    }

    function addMessageToCache(conversationID, message) {
        var cachedMessages = api.cache[conversationID].messages;
        if (cachedMessages[message.id]) return cachedMessages[message.id];

        cachedMessages.push(message);
        cachedMessages[message.id] = message;

        if (message.isModified) api.cache[conversationID].isModified = true;

        Peerio.Util.sortAsc(cachedMessages, 'timestamp');
        return message;
    }

    /**
     * Decrypts a list of conversations concurrently putting load on all available crypto workers.
     * It assumes there is only ONE message in conversation (original one).
     * @param {object} conversations - conversation objects list in {id: object} format
     * @returns {Promise<Array>} - array of decrypted conversation objects
     */
    function decryptConversations(conversations) {
        var decryptedConversations = [];
        var keys = Object.keys(conversations);

        // executes decryption with concurrency,
        // given the specific number of crypto workers running.
        // this makes sense because otherwise we have a chance to use too much resources on ui thread.
        return Promise.map(keys, function (convId) {
                var conv = conversations[convId];
                var encMessage = conv.messages[conv.original];
                // no original message id in conversation?
                // not a normal case, but I think still exists somewhere in old conversations
                if (!encMessage) {
                    console.log('Conversation misses original message', conv);
                    return;
                }

                return decryptMessage(encMessage)
                    .then(function (message) {
                        // can't proceed unless we decrypted original message
                        if (!message) return;
                        conv.original = message;
                        // both indexed and associative ways to store conversation
                        decryptedConversations[convId] = conv;
                        decryptedConversations.push(conv);
                        // replace messages with decrypted ones
                        conv.messages = [];
                        conv.messages.push(message);
                        conv.messages[message.id] = message;

                        // security measure, conversation metadata is not encrypted
                        conv.participants = message.participants;

                        conv.lastTimestamp = +conv.lastTimestamp;
                        conv.lastMoment = moment(conv.lastTimestamp);
                        conv.formerParticipants = [];
                        if (conv.events)
                            conv.events.forEach(function (event) {
                                if (event.type !== 'remove') return;
                                conv.formerParticipants.push(event.participant);
                            });

                        conv.allParticipants = conv.formerParticipants ? conv.participants.concat(conv.formerParticipants) : conv.participants;

                    });

            }, Peerio.Crypto.recommendedConcurrency)
            .return(decryptedConversations);

    }

    function decryptMessages(messages) {
        var keys = Object.keys(messages);

        return Promise.map(keys, function (msgId) {
                return decryptMessage(messages[msgId]);
            }, Peerio.Crypto.recommendedConcurrency)
            .filter(function (msg) {
                return !!msg;
            });
    }

    /**
     * decrypts single message and all data in it, including receipts
     * @promise resolves with decrypted message object
     */
    function decryptMessage(encMessage) {
        return Peerio.Crypto.decryptMessage(encMessage)
            .then(function (message) {
                delete message.ack;
                message.id = encMessage.id;
                message.sender = encMessage.sender;
                message.timestamp = +encMessage.timestamp;
                message.moment = moment(message.timestamp);
                message.isModified = encMessage.isModified;
                return message;
            }).catch(function () {
                console.log('failed to decrypt message: ', encMessage);
                return null;
            });
    }

    L.verbose('Peerio.Messages.init() stop');

};