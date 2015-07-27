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
  var workers = []; // todo: maybe add a limit
  // pending promises callbacks
  // id: {resolve: resolve callback, reject: reject callback}
  var callbacks = {};
  var workerCount = Math.min(Peerio.Config.cpuCount, 4);
  // creating worker instances
  for (var i = 0; i < workerCount; i++) {
    workers[i] = new Worker(Peerio.Config.apiFolder + 'crypto_worker_bundle.js');
    // handling a message from worker
    workers[i].onmessage = function (message) {
      var data = message.data;
      var promise = callbacks[data.id];

      if (hasProp(data, 'error'))
        promise.reject(data.error);
      else
        promise.resolve(data.result);

      delete callbacks[data.id];
    };
  }
  var lastWorkerIndex = -1;
  // returns new worker instance in cycle
  function getWorker() {
    if (++lastWorkerIndex === workers.length)
      lastWorkerIndex = 0;
    return workers[lastWorkerIndex];
  }

  // this two methods should execute on all workers
  // they don't expect a response from worker
  [
    'setDefaultUserData',
    'setDefaultContacts'
  ].forEach(function (fnName) {
      Peerio.Crypto[fnName] = function () {
        var args = [];
        for (var a = 0; a < arguments.length; a++)
          args[a] = arguments[a];

        for (var w = 0; w < workers.length; w++)
          workers[w].postMessage({fnName: fnName, args: args});
      };
    });

  // this methods will execute on one of the workers,
  // each of them expect response from worker
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
        getWorker().postMessage({id: id, fnName: fnName, args: args});
        return ret;
      };
    });

};
