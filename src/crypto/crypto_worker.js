/**
 * Worker script that imports crypto library and provides interface to it to UI thread
 */


(function () {
  'use strict';

  Peerio.Crypto.init();

  // service functions are there for performance reasons and they don't provide response
  var serviceFunctions = ['setDefaultUserData', 'setDefaultContacts'];

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

})();