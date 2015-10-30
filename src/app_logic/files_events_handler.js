/**
 * Event handler listens to the server events related to files.
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

    Peerio.FilesEventHandler = {
        init: init,
        pause: () => queue.pause(),
        resume: () => queue.resume()
    };

    function init() {
        delete this.init;
        queue = Queue();
        var net = Peerio.Net;

        net.subscribe('fileAdded', queue.add.bind(queue, onFileAdded));
        net.subscribe('fileRemoved', queue.add.bind(queue, onFileRemoved));

    }

    function onFileAdded(data){

    }

    function onFileRemoved(data){

    }

    
})();