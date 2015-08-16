/**
 * Worker script that imports crypto library and provides interface to it to UI thread
 */


(function () {
  'use strict';

  Peerio.Crypto.init();

  // service functions are there for performance reasons and they don't provide response
  var serviceFunctions = ['setDefaultUserData', 'setDefaultContacts'];

  // if getRandomValues polyfill will be needed, here we will stock our random bytes received from UI thread
  var randomBytesStock = [];

  // expects message in following format:
  // {
  //   id:      unique message id. Will be sent back as is
  //   fnName:  crypto function name
  //   args:    arguments to pass to crypto function
  // }
  //
  // response is sent in following format:
  // {
  //   id:       the one from original request
  //   response: whatever crypto function returns
  //   error:    in case of error only
  // }
  self.onmessage = function (payload) {
    var message = payload.data;

    if (message.randomBytes) {
      console.log(message.randomBytes.length, 'random bytes received');
      var newArray = Array.prototype.slice.call(new Uint8Array(message.randomBytes));
      Array.prototype.push.apply(randomBytesStock, newArray);
      console.log(randomBytesStock.length,'randombytes now in stock');
      return;
    }

    if (serviceFunctions.indexOf(message.fnName) >= 0) {
      Peerio.Crypto[message.fnName].apply(Peerio.Crypto, message.args);
      return;
    }

    var response = {id: message.id};

    try {

      Peerio.Crypto[message.fnName].apply(Peerio.Crypto, message.args)
        .then(function (result) {
          response.result = result;
        })
        .catch(function (err) {
          response.error = (err && err.toString()) || 'Unknown error';
        })
        .finally(function () {
          self.postMessage(response);
        });

    } catch (e) {
      // warning, don't try to postMessage(e), error object can't be cloned automatically
      response.error = (e && e.toString()) || 'Unknown error';
      self.postMessage(response);
    }
  };

  var randomBytesNeeded = !self.crypto;
  if (randomBytesNeeded) {
    var nativePostFn = self.postMessage;
    // overriding postMessage to attach stock report
    self.postMessage = function (message) {
      message.randomBytesStock = randomBytesStock.length;
      nativePostFn(message);
    };

    // getRandomValues partial polyfill
    self.cryptoShim.getRandomValues = function (arr) {
      console.log(arr.length, 'random bytes requested', randomBytesStock.length, 'is in stock');
      if (arr.length > randomBytesStock.length) throw 'Not enough random bytes in polyfill stock.';

      for (var i = 0; i < arr.length; i++)
        arr[i] = randomBytesStock[i];

      randomBytesStock.splice(0, arr.length);
      return arr;
    };
  }

  // informing UI thread on getRandomValues situation
  self.postMessage({provideRandomBytes: randomBytesNeeded});

})();