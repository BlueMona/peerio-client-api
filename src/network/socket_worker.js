/**
 * Web Worker handling the actual web socket communication.
 * This architectural decision was made to minimize the impact
 * of potential performance bottleneck and UI thread blocking.
 *
 * IMPORTANT: socket client should be initialized before using,
 *            see documentation for onmessage handler below.
 *
 * todo: Ideally this should be decoupled further,
 *       moving out socket handling code to separate file,
 *       that can be imported in a web worker wrapper or be used in UI thread as usual.
 *       We can do that when there are enough reasons for that,
 *       for now the only reason is the testability of smaller components,
 *       but we will not benefit from it, because API to test is extremely small
 *       and it will be covered by networking tests anyway.
 */

(function () {
  'use strict';

  // First message from UI thread should contain configuration data to initialise worker.
  // All the following messages will be considered data to send through socket.
  self.onmessage = function (payload) {
    initialize(payload.data);
    // replacing init handler with the one that will send data through socket
    self.onmessage = messageHandler;
  };

  // Config object:
  // {
  //   socketIOPath: string - absolute path to socket.io client script,
  //   server: string - peerio server url
  // }
  function initialize(cfg) {
    // importing socket.io client script
    importScripts(cfg.socketIOPath);
    // creating socket.io client instance
    self.peerioSocket = io.connect(cfg.server, {transports: ['websocket']});
    // socket events should be passed to UI thread
    ['receivedContactRequestsAvailable',
      'modifiedMessagesAvailable',
      'uploadedFilesAvailable',
      'modifiedConversationsAvailable',
      'newContactsAvailable',
      'sentContactRequestsAvailable',
      'contactsAvailable',
      'connect_error',
      'reconnecting',
      'reconnect'
    ].forEach(function (eventName) {
        self.peerioSocket.on(eventName, self.postMessage.bind(self, {socketEvent: eventName}));
      });
  }

  // sends data from UI thread through socket
  function messageHandler(payload) {
    var message = payload.data;

    self.peerioSocket.emit(message.name, message.data, function (response) {
      self.postMessage({
        callbackID: message.callbackID,
        data: response
      });
    });
  }

})();