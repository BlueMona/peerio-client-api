/**
 *  Portion of web socket handling code that runs in UI thread.
 *  This code provides a thin layer between socket instance in web worker
 *  and networking layer.
 */

var Peerio = this.Peerio || {};
Peerio.Socket = {};

(function () {
  'use strict';

  // malicious server safe hasOwnProperty function;
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);

  // worker instance holding the actual web socket
  var worker = new Worker(Peerio.Config.socketWorkerPath);

  // initializing worker
  worker.postMessage({ socketIOPath: Peerio.Config.socketIOPath,
                       server: Peerio.Config.webSocketServer});

  // pending callbacks id:function
  var callbacks = {};
  var eventHandler = null;

  /**
   *  Subscribes a callback to socket events and server push notifications.
   *  This method exists to provide better layer decoupling
   *  and is supposed to be called only once both by unit tests or by real app.
   *  @param {function(string)} handler - callback will be called with string parameter - event name.
   */
  Peerio.Socket.injectEventHandler = function (handler) {
    if(eventHandler) throw new Error('Socket event handler already injected.');
    eventHandler = handler;
  };

  /**
   * Sends message to the serve
   *
   * @param {string} name - message name
   * @param {Object} [data] - message data
   * @param {Function} [callback] - server response
   */
  Peerio.Socket.send = function (name, data, callback) {

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

    // for file upload we want to transfer ownership of the chunk data
    // so it won't get copied
    var transfer = null;
    if (name === 'uploadFileChunk') {
      transfer = [message.ciphertext];
    }

    worker.postMessage(message, transfer);
  };

  worker.onmessage = function (message) {
    var data = message.data;
    console.log(data);
    if (hasProp(data, 'callbackID') && data.callbackID) {
      callbacks[data.callbackID](data.data);
      delete callbacks[data.callbackID];
      return;
    }

    if (eventHandler && hasProp(data, 'socketEvent')) {
      eventHandler(data.socketEvent);
    }

  };

})();
