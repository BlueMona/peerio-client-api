/**
 *  Crypto Hub
 *  ===========================================
 *  Provides access to N crypto worker instances, allowing to parallelise crypto operations.
 *  Crypto Hub functions use the same namespace and signatures
 *  as original Peerio.Crypto library does.
 *  This allows us to replace worker with regular UI-thread Peerio.Crypto library in no time.
 *
 */

var Peerio = this.Peerio || {};
Peerio.Crypto = {};

Peerio.Crypto.init = function () {
  'use strict';

  Peerio.Crypto = {};
  // malicious server safe hasOwnProperty function;
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);
  // web worker instance
  var worker;
  // pending promises callbacks
  // id: {resolve: resolve callback, reject: reject callback}
  var callbacks = {};

  // worker instance holding the actual web socket
  worker = new Worker(Peerio.Config.apiFolder + 'crypto_worker_bundle.js');
  // handling a message from worker
  worker.onmessage = function (message) {
    var data = message.data;
    var promise = callbacks[data.id];

    if (hasProp(data, 'error'))
      promise.reject(data.error);
    else
      promise.resolve(data.result);

    delete callbacks[data.id];
  };

  [
    'getKeyPair',
    'getPublicKeyString',
    'getPublicKeyBytes',
    'secretBoxEncrypt',
    'secretBoxDecrypt',
    'getKeyFromPIN',
    'decryptAccountCreationToken',
    'decryptAuthToken',
    'getAvatar',
    'encryptMessage',
    'encryptFile',
    'decryptMessage',
    'decryptFile',
    'decryptFileName'
  ].forEach(function (fnName) {
      Peerio.Crypto[fnName] = function () {
        var id = uuid();
        // we copy arguments object data into array, because that's what worker is expecting to use it with apply()
        // don't change this to Array.slice() because it will prevent runtime optimisation
        var args = [];
        for (var i = 0; i < arguments.length; i++)
          args[i] = arguments[i];

        var ret = new Promise(function (resolve, reject) {
          callbacks[id] = {
            resolve: resolve,
            reject: reject
          };
        });
        worker.postMessage({id: id, fnName: fnName, args: args});
        return ret;
      };
    });

};
