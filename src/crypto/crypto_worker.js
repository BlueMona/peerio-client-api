/**
 * Worker script that imports crypto library and provides interface to it to UI thread
 */


(function () {
    'use strict';

    // worker ID generation
    // 3 digits, collision is not critical and unlikely
    // this is diagnostic data, doesn't affect logic
    var letters = ['A', 'B', 'C', 'E', 'F', 'K', 'L', 'H', 'X', 'Z']; // just a random 10 letters to encode id for easier reading
    self.peerioWorkerId = letters[Math.trunc(Math.random() * 10)]
        + letters[Math.trunc(Math.random() * 10)]
        + letters[Math.trunc(Math.random() * 10)];
    L.switchToWorkerMode('W_CRPT_' + self.peerioWorkerId + ': ');

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

        // not a crypto function call)
        if (!message.fnName) {
            // random bytes
            if (message.randomBytes) {
                var bytes = new Uint8Array(message.randomBytes);
                L.info(bytes.length, 'random bytes received');
                var newArray = Array.prototype.slice.call(bytes);
                Array.prototype.push.apply(randomBytesStock, newArray);
                L.info(randomBytesStock.length, 'random bytes now in stock');
                return;
            }

            //L.js config
            if (message.ljsConfig) {
                L.setOptions(message.ljsConfig);
                return;
            }
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
            L.info('{0} random bytes requested, {1} in stock', arr.length, randomBytesStock.length);
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