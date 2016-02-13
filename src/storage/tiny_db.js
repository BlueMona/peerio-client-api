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
     * @promise
     */
    api.saveItem = function (key, value) {
        return Peerio.SqlQueries.setSystemValue(key, value);
    };

    /**
     * Removes item from storage
     * @param {string} key
     */
    api.removeItem = function (key){
        return Peerio.SqlQueries.removeSystemValue(key);
    };

    /**
     * Retrieves value by key.
     * Value will be JSON parsed before returning.
     * @params {string} key - unique key
     * @promise {Object|string|number|boolean|null} value
     */
    api.getItem = function (key) {
        return Peerio.SqlQueries.getSystemValue(key);
    };

})();
