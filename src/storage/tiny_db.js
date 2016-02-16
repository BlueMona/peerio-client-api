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
     * @promise
     */
    api.saveItem = function (key, value, keyPrefix) {
        return Peerio.SqlQueries.setSystemValue(getKey(key, keyPrefix), value);
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
     * @promise {Object|string|number|boolean|null} value
     */
    api.getItem = function (key, keyPrefix) {
        return Peerio.SqlQueries.getSystemValue(getKey(key, keyPrefix));
    };

    function getKey(key, prefix) {
        return is.string(prefix) && prefix !=='' ? (prefix + '_' + key) : key;
    }

})();
