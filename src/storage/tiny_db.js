/**
 *  Permanent key-value storage abstraction/wrapper.
 */

var Peerio = this.Peerio || {};
Peerio.TinyDB = {};

(function () {
    'use strict';

    var api = Peerio.TinyDB;
    /**
     * Saves scalar value to storage.
     * @param {string} key - unique key. Existing value with the same key will be overwritten.
     * @param {string|number|boolean|null} value - should have toString() function
     * @promise
     */
    api.setVar = function (key, value) {
        return Peerio.SqlQueries.setSystemValue(key, value.toString());
    };

    /**
     * Saves object or array to storage.
     * @param {string} key - unique key. Existing value with the same key will be overwritten.
     * @param {object|Array} value - Will be serialized with JSON.stringify()
     * @promise
     */
    api.setObject = function (key, value) {
        return Peerio.SqlQueries.setSystemValue(key, JSON.stringify(value));
    };

    /**
     * Removes item from storage
     * @param {string} key
     */
    api.removeItem = function (key){
        return Peerio.SqlQueries.removeSystemValue(key);
    };

    /**
     * Retrieves value as string
     * @params {string} key - unique key
     * @promise {string|null} value
     */
    api.getString = function (key) {
        return Peerio.SqlQueries.getSystemValue(key);
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

})();
