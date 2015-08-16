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

  api.getAllConversationsGradually = function (progress) {
    if (conversationsCache)
      return Promise.resolve(conversationsCache);

    return net.getConversationIDs()
      .then(function (response) {
        var ids = response.conversationID;
        var pages = [];
        for (var i = 0; i < ids.length; i++) {
          var request = [];
          for (var j = 0; j < 10 && i < ids.length; j++, i++) {
            request.push({id: ids[i], page:'none'});
          }
          pages.push(request);
        }

        return Promise.each(pages, function(page){
          return net.getConversationPages(page)
            .then(function(response){
              return decryptConversations(response.conversations);
            })
            .then(mergeWithCache)
            .then(function(){
              progress(conversationsCache);
            });
        });
      });
  };

  function mergeWithCache(conversations){
    //todo dupe check
    conversationsCache = conversationsCache || {data:[], index: {}};
    Array.prototype.push.apply(conversationsCache.data, conversations.data);
    _.assign(conversationsCache.index, conversations.index);
  }
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
            conv.original = message;
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