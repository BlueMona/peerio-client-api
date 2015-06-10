/**
 *  Portion of web socket handling code that runs in UI thread.
 *  This code provides a thin layer between socket instance in web worker
 *  and networking layer.
 */

window.Peerio = window.Peerio || {};
Peerio.Socket = {};

(function () {
  'use strict';

  // malicious server safe hasOwnProperty function;
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);

  // todo: inject this from config
  // worker instance holding the actual web socket
  var worker = new Worker('/base/src/network/socket_worker.js');

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
    var callbackId = null;
    if (typeof(callback) === 'function') {
      callbackId = uuid();
      callbacks[callbackId] = callback;
    }

    // object to send
    var message = {
      name: name,
      data: data,
      callbackId: callbackId
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

    if (hasProp(message.data, 'callbackID') && message.data.callbackID) {
      callbacks[message.callbackID](message.data);
      delete callbacks[message.callbackID];
      return;
    }

    if (eventHandler && hasProp(message, 'socketEvent')) {
      eventHandler(message.socketEvent);
    }

  };

})();
