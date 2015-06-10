/**
 * Web Worker handling the actual web socket communication.
 * This architectural decision was made to minimize the impact
 * of potential performance bottleneck and UI thread blocking.
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

  // protect from accidental running in UI thread instead of web worker.
  // this also helps to make unit tests configuration easier
  if(self.document !== undefined) return;

  // todo path should be injected to work from the actual app using this api
  importScripts('/bower_components/socket.io-client/socket.io.js');

  var server = 'https://app.peerio.com:443';
  //var server = 'https://marcyhome.peerio.com:443';

  // creating socket.io client instance
  self.peerioSocket = io.connect(server, {transports: ['websocket']});

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

  // message from UI thread means we need to send it though socket
  self.onmessage = function (payload) {
    var message = payload.data;

    self.peerioSocket.emit(message.name, message.content, function (data) {
      self.postMessage({
        callbackID: message.callbackID,
        data: data
      });
    });

  };

})();