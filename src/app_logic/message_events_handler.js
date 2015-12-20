/**
 * Event handler listens to the server events related to messages.
 *
 * Server starts emitting events immediately after login, but application might not be ready
 * to process them yet (syncing), that's why event handler uses processing queue with ability to pause(on disconnect)
 * and resume (when sync module decides it is ready)
 *
 *
 * Depends on:
 * ----------
 * Peerio.Net
 * Peerio.user
 *
 */
var Peerio = this.Peerio || {};

(function () {
    'use strict';

    var queue;

    Peerio.MessagesEventHandler = {
        init: init,
        pause: () => queue.pause(),
        resume: () => queue.resume()
    };

    function init() {
        delete this.init;
        queue = Queue();
        var net = Peerio.Net;
        net.subscribe('conversationModified', queue.add.bind(queue, onConversationModified));
        net.subscribe('conversationRemoved', queue.add.bind(queue, onConversationRemoved));
        //
        net.subscribe('messageAdded', queue.add.bind(queue, onMessageAdded));
        net.subscribe('messageRead', queue.add.bind(queue, onMessageRead));

    }

    function onConversationModified(data) {
        L.silly('Conversation modified. {0}', data);
        // Only conversation view or conversation info view might be interested in this event
        var c = Peerio.Conversation().applyServerData(data);
        return c.updateParticipants()
            .then(()=> Peerio.Action.participantLeft(c));

    }

    function onConversationRemoved(data) {
        L.silly('Conversation removed. {0}', data);
        // Conversations list or conversation view/info might be interested
        Peerio.Conversation.deleteFromCache(data.id)
            .then(() => Peerio.Action.conversationRemoved(data.id));
    }

    //todo: this could be optimized after though edge cases analysis. for now just safe flow
    function onMessageAdded(data) {
        L.silly('message added. {0}', data);
        // not waiting for promise, it's gonna queue with next sql request anyway
        Peerio.Conversation().applyServerData(entry.entity).insert();
        var msg = Peerio.Message();
        return msg.applyServerData(entry.entity)
            .then(function(){

            })
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

    function onMessageRead(data) {
        L.silly('message read. {0}', data);

    }

})();