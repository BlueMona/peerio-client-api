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
    var lastPing = null;
    var intervalId = null;
    // creating socket.io client instance
    self.peerioSocket = io.connect(cfg.webSocketServer, {transports: ['websocket']});
    // socket events should be passed to UI thread

    // socket.io events
    // 'connect' is fired on every connection (including reconnection)
    self.peerioSocket.on('connect', function () {
      console.log('socket.io connect event');
      self.postMessage({socketEvent: 'connect'});
      startPingChecks();
    });

    // 'disconnect' is fired on every disconnection
    self.peerioSocket.on('disconnect', function (reason) {
      console.log('socket.io disconnect event. reason: ', reason);
      self.postMessage({socketEvent: 'disconnect'});
      stopPingChecks();
    });

    self.peerioSocket.on('userPing', function () {
      self.setLastPing();
    });

    // BROKEN CONNECTION DETECTION SYSTEM
    // Every time client receives a message, it saves the timestamp.
    // Interval function checks if last message was received more then pingTimeout milliseconds ago and restarts connection.
    // Server sends ping messages every 5 seconds to make this work in case of no meaningful messages are sent for some time

    // saves timestamp of last received ping
    self.setLastPing = function () {
      lastPing = Date.now();
    };

    // starts timeout checking interval
    function startPingChecks() {
      if (cfg.pingTimeout === 0) return;
      stopPingChecks();
      intervalId = setInterval(checkPings, Math.ceil(cfg.pingTimeout / 2));
    }

    // stops timeout checking interval interval
    function stopPingChecks() {
      if (intervalId != null)
        clearInterval(intervalId);

      intervalId = null;
      lastPing = null;
    }

    // detects timeout and resets connection
    function checkPings() {
      if (!lastPing) return;
      var timePassed = Date.now() - lastPing;
      if (timePassed > cfg.pingTimeout) {
        console.log('Heartbeat service detected broken connection.', Math.round(timePassed / 1000), 'seconds without a ping.');
        resetConnection();
      }
    }

    // resets (restarts) connection
    function resetConnection() {
      self.peerioSocket.disconnect();
      // Timeout 'just in case' :) Noticed a few times socket.io duplicating connections
      setTimeout(function () {
        self.peerioSocket.connect();
      }, 1000);
    }

    // we don't need this events atm:

    // 'reconnect' is fired on every reconnection
    // self.peerioSocket.on('reconnect', function (attempt) {
    //  console.log('socket.io reconnect event. attempt: ', attempt);
    //  self.postMessage({socketEvent: 'reconnect'});
    // });
    // 'reconnecting' is fired every time after connection is broken and reconnect is attempted
    // self.peerioSocket.on('reconnecting', function (attempt) {
    //   console.log('socket.io reconnecting event. attempt: ', attempt);
    //  self.postMessage({socketEvent: 'reconnecting'});
    // });
    // 'connect_error' is fired in case of an error during connection attempt
    // self.peerioSocket.on('connect_error', function (error) {
    //  console.log('socket.io reconnect event. err: ', error);
    //  // todo: automatic clone of error object fails, need to clone it manually
    //  self.postMessage({socketEvent: 'connect_error'});
    // });

    // peerio events
    ['receivedContactRequestsAvailable',
      'modifiedMessagesAvailable',
      'uploadedFilesAvailable',
      'modifiedConversationsAvailable',
      'newContactsAvailable',
      'sentContactRequestsAvailable',
      'contactsAvailable'
    ].forEach(function (eventName) {
        self.setLastPing();
        self.peerioSocket.on(eventName, self.postMessage.bind(self, {socketEvent: eventName}));
      });
  }

  // this function receives data from UI thread and sends it through socket
  function messageHandler(payload) {
    var message = payload.data;

    if (message.name === 'reconnectSocket') {
      console.log('Application logic requested connection reset.');
      resetConnection();
      return;
    }

    self.peerioSocket.emit(message.name, message.data, function (response) {
      self.setLastPing();
      self.postMessage({
        callbackID: message.callbackID,
        data: response
      });
    });
  }

})();