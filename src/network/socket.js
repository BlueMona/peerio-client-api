/**
 *  Portion of web socket handling code that runs in UI thread.
 *  This code provides a thin layer between socket instance in web worker
 *  and networking layer.
 */

var Peerio = this.Peerio || {};
Peerio.Socket = {};
/**
 * Initialises Peerio Socket handling code
 */
Peerio.Socket.init = function () {
    'use strict';

    delete Peerio.Socket.init;
    // malicious server safe hasOwnProperty function;
    var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);
    // webworker instance
    var worker;
    // socket events handler
    var eventHandler;
    // pending callbacks id:function
    var callbacks = {};

    /**
     *  Subscribes a callback to socket events and server push notifications.
     *  This method exists to provide better layer decoupling
     *  and is supposed to be called only once, there is no need for multiple handlers in current app design.
     *  @param {function(string)} handler - callback will be called with string parameter - event name.
     */
    Peerio.Socket.injectEventHandler = function (handler) {
        if (eventHandler) throw new Error('Socket event handler already injected.');
        eventHandler = handler;
    };

    Peerio.Socket.start = function () {
        if (worker) {
            try {
                worker.onmessage = null;
                worker.terminate();
            } catch (err) {
                L.error("Error terminating socket worker. {0}", err);
            }
        }
        // worker instance holding the actual web socket
        worker = new Worker(Peerio.Config.apiFolder + 'socket_worker_bundle.js');
        // handles messages from web socket containing worker
        worker.onmessage = messageHandler;

        // initializing worker
        worker.postMessage(Peerio.Config);
    };

    function messageHandler(message) {
        var data = message.data;
        // todo: hmmm, should L.js do this instead of Peerio.Util?
        if (Peerio.Util.processWorkerLog(data)) return;

        if (hasProp(data, 'callbackID') && data.callbackID) {
            callbacks[data.callbackID](data.data);
            delete callbacks[data.callbackID];
            return;
        }

        if (eventHandler && hasProp(data, 'socketEvent')) {
            eventHandler(data.socketEvent, data.data);
        }
    }


    /**
     * Sends message to the serve
     *
     * @param {string} name - message name
     * @param {Object} [data] - message data
     * @param {Function} [callback] - server response
     * @param {Object} [transfer] - data member object to transfer ownership to
     */
    Peerio.Socket.send = function (name, data, callback, transfer) {

        // registering the callback, if provided
        var callbackID = null;
        if (typeof(callback) === 'function') {
            callbackID = uuid();
            callbacks[callbackID] = callback;
        }

        // object to send
        var message = {
            name: name,
            data: data,
            callbackID: callbackID
        };

        worker.postMessage(message, transfer);
    };

    Peerio.Socket.reconnect = function () {
        worker.postMessage({name: 'reconnectSocket'});
    };
    Peerio.Socket.disconnect = function () {
        worker.postMessage({name: 'disconnectSocket'});
    };
    Peerio.Socket.connect = function () {
        worker.postMessage({name: 'connectSocket'});
    };
    /**
     * Restarts worker if it has hanged (happens on mobile)
     */
    Peerio.Socket.ensureWorkerAlive = function () {
        new Promise(function(resolve){
            Peerio.Socket.send('pingWorker', null, resolve);
        })
        .timeout(2000)
        .catch(function(){
            L.error('Socket worker not responding. Restarting.');
            Peerio.Socket.start();
        });
    };


};
