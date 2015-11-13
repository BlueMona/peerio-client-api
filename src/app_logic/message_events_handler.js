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
        //net.subscribe('conversationModified', queue.add.bind(queue, onConversationModified));
        //net.subscribe('conversationRemoved', queue.add.bind(queue, onConversationRemoved));
        //
        //net.subscribe('messageAdded', queue.add.bind(queue, onMessageAdded));
        //net.subscribe('messageRead', queue.add.bind(queue, onMessageRead));

    }

    function onConversationModified(data){

    }

    function onConversationRemoved(data){

    }

    function onMessageAdded(data){

    }

    function onMessageRead(data){

    }

})();