/**
 * Peerio App Logic: messages
 */

var Peerio = this.Peerio || {};
Peerio.Messages = {};

Peerio.Messages.init = function () {
  'use strict';

  var api = Peerio.Messages;
  delete Peerio.Messages.init;
  var net = Peerio.Net;
  Peerio.ACK_MSG = Peerio.ACK_MSG || ':::peerioAck:::';
  // Array, but contains same objects accessible both by index and by id
  api.cache = null;

  var getAllConversationsPromise = null;

  api.onMessageAdded = function (message) {
    var convPromise = api.cache[message.conversationID] ? Promise.resolve() : api.getOneConversation(message.conversationID);

    convPromise.then(function () {return decryptMessage(message);})
      .then(function (decrypted) {
        return addMessageToCache(message.conversationID, decrypted);
      })
      .then(Peerio.Action.messageAdded);
  };

  net.injectPeerioEventHandler('messageAdded', api.onMessageAdded);

  api.getOneConversation = function (id) {
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
   * todo: resume support in case of disconnection/error in progress
   */
  api.getAllConversations = function (progress) {
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
        // Promise.each executes next function call after previous promise is resolved
        return Promise.each(pages, function (page) {
          return net.getConversationPages(page)
            .then(function (response) {
              return decryptConversations(response.conversations);
            })
            .then(addConversationsToCache)
            .then(function () {
              progress(api.cache);
            });
        });
      })
      .then(function () {
        getAllConversationsPromise = null;
      })
      .return(api.cache);

  };

  // todo
  api.loadAllConversationMessages = function (conversationID) {
    var conversation = api.cache[conversationID];
    if (conversation._pendingLoadPromise) return conversation._pendingLoadPromise;

    return conversation._pendingLoadPromise = Peerio.Net.getConversationPages([{id: conversationID, page: '0'}])
      .then(function (response) {
        return decryptMessages(response.conversations[conversationID].messages);
      })
      .then(function (messages) {
        addMessagesToCache(conversation, messages);
        return conversation;
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
    });
    // todo: this can be a potential bottleneck, replace with a sorted list
    Peerio.Util.sortDesc(api.cache, 'lastTimestamp');
  }

  function addMessagesToCache(conversation, messages) {
    var cachedMessages = conversation.messages;
    messages.forEach(function (item) {
      if (cachedMessages[item.id]) return;
      cachedMessages.push(item);
      cachedMessages[item.id] = item;
    });
    // todo: this can be a potential bottleneck, replace with a sorted list
    Peerio.Util.sortAsc(cachedMessages, 'timestamp');
  }

  function addMessageToCache(conversationID, message) {
    var cachedMessages = api.cache[conversationID].messages;
    if (cachedMessages[message.id]) return cachedMessages[message.id];

    cachedMessages.push(message);
    cachedMessages[message.id] = message;

    // todo: this can be a potential bottleneck, replace with a sorted list
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
      // no original message in conversation?
      // not a normal case, but I think still exists somewhere in old conversations
      if (!encMessage) {
        console.log('Conversation misses original message', conv);
        return;
      }
      // both indexed and associative ways to store conversation
      decryptedConversations[convId] = conv;
      decryptedConversations.push(conv);
      // we will replace messages with decrypted ones
      conv.messages = [];
      conv.lastTimestamp = +conv.lastTimestamp;
      conv.lastMoment = moment(conv.lastTimestamp);
      conv.formerParticipants = [];
      if (conv.events)
        conv.events.forEach(function (event) {
          if (event.type !== 'remove') return;
          conv.formerParticipants.push(event.participant);
        });

      conv.allParticipants = conv.formerParticipants ? conv.participants.concat(conv.formerParticipants) : conv.participants;

      return decryptMessage(encMessage)
        .then(function (message) {
          conv.messages.push(message);
          conv.messages[message.id] = message;
          conv.original = message;
        });
    }, Peerio.Crypto.recommendedConcurrency)
      .return(decryptedConversations);

  }

  function decryptMessages(messages) {
    var keys = Object.keys(messages);

    return Promise.map(keys, function (msgId) {
      return decryptMessage(messages[msgId]);
    }, Peerio.Crypto.recommendedConcurrency);
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
      });
  }

}
;