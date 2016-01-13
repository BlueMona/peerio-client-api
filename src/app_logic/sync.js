var Peerio = this.Peerio || {};

(function () {
    'use strict';

    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    Peerio.Sync = {
        syncMessages: syncMessages,
        interrupt: interrupt
    };

    //--------------------------------------------------------------------------------------------------------------------

    var entryProcessors = {
        conversation: processConversationEntry,
        conversation_participants: processConversationParticipantsEntry,
        conversation_deleted: processConversationDeletedEntry,
        message: processMessageEntry,
        message_read: processMessageReadEntry
    };


    // index entries will be loaded and processed in batches
    var batch = 15;
    var running = false;
    var runAgain = false;
    var interruptRequested = false;
    var progressMsg = 'downloading message data';

    var notify;

    function resetNotify() {
        notify = {};
        // when conversations were added
        notify.updateAllConversations = false;
        // when conversations were updated (files, read status, last timestamp) or deleted
        notify.updated = null;
        // when specific conversations were updated or there are new messages in them
        notify.deleted = null;
    }

    function addUpdateNotify(id) {
        internalAddNotify(id, 'updated');
    }

    function addDeleteNotify(id) {
        internalAddNotify(id, 'deleted');
    }

    // we want notify.updated and notify.deleted to be
    // null - when there is nothing to update or delete
    // empty array - when there is more then 10 items and we just prefer to update all
    function internalAddNotify(id, type) {
        var arr = notify[type];
        if (arr && arr.length === 0) return;

        if (!arr) arr = notify[type] = [];
        arr.push(id);
        if (arr.length > 10) notify[type] = [];
    }

    function doNotify() {
        if (notify.updateAllConversations === false && notify.updated === null && notify.deleted === null) return;
        L.verbose(notify);
        Peerio.Action.conversationsUpdated(notify);
    }

    resetNotify();

    function syncMessages() {
        if (running) {
            runAgain = true;
            L.verbose('Message sync already running.');
            return;
        }
        L.verbose('Starting message sync.');
        resetNotify();
        running = true;
        runAgain = false;
        Peerio.Action.syncProgress(0, 0, progressMsg);

        return Promise.all([Peerio.SqlQueries.getMaxSeqID(), Peerio.Net.getMaxMessageIndexID()])
            .spread((localMax, serverMax)=> {
                if (localMax === serverMax) return;
                var progressStartAt = localMax;
                var progressEndAt = serverMax - localMax;
                // building a promise that we'll settle manually
                // we don't want to use chain here, because it might get really long, consuming ram and cpu
                return new Promise((resolve, reject) => {
                    // asyc recursive function that executes processing of one page at a time
                    var callProcess = () => {
                        Peerio.Action.syncProgress(localMax - progressStartAt, progressEndAt, progressMsg);
                        if (interruptRequested) {
                            interruptRequested = false;
                            reject('Sync interrupted.');
                            return;
                        }
                        return processPage(localMax + 1, Math.min(serverMax, localMax + batch))
                            .then(()=> {
                                // moving to next page
                                localMax += batch;
                                // if all range was processed
                                if (localMax > serverMax) {
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
            .finally(()=> {
                L.verbose('Message sync stopped.');
                doNotify();
                Peerio.Action.syncProgress(1, 1, progressMsg);
                running = false;
                interruptRequested = false;
                if (runAgain) window.setTimeout(syncMessages, 0);
            });
    }

    // just to avoid generating 100500 log messages about unknown types in index
    var unknownTypes = [];

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
                        // todo: temp hack to ignore wrong index entries
                        if (entry.type === 'message' && entry.deleted == true) return;
                        entry.entity.seqID = id;
                        var processor = entryProcessors[entry.type];
                        if (!processor) {
                            if (entry.type in unknownTypes) return;
                            unknownTypes.push(entry.type);
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
        L.silly('{0}: Processing new conversation entry.', entry.entity.seqID);
        notify.updateAllConversations = true;
        return Peerio.Conversation().applyServerData(entry.entity).insert();
    }

    function processConversationParticipantsEntry(entry) {
        L.silly('{0}: Processing participants entry.', entry.entity.seqID);
        addUpdateNotify(entry.entity.id);
        return Peerio.Conversation().applyServerData(entry.entity).updateParticipants();
    }

    function processConversationDeletedEntry(entry) {
        L.silly('{0}: Processing conversation delete entry.', entry.entity.seqID);
        addDeleteNotify(entry.entity.id);
        return Peerio.Conversation.deleteFromCache(entry.entity.id);
    }


    function processMessageEntry(entry) {
        L.silly('{0}: Processing message entry.', entry.entity.seqID);
        notify.updateAllConversations = true;
        addUpdateNotify(entry.entity.id);
        var msg = Peerio.Message();
        return msg.applyServerData(entry.entity)
            .then(() => msg.insert())
            .then(() => {
                if (msg.subject != null && msg.subject != '')
                    return Peerio.SqlQueries.updateConversationSubject(msg.subject, msg.id);
            })
            .catch(err=> {
                //todo: separate different error processing
                //todo: detect orphaned conversations
                L.error(err);
            });
    }

    function processMessageReadEntry(entry) {
        L.silly('{0}: Processing message read entry.', entry.entity.seqID);

        addUpdateNotify(entry.entity.messageID);
        return Peerio.Message.addReceipt(entry.entity);
    }

    function updateConversations() {
        L.verbose('Mass-updating conversations after sync...');
        return Promise.all([
            Peerio.SqlQueries.setConversationsCreatedTimestamp(),
            Peerio.SqlQueries.updateConversationsLastTimestamp(),
            Peerio.SqlQueries.updateConversationsUnread(),
            Peerio.SqlQueries.updateConversationsHasFiles()
        ]).tap(()=> {
            L.verbose('Mass-update conversations done.');
        }).catch((err)=> {
            L.verbose('Mass-update conversations error.');
            return Promise.reject(err);
        });

    }

    function interrupt() {
        interruptRequested = running;
    }


})();