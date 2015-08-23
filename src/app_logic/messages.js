/**
 * Peerio App Logic: messages
 */

var Peerio = this.Peerio || {};
Peerio.Messages = {};

Peerio.Messages.init = function () {
  'use strict';

  var api = Peerio.Messages = {};
  var net = Peerio.Net;

  // Array, but contains same objects accessible both by index and by id
  api.cache = null;

  var getAllConversationsPromise = null;
  /**
   * Loads conversations list with 1 original message in each of them.
   * Loads and decrypts page by page, adds each page to the cache.
   * Calls progress callback for every page, passing entire cache array to it.
   * Resolves once everything is loaded and decrypted.
   * @promise
   * todo: resume support in case of disconnection/error in progress
   */
  api.getAllConversations = function (progress) {
    if (getAllConversationsPromise) return getAllConversationsPromise;

    if (api.cache) return Promise.resolve(api.cache);

    api.cache = [];
    // temporary paging based on what getConversationIDs returns
    return getAllConversationsPromise = net.getConversationIDs()
      .then(function (response) {
        // building array with arrays of requests to pull conversation with 1 message
        var ids = response.conversationID;
        var pages = [];
        for (var i = 0; i < ids.length; i++) {
          var request = [];
          for (var j = 0; j < 10 && i < ids.length; j++, i++) {
            request.push({id: ids[i], page: '-1'});
          }
          pages.push(request);
        }
        return pages;
      })
      .then(function (pages) {
        // Promise.each executes next function call after previous promise is resolved
        return Promise.each(pages, function (page) {
          return net.getConversationPages(page)
            .then(function (response) {
              return decryptConversations(response.conversations);
            })
            .then(addConversationsToCache)
            .then(function () {
              progress(api.cache);
            });
        });
      })
      .then(function () {
        getAllConversationsPromise = null;
      })
      .return(api.cache);

    return getAllConversationsPromise;
  };

  // todo
  api.loadAllConversationMessages = function (conversationId) {
    var conversation = api.cache[conversationId];
    if (conversation._pendingLoadPromise) return conversation._pendingLoadPromise;

    return conversation._pendingLoadPromise = Peerio.Net.getConversationPages([{id: conversationId, page: '0'}])
      .then(function (response) {
        return decryptMessages(response.conversations[conversationId].messages);
      })
      .then(function (messages) {
        addMessagesToCache(conversation, messages);
        return conversation;
      });
  };

  /**
   * adds conversations to cache with duplicate checks
   * and re-sorts the cache array by lastTimestamp
   * @param conversations
   */
  function addConversationsToCache(conversations) {
    conversations.forEach(function (item) {
      if (api.cache[item.id]) return;
      api.cache.push(item);
      api.cache[item.id] = item;
    });

    api.cache.sort(function (a, b) {
      return a.lastTimestamp > b.lastTimestamp ? -1 : (a.lastTimestamp < b.lastTimestamp ? 1 : 0);
    });
  }

  function addMessagesToCache(conversation, messages) {
    var cachedMessages = conversation.messages;
    messages.forEach(function (item) {
      if (cachedMessages[item.id]) return;
      cachedMessages.push(item);
      cachedMessages[item.id] = item;
    });
    cachedMessages.sort(function (a, b) {
      return a.timestamp > b.timestamp ? -1 : (a.timestamp < b.timestamp ? 1 : 0);
    });
  }

  /**
   * Decrypts a list of conversations concurrently putting load on all available crypto workers.
   * It assumes there is only ONE message in conversation (original one).
   * @param {object} conversations - conversation objects list in {id: object} format
   * @returns {Promise<Array>} - array of decrypted conversation objects
   */
  function decryptConversations(conversations) {
    var decryptedConversations = [];
    var keys = Object.keys(conversations);

    // executes decryption with concurrency,
    // given the specific number of crypto workers running.
    // this makes sense because otherwise we have a chance to use too much resources on ui thread.
    return Promise.map(keys, function (convId) {
      var conv = conversations[convId];
      var encMessage = conv.messages[conv.original];
      // no original message in conversation?
      // not a normal case, but I think still exists somewhere in old conversations
      if (!encMessage) {
        console.log('Conversation misses original message', conv);
        return;
      }
      // both indexed and associative ways to store conversation
      decryptedConversations[convId] = conv;
      decryptedConversations.push(conv);
      // we will replace messages with decrypted ones
      conv.messages = [];
      conv.lastTimestamp = +conv.lastTimestamp;
      conv.lastMoment = moment(conv.lastTimestamp);

      return decryptMessage(encMessage)
        .then(function (message) {
          conv.messages.push(message);
          conv.messages[message.id] = message;
          conv.original = message;
        });
    }, Peerio.Crypto.recommendedPromiseConcurrency)
      .return(decryptedConversations);

  }

  function decryptMessages(messages) {
    var keys = Object.keys(messages);

    return Promise.map(keys, function (msgId) {
        return decryptMessage(messages[msgId]);
      }, Peerio.Crypto.recommendedPromiseConcurrency);
  }

  /**
   * decrypts single message and all data in it, including receipts
   * @promise resolves with decrypted message object
   */
  function decryptMessage(encMessage) {
    return Peerio.Crypto.decryptMessage(encMessage)
      .then(function (message) {
        delete message.ack;
        message.id = encMessage.id;
        message.sender = encMessage.sender;
        message.timestamp = +encMessage.timestamp;
        message.moment = moment(message.timestamp);
        message.isModified = encMessage.isModified;
        return message;
      });
  }

};