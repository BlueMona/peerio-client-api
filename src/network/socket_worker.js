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

  // cfg - Peerio.Config object
  function initialize(cfg) {
    // creating socket.io client instance
    self.peerioSocket = io.connect(cfg.webSocketServer, {transports: ['websocket']});
    // socket events should be passed to UI thread

    // socket.io events
    // 'connect' is fired on every connection (including reconnection)
    self.peerioSocket.on('connect', self.postMessage.bind(self, {socketEvent: 'connect'}));
    // 'reconnect' is fired on every reconnection
    self.peerioSocket.on('reconnect', function (attempt) {
      self.postMessage({socketEvent: 'reconnect'});
    });
    // 'reconnecting' is fired every time after connection is broken and reconnect is attempted
    self.peerioSocket.on('reconnecting', function (attempt) {
      self.postMessage({socketEvent: 'reconnecting'});
    });
    // 'connect_error' is fired in case of an error during connection attempt
    self.peerioSocket.on('connect_error', function (error) {
      // todo: automatic clone of error object fails, need to clone it manually
      self.postMessage({socketEvent: 'connect_error'});
    });

    // peerio events
    ['receivedContactRequestsAvailable',
      'modifiedMessagesAvailable',
      'uploadedFilesAvailable',
      'modifiedConversationsAvailable',
      'newContactsAvailable',
      'sentContactRequestsAvailable',
      'contactsAvailable'
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