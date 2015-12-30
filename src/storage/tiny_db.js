/**
 * Tiny key-value permanent storage abstraction/wrapper.
 * Use it for storing small (few megabytes) data only.
 * All values are encrypted with device-specific key.
 */

var Peerio = this.Peerio || {};
Peerio.TinyDB = {};

// todo: change to module pattern, remove 'init'
Peerio.TinyDB.init = function () {
    'use strict';

    var api = Peerio.TinyDB = {};

    var db = {
        setItem: (key, value) => Peerio.SqlQueries.setSystemValue(key, value),
        getItem: (key) => Peerio.SqlQueries.getSystemValue(key),
        removeItem: (key) => Peerio.SqlQueries.removeSystemValue(key)
    };

    var keySize = 32;

    var secretKey = function () {
        var strKey = '';

        while (strKey.length < keySize)
            strKey += Peerio.Config.lowImportanceDeviceKey;

        var ret = nacl.util.decodeUTF8(strKey);

        return ret.subarray(0, keySize);
    }();

    function encrypt(str) {
        return Promise.resolve(str);
        /* not encrypting because we have sqlcipher now
        return Peerio.Crypto.secretBoxEncrypt(str, secretKey)
            .then(function (decInfo) {
                decInfo.ciphertext = nacl.util.encodeBase64(decInfo.ciphertext);
                decInfo.nonce = nacl.util.encodeBase64(decInfo.nonce);
                return JSON.stringify(decInfo);
            }); */
    }

    function decrypt(str) {
        return Promise.resolve(str);
        /* not encrypting because we have sqlcipher now
        if (str === null) return Promise.resolve(null);
        try {
            var decInfo = JSON.parse(str);
        } catch (ex) {
            L.error('TinyDB: failed to decode. ', str);
            Promise.reject();
        }
        decInfo.ciphertext = nacl.util.decodeBase64(decInfo.ciphertext);
        decInfo.nonce = nacl.util.decodeBase64(decInfo.nonce);

        return Peerio.Crypto.secretBoxDecrypt(decInfo.ciphertext, decInfo.nonce, secretKey); */
    }

    /**
     * Saves scalar value to storage.
     * @param {string} key - unique key. Existing value with the same key will be overwritten.
     * @param {string|number|boolean|null} value - should have toString() function, because storage accepts only strings.
     * @promise
     */
    api.setVar = function (key, value) {
        return encrypt(value.toString())
            .then(function (encryptedStr) {
                db.setItem(key, encryptedStr);
                return true;
            });
    };

    /**
     * Saves object or array to storage.
     * @param {string} key - unique key. Existing value with the same key will be overwritten.
     * @param {object|Array} value - Will be serialized with JSON.stringify(), because storage accepts only strings.
     * @promise
     */
    api.setObject = function (key, value) {
        return encrypt(JSON.stringify(value))
            .then(function (encryptedStr) {
                db.setItem(key, encryptedStr);
                return true;
            });
    };

    /**
     * Removes item from storage
     * @param {string} key
     */
    api.removeItem = db.removeItem.bind(db);

    /**
     * Retrieves value as string
     * @params {string} key - unique key
     * @promise {string|null} value
     */
    api.getString = function (key) {
        return decrypt(db.getItem(key));
    };

    /**
     * Retrieves value as number
     * @params {string} key - unique key
     * @promise {number|null} value
     */
    api.getNumber = function (key) {
        return api.getString(key)
            .then(function (val) {
                return val == null ? null : +val;
            });
    };

    /**
     * Retrieves value as boolean
     * @params {string} key - unique key
     * @promise {boolean|null} value
     */
    api.getBool = function (key) {
        return api.getString(key)
            .then(function (val) {
                return val == null ? null : val === 'true';
            });
    };

    /**
     * Retrieves value as parsed object using JSON.parse()
     * @params {string} key - unique key
     * @promise {object|null} value
     */
    api.getObject = function (key) {
        return api.getString(key);
    };

};
