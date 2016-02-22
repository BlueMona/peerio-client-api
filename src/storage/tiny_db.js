/**
 *  Permanent key-value storage abstraction/wrapper.
 */

var Peerio = this.Peerio || {};
Peerio.TinyDB = {};

(function () {
    'use strict';

    var api = Peerio.TinyDB;
    /**
     * Saves any value to storage.
     * Value will be serialized to json string
     * @param {string} key - unique key. Existing value with the same key will be overwritten.
     * @param {Object|string|number|boolean|null} value
     * @param {string} [keyPrefix] - for scoped values specify this argument and it will be automatically added to the key
     * @param {Uint8Array} [encryptionKey] - if specified, will be used to encrypt saved value
     * @promise
     */
    api.saveItem = function (key, value, keyPrefix, encryptionKey) {
        key = getKey(key, keyPrefix);
        value = Peerio.SqlQueries.serializeObject(value);

        if (!encryptionKey) return Peerio.SqlQueries.setSystemValue(key, value);

        return Peerio.Crypto.secretBoxEncrypt(value, encryptionKey)
            .then(encrypted => Peerio.SqlQueries.setSystemValue(key, JSON.stringify(encrypted)));
    };

    /**
     * Removes item from storage
     * @param {string} key
     * @param {string} [keyPrefix] - for scoped values specify this argument and it will be automatically added to the key
     * @promise
     */
    api.removeItem = function (key, keyPrefix) {
        return Peerio.SqlQueries.removeSystemValue(getKey(key, keyPrefix));
    };

    /**
     * Retrieves value by key.
     * Value will be JSON parsed before returning.
     * @params {string} key - unique key
     * @param {string} [keyPrefix] - for scoped values specify this argument and it will be automatically added to the key
     * @param {Uint8Array} [decryptionKey] - if specified, will be used to decrypt saved value
     * @promise {Object|string|number|boolean|null} value
     */
    api.getItem = function (key, keyPrefix, decryptionKey) {
        return Peerio.SqlQueries.getSystemValue(getKey(key, keyPrefix))
            .then(value => {
                value = JSON.parse(value);
                if (!decryptionKey) return value;
                return Peerio.Crypto.secretBoxDecrypt(value.ciphertext, value.nonce, decryptionKey)
                    .then(decrypted => JSON.parse(decrypted));
            });
    };

    function getKey(key, prefix) {
        return is.string(prefix) && prefix !== '' ? (prefix + '_' + key) : key;
    }

})();
