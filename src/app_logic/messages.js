/**
 * Peerio App logic: messages
 */

var Peerio = this.Peerio || {};
Peerio.Messages = {};

Peerio.Messages.init = function () {
  'use strict';

  var api = Peerio.Messages = {};
  var net = Peerio.Net;

  var conversationsCache = null;

  api.getAllConversations = function () {
    if (conversationsCache)
      return Promise.resolve(conversationsCache);

    return net.getAllConversations()
      .then(function (response) {
        return decryptConversations(response.conversations);
      })
      .then(function (decryptedConversations) {
        conversationsCache = decryptedConversations;
        return conversationsCache;
      });
  };

  function decryptConversations(conversations) {
    var start = Date.now();
    var decryptedConversations = {data: [], index: {}};
    var keys = Object.keys(conversations);

    return Promise.map(keys, function (convId) {
        //console.log(convId);
        var conv = conversations[convId];

        if (!conv.original || !conv.messages[conv.original]) {
          decryptedConversations.index[convId] = conv;
          decryptedConversations.data.push(conv);
          conv.messages = [];
          return;
        }

        var encMessage = conv.messages[conv.original];

        return decryptMessage(encMessage)
          .then(function (message) {
            conv.messages = [];
            conv.messages[0] = message;
            decryptedConversations.index[convId] = conv;
            decryptedConversations.data.push(conv);
          });
      },
      {
        concurrency: Peerio.Crypto.wokerInstanceCount * 2
      }
    ).then(function () {
        decryptedConversations.data.sort(function (a, b) {
          return a.lastTimestamp > b.lastTimestamp ? -1 : (a.lastTimestamp < b.lastTimestamp ? 1 : 0);
        });
        console.log((Date.now() - start) / 1000);
        return decryptedConversations;
      });
  }

  function decryptMessage(encMessage) {
    return Peerio.Crypto.decryptMessage(encMessage)
      .then(function (message) {
        delete message.ack;
        message.id = encMessage.id;
        message.sender = encMessage.sender;
        message.timestamp = encMessage.timestamp;
        message.isModified = encMessage.isModified;
        return message;
      });
  }

};