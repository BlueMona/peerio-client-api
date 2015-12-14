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
    var batch = 10;
    var running = false;
    var interruptRequested = false;
    var progressMsg = 'downloading message data';

    function syncMessages() {
        if (running) return;
        running = true;
        Peerio.Action.syncProgress(0, 0, progressMsg);

        return Promise.all([Peerio.SqlQueries.getMaxSeqID(), Peerio.Net.getMaxMessageIndexId()])
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
                        return processPage(localMax, Math.min(serverMax, localMax + batch - 1))
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
                Peerio.Action.syncProgress(1, 1, progressMsg);
                running = false;
                interruptRequested = false;
            });
    }

    // just to avoid generating 100500 log messages about unknown types in index
    var unknownTypes = [];

    function processPage(from, to) {
        var chain = Promise.resolve();
        // load from server
        return Peerio.Net.getMessageIndexEntries(from, to)
            .then(entries => {
                for (var id in entries) {
                    (function () { // closure to capture mutable vars
                        var entry = entries[id];
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
        return Peerio.Conversation.fromServerData(entry.entity).insert();
    }

    function processConversationParticipantsEntry(entry) {
        return Peerio.Conversation.fromServerData(entry.entity).updateParticipants();
    }

    function processConversationDeletedEntry(entry) {
        return Peerio.Conversation.deleteFromCache(entry.entity.id);
    }

    function processMessageEntry(entry) {
        return Peerio.Message.create(entry.entity)
            .then(msg => msg.insert()
                .then(() => {
                    if (msg.subject != null && msg.subject != '') return Peerio.SqlQueries.updateConversationSubject(msg.subject, msg.id);
                }));
    }

    function processMessageReadEntry(entry) {
        return Peerio.Message.addReceipt(entry.entity);
    }

    function updateConversations() {
        return Promise.all([
            Peerio.SqlQueries.setConversationsCreatedTimestamp(),
            Peerio.SqlQueries.updateConversationsLastTimestamp(),
            Peerio.SqlQueries.updateConversationsUnreadCount(),
            Peerio.SqlQueries.updateConversationsHasFiles()
        ]);

    }

    function interrupt() {
        interruptRequested = running;
    }


})();