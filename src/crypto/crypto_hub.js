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

    var self = this;
    Peerio.Crypto.init = undefined;

    // malicious server safe hasOwnProperty function;
    var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);
    var workerScriptPath = Peerio.Config.apiFolder + 'crypto_worker_bundle.js';
    // web worker instance
    var workers = [];
    // pending promises callbacks
    // id: {resolve: resolve callback, reject: reject callback}
    var callbacks = {};
    var workerCount = Peerio.Crypto.workerInstanceCount = Math.min(Peerio.Config.cpuCount, 4);

    // we use x2 concurrency so that workers always have one request in queue,
    // making execution as fast as possible
    Peerio.Crypto.recommendedConcurrency = {concurrency: Peerio.Crypto.workerInstanceCount * 2};

    // when started, workers will report if they need random values provided to them
    var provideRandomBytes = false;
    // when worker reports that he has less then this number of random bytes left - we post more data to it
    var randomBytesThreshold = 3000;

    // worker message handler
    function messageHandler(index, message) {
        var data = message.data;

        if (Peerio.Util.processWorkerLog(data)) return;

        if (provideRandomBytes) ensureRandomBytesStock(index, data.randomBytesStock);

        var promise = callbacks[data.id];
        if (!promise) return;

        if (hasProp(data, 'error'))
            promise.reject(data.error);
        else
            promise.resolve(data.result);

        delete callbacks[data.id];
    }

    // starts a single worker instance and adds in to workers array at specified index
    function startWorker(index) {
        var worker = workers[index] = new Worker(workerScriptPath);
        // first message will be a feature report from worker
        worker.onmessage = function (message) {
            if (Peerio.Util.processWorkerLog(message.data)) return;
            // all next messages are for different handler
            worker.onmessage = messageHandler.bind(self, index);

            if (provideRandomBytes = message.data.provideRandomBytes) {
                ensureRandomBytesStock(index, 0);
            }
        };
        worker.onerror = function (error) {
            console.log('crypto worker error:', error);
        };

    }

    // this function is supposed to be called from worker.onmessage when worker reports it's random bytes stock
    // to make sure it has enough
    function ensureRandomBytesStock(index, currentStock) {
        if (currentStock >= randomBytesThreshold) return;
        var data = crypto.getRandomValues(new Uint8Array(randomBytesThreshold));
        workers[index].postMessage({randomBytes: data.buffer}, [data.buffer]);
    }

    // creating worker instances
    for (var n = 0; n < workerCount; n++) {
        startWorker(n);
    }

    // worker round-robin tracker var
    var lastUsedWorkerIndex = -1;

    // returns new worker instance in cycle
    function getWorker() {
        if (++lastUsedWorkerIndex === workers.length)
            lastUsedWorkerIndex = 0;
        return workers[lastUsedWorkerIndex];
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
        'decryptMessage',
        'encryptFile',
        'decryptFile',
        'decryptFileName',
        'recreateHeader'
    ].forEach(function (fnName) {
        var transfer = null;
        // extra love for 'encrypt file' to transfer array buffer
        if (fnName === 'encryptFile') {
            transfer = 0; // argument index
        }
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
            getWorker().postMessage({id: id, fnName: fnName, args: args}, transfer === null ? null : [args[transfer]]);
            return ret;
        };
    });


};
