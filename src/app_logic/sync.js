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
    var batch = 20;

    function syncMessages() {
        return Promise.all([Peerio.SqlQueries.getMaxSeqID(), Peerio.Net.getMaxMessageIndexId()])
            .spread((localMax, serverMax)=> {
                // building a promise that we'll settle manually
                // we don't want to use chain here, because it might get really long, consuming ram and cpu
                return new Promise((resolve, reject) => {
                    // asyc recursive function that executes processing of one page at a time
                    var callProcess = () => {
                        Peerio.Action.syncProgress(localMax, serverMax, 'downloading messages');
                        return processPage(localMax, Math.min(serverMax, localMax + batch))
                            .then(()=> {
                                // moving to next page
                                localMax += batch + 1;
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
        return;
        return Peerio.SqlQueries.conversationExists(entry.id)
            .then(exists => {
                if (exists) return;

                var c = Peerio.Conversation.create(entry).save();
            });
    }

    function processConversationParticipantsEntry(entry) {
        return;
        console.log(entry);

    }

    function processConversationDeletedEntry(entry) {
        return;
        console.log(entry);

    }

    function processMessageEntry(entry) {
        return;
        console.log(entry)
    }

    function processMessageReadEntry(entry) {
        return;
        console.log(entry)
    }

    function interrupt() {
        return;
        console.log('interrupt')
    }


})();