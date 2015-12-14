/**
 * Event handler listens to the server events related to contact collection.
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

    Peerio.ContactsEventHandler = {
        init: init,
        pause: () => queue.pause(),
        resume: () => queue.resume()
    };

    function init() {
        delete this.init;
        queue = Queue();
        var net = Peerio.Net;
        net.subscribe('contactAdded', queue.add.bind(queue, onAdded));
        net.subscribe('contactRemoved', queue.add.bind(queue, onRemoved));

        net.subscribe('contactRequestSent', queue.add.bind(queue, onRequestSent));
        net.subscribe('sentContactRequestRemoved', queue.add.bind(queue, onSentRequestRemoved));

        net.subscribe('contactRequestReceived', queue.add.bind(queue, onRequestReceived));
        net.subscribe('receivedContactRequestRemoved', queue.add.bind(queue, onReceivedRequestRemoved));
    }

    function onAdded(data) {
        Peerio.Contact.fromServerData(data)
            .then(contact => {
                Peerio.user.onContactAdded(contact, data.collectionVersion);
            });
    }

    function onRemoved(data) {
        Peerio.user.onContactRemoved(data.username, data.collectionVersion);
    }

    function onRequestSent(data) {
        Peerio.Contact.fromServerData(data)
            .then(contact => {
                Peerio.user.onContactRequestSent(contact, data.collectionVersion);
            });
    }

    function onSentRequestRemoved(data) {
        Peerio.user.onSentContactRequestRemoved(data.username, data.collectionVersion);
    }

    function onRequestReceived(data) {
        Peerio.Contact.fromServerData(data)
            .then(contact => {
                Peerio.user.onContactRequestReceived(contact, data.collectionVersion);
            });
    }

    function onReceivedRequestRemoved(data) {
        Peerio.user.onReceivedContactRequestRemoved(data.username, data.collectionVersion);
    }

})();