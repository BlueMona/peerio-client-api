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

    // indicator that sync is currently running
    var running = false;
    var runningPromise = null;
    // if another call to sync will be made while one is still running - this will be true
    var resyncRequested = false;
    // index entries will be loaded and processed in batches
    var batch = 10;

    function syncMessages() {
        if (running) {
            resyncRequested = true;
            return runningPromise;
        }

        running = true;

        runningPromise = Promise.all([Peerio.SqlQueries.getMaxSeqID(), Peerio.Net.getMaxMessageIndexId()])
            .spread((localMax, serverMax)=> {
                // building a promise that we'll settle manually
                // we don't want to use chain here, because it might get really long, consuming ram and cpu
                return new Promise((resolve, reject) => {
                    // asyc recursive function that executes processing of one page at a time
                    var callProcess = () => {
                        return processPage(localMax, Math.min(serverMax, localMax + 10))
                            .then(()=> {
                                // moving to next page
                                localMax += 11;
                                // if all range was processed
                                if (localMax > serverMax) {
                                    resolve();
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
                running = false;
                runningPromise = null;
                if (resyncRequested) {
                    resyncRequested = false;
                    syncMessages();
                }
            });

        return runningPromise;
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
                        entry.seqID = id;
                        var processor = entryProcessors[entry.type];
                        if (!processor) {
                            if (entry.type in unknownTypes) return;
                            unknownTypes.push(entry.type);
                            L.error('Unknown index type: {0}', entry.type);
                            return;
                        }
                        chain.then(() => processor(entry.entity));
                    })();
                }
                return chain;
            })
    }

    function processConversationEntry(entry) {
        return Peerio.SqlQueries.conversationExists(entry.id)
            .then(exists => {
                if (exists) return;

                var c = Peerio.Conversation.create(entry)
                    .then(c.save);
            });
    }

    function processConversationParticipantsEntry(entry) {
        console.log(entry);

    }

    function processConversationDeletedEntry(entry) {
        console.log(entry);

    }

    function processMessageEntry(entry) {
    }

    function processMessageReadEntry(entry) {

    }

    function interrupt() {

    }


})();