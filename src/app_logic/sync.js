var Peerio = this.Peerio || {};

(function () {
    'use strict';

    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    Peerio.Sync = {
        syncMessages: syncMessages,
        syncMessagesThrottled: _.throttle(syncMessages, 0),
        interrupt: interrupt,
        init: init
    };

    //--------------------------------------------------------------------------------------------------------------------

    var entryProcessors = {
        conversation: processConversationEntry,
        conversation_participants: processConversationParticipantsEntry,
        conversation_deleted: processConversationDeletedEntry,
        message: processMessageEntry,
        message_read: processMessageReadEntry
    };

    // 20 Feb 2016, aprrox. date at which all clients should be able to speak '1.1.0' protocol
    var protocolChangeDate = 1458424800000;

    // index entries will be loaded and processed in batches
    var batch = 15;
    var running = false;
    var runAgain = false;
    var interruptRequested = false;
    var progressMsg = t('sync_messages');

    var notify;
    // to minimize update statements we cache last messageID in conversation
    var lastMessagesCache;

    function resetNotify() {
        notify = {};
        notify.updated = null;
        notify.deleted = null;
    }


    function addNotify(id, type) {
        var arr = notify[type];
        if (arr && arr.length === 0) return;
        if (id === null) {
            arr ? arr.length = 0 : notify[type] = [];
            return;
        }

        if (!arr) arr = notify[type] = [];
        arr.push(id);
        if (arr.length > 10) arr.length = 0;
    }

    function doNotify() {
        if (notify.updated === null && notify.deleted === null) return;
        L.verbose('notify: {0}', notify);
        Peerio.Action.conversationsUpdated(notify);
    }

    resetNotify();

    var securityCache = null;

    function loadSecurityCache() {
        if (securityCache) return Promise.resolve();
        return Peerio.SqlQueries.getConversationsSecurityInfo().then(data => Peerio.Sync.securityCache = securityCache = data);
    }

    function verifyAndAddToSecurityCache(conversation) {
        securityCache[conversation.id] = {
            secretConversationID: null,
            originalMsgID: conversation.originalMsgID,
            innerIndex: 0,
            timestamp: 0,
            empty: true
        };
        return true;
    }

    function verifyAndUpdateSecurityCache(msg) {
        var sec = securityCache[msg.conversationID];
        if (!sec) {
            L.error('Security cache for message id {0} not found', msg.id);
            return false;
        }
        // initializing security cache item
        if (sec.empty) {
            if (sec.originalMsgID !== msg.id) {
                L.error('First received message({0}) for conversation({1}) does not match original message id({2}) ',
                    msg.id, msg.conversationID, sec.originalMsgID);
                return false;
            }
            sec.empty = false;
            sec.timestamp = msg.timestamp || 0;
            sec.innerIndex = msg.innerIndex || 0;
            sec.secretConversationID = msg.secretConversationID;
        }

        // validating message
        if (msg.metadataVersion !== '1.0.0' && msg.metadataVersion !== '1.1.0') {
            L.error('Unknown message metadata version {0}', msg.metadataVersion);
            return false;
        }

        if (msg.metadataVersion === '1.0.0') {
            if (msg.outerTimestamp > protocolChangeDate) {
                L.error('Obsolete metadata version');
                return false;
            }
            return true;
        }

        if (msg.encryptedMetadataVersion && msg.metadataVersion !== msg.encryptedMetadataVersion) {
            L.error('Message metadata version {0} does not match metadata version in encrypted message {1}',
                msg.metadataVersion, msg.encryptedMetadataVersion);
            return false;
        }

        if (Math.abs(msg.timestamp - msg.outerTimestamp) > 120000) {
            L.error('Metadata and message timestamps too far from each other.');
            return false;
        }

        if (sec.secretConversationID && !msg.secretConversationID) {
            L.error('secretConversationID missing');
            return false;
        }

        // for first 1.1.0 message in pre-protocol 1.1.0 conversations
        if (!sec.secretConversationID && msg.secretConversationID) sec.secretConversationID = msg.secretConversationID;

        if (msg.secretConversationID !== sec.secretConversationID) {
            L.error('secretConversationID mismatch');
            return false;
        }

        if (msg.innerIndex !== msg.outerIndex) {
            L.error('index mismatch');
            return false;
        }

        if (msg.innerIndex - sec.innerIndex > 1) {
            L.error('index sequence broken');
            return false;
        }

        if (msg.timestamp < sec.timestamp && sec.timestamp - msg.timestamp > 120000) {
            L.error('timestamp smaller then previous message');
            return false;
        }

        sec.innerIndex = msg.innerIndex;
        sec.timestamp = msg.timestamp;
        return true;

    }

    function init() {
        securityCache = null;
        return recoverDatabase()
            .then(loadSecurityCache);
    }


    function syncMessages() {
        if (running) {
            runAgain = true;
            L.verbose('Message sync already running.');
            return;
        }
        L.verbose('Starting message sync.');
        resetNotify();
        lastMessagesCache = {};
        running = true;
        runAgain = false;
        Peerio.Action.syncProgress(0, 0, progressMsg);
        return recoverDatabase()
            .then(() => Promise.all([
                    Peerio.SqlQueries.getMaxSeqID(),
                    Peerio.Net.getMaxMessageIndexID(),
                    Peerio.TinyDB.saveItem('syncInProgress', true, Peerio.user.username)
                ])
            )
            .spread((localMax, serverMax) => {
                L.silly('Local max seqid: {0}, server max seqid: {1}', localMax, serverMax);
                if (localMax === serverMax) return;
                var progressStartAt = localMax;
                var progressEndAt = serverMax - localMax;
                // building a promise that we'll settle manually
                // we don't want to use chain here, because it might get really long, consuming ram and cpu
                return new Promise((resolve, reject) => {
                    // async recursive function that executes processing of one page at a time
                    var callProcess = () => {
                        L.silly('{0} {1}/{2}', progressMsg, localMax - progressStartAt, progressEndAt)
                        Peerio.Action.syncProgress(localMax - progressStartAt, progressEndAt, progressMsg);
                        if (interruptRequested) {
                            L.info('Sync interrupt was requested, stopping.');
                            interruptRequested = false;
                            reject('Sync interrupted.');
                            return;
                        }
                        processPage(localMax + 1, Math.min(serverMax, localMax + batch))
                            .then(()=> {
                                // moving to next page
                                localMax += batch;
                                // if all range was processed
                                if (localMax > serverMax) {
                                    L.silly('All sequences processed. Proceeding to mass-update');
                                    updateConversations().then(resolve).catch(reject);
                                    return;
                                }
                                // if not, doing this again (but with lower edge raised)
                                callProcess();
                            })
                            .catch(reject);
                    };
                    // starting the chain
                    callProcess();
                });
            })
            .then(() => Peerio.TinyDB.removeItem('syncInProgress', Peerio.user.username))
            .finally(() => {
                L.verbose('Message sync stopped.');
                doNotify();
                Peerio.Action.syncProgress(1, 1, progressMsg);
                running = false;
                interruptRequested = false;
                if (runAgain) window.setTimeout(syncMessages, 0);
            });
    }

    function processPage(from, to) {
        var chain = Promise.resolve();
        // load from server
        L.silly('Requesting page from {0} to {1}', from, to);
        return Peerio.Net.getMessageIndexEntries(from, to)
            .then(entries => {
                for (var id in entries) {
                    var mEntry = entries[id];
                    (function () { // closure to capture mutable vars
                        var entry = mEntry;
                        // hack to ignore wrong index entries, happens sometimes
                        if (entry.deleted === true) return;
                        entry.entity.seqID = id;
                        var processor = entryProcessors[entry.type];
                        if (!processor) {
                            L.error('Unknown index type: {0}', entry.type);
                            return;
                        }
                        chain = chain.then(() => processor(entry));
                    })();
                }
                return chain;
            })
    }

    function processConversationEntry(entry) {
        var data = entry.entity;
        L.silly('{0}: Processing new conversation entry.', data.seqID);
        addNotify(data.id, 'updated');

        var c = Peerio.Conversation().applyServerData(data);
        if (verifyAndAddToSecurityCache(c)) {
            return c.insert();
        }
    }

    function processConversationParticipantsEntry(entry) {
        L.silly('{0}: Processing participants entry.', entry.entity.seqID);
        addNotify(entry.entity.id, 'updated');
        return Peerio.Conversation().applyServerData(entry.entity).updateParticipants();
    }

    function processConversationDeletedEntry(entry) {
        L.silly('{0}: Processing conversation delete entry.', entry.entity.seqID);
        addNotify(entry.entity.id, 'deleted');
        return Peerio.Conversation.deleteFromCache(entry.entity.id);
    }


    function processMessageEntry(entry) {
        L.silly('{0}: Processing message entry.', entry.entity.seqID);
        addNotify(entry.entity.conversationID, 'updated');
        var msg = Peerio.Message();
        return msg.applyServerData(entry.entity)
            .then(() => {
                if (verifyAndUpdateSecurityCache(msg))
                    return msg.insert();
                else
                    return Promise.reject();
            })
            .then(() => {
                lastMessagesCache[msg.conversationID] = msg.id;

                msg.receipts.forEach(username => Peerio.SqlQueries.updateReadPosition(msg.conversationID, username, entry.entity.seqID));

                if (msg.sender == Peerio.user.username)
                    Peerio.SqlQueries.updateReadPosition(msg.conversationID, Peerio.user.username, entry.entity.seqID)
            })
            .then(() => {
                // 1. old format conversations might not have index
                // but if it's there and > 0 - it's not the original message
                // 3. sequence is from old format
                // 4. both index and sequence can be used to detect first message due to migration transition of old conversation
                // 0 does not mean original message, but > 0 can be trusted t obe NOT the original one
                if (is.number(msg.innerIndex) && msg.innerIndex > 0 || is.number(msg.sequence) && msg.sequence > 0) return;
                // todo: trust index == 0 for new format conversations (start timestamp after migration)
                if (msg.subject != null)
                    return Peerio.SqlQueries.updateConversationFromFirstMsg(msg.id, msg.subject, msg.secretConversationID || '');
            })
            .catch(err=> {
                //todo: separate different error processing
                //todo: detect orphaned messages
                if (err) L.error(err);
            });
    }

    function processMessageReadEntry(entry) {
        L.silly('{0}: Processing message read entry.', entry.entity.seqID);
        addNotify(entry.entity.conversationID, 'updated');
        return Peerio.SqlQueries.updateReadPosition(entry.entity.conversationID, entry.entity.username, entry.entity.seqID);
    }

    function updateLastMessages() {
        for (var id in lastMessagesCache) {
            Peerio.SqlQueries.updateConversationLastMsgID(id, lastMessagesCache[id]);
        }
    }

    function updateConversations() {
        L.B.start('Mass update');
        L.verbose('Mass-updating conversations after sync...');
        return Promise.all([
                Peerio.SqlQueries.setConversationsCreatedTimestamp(),
                Peerio.SqlQueries.updateConversationsLastTimestamp(),
                Peerio.SqlQueries.updateConversationsHasFiles(),
                updateLastMessages()
            ])
            .then(()=>Peerio.SqlQueries.updateConversationsRead(Peerio.user.username))
            .then(()=> {
                Peerio.SqlQueries.getConversationsUnreadState()
                    .then(unread=> {
                        Peerio.user.setConversationsUnreadState(unread);
                    });
            })
            .tap(()=> {
                L.verbose('Mass-update conversations done.');
            })
            .catch((err)=> {
                L.verbose('Mass-update conversations error.');
                return Promise.reject(err);
            })
            .finally(() => L.B.stop('Mass update'));
    }


    function interrupt() {
        interruptRequested = running;
    }

    function recoverDatabase() {
        L.silly('Checking if last sync was interrupted.');
        return Peerio.TinyDB.getItem('syncInProgress', Peerio.user.username)
            .then(inProgress => {
                L.silly(inProgress ? 'Last sync was interrupted! Recovering database.' : 'Last sync was not interrupted');
                // if true - last sync was interrupted
                if (inProgress) {
                    securityCache = null;
                    L.B.start('DB recovery');
                    return Peerio.SqlQueries.recoverLastMsgIDsOnConversations()
                        .finally(() => L.B.stop('DB recovery'));
                }
            });
    }


})();