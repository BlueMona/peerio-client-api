/**
 * Tiny permanent storage abstraction/wrapper.
 * Use it for storing small (few megabytes) data only.
 */

var Peerio = this.Peerio || {};
Peerio.TinyDB = {};

Peerio.TinyDB.init = function () {
  'use strict';

  var api = Peerio.TinyDB = {};
  // currently, localStorage is fine for all platforms
  var db = window.localStorage;

  /**
   * Saves scalar value to storage.
   * @param {string} key - unique key. Existing value with the same key will be overwritten.
   * @param {string|number|boolean|null} value - should have toString() function, because storage accepts only strings.
   */
  api.setVar = function (key, value) {
    db.setItem(key, value.toString());
  };

  /**
   * Saves object or array to storage.
   * @param {string} key - unique key. Existing value with the same key will be overwritten.
   * @param {object|Array} value - Will be serialized with JSON.stringify(), because storage accepts only strings.
   */
  api.setObject = function (key, value) {
    db.setItem(key, JSON.stringify(value));
  };

  /**
   * Removes item from storage
   * @param {string} key
   */
  api.removeItem = localStorage.removeItem;

  /**
   * Removes all items from storage
   */
  api.clearStorage = localStorage.clear;

  /**
   * Retrieves value as string
   * @params {string} key - unique key
   * @returns {string|null} value
   */
  api.getString = function (key) {
    return db.getItem(key);
  };

  /**
   * Retrieves value as number
   * @params {string} key - unique key
   * @returns {number|null} value
   */
  api.getNumber = function (key) {
    var val = db.getItem(key);
    return val == null ? null : +val;
  };

  /**
   * Retrieves value as boolean
   * @params {string} key - unique key
   * @returns {boolean|null} value
   */
  api.getBool = function (key) {
    var val = db.getItem(key);
    return val == null ? null : val === 'true';
  };

  /**
   * Retrieves value as parsed object using JSON.parse()
   * @params {string} key - unique key
   * @returns {object|null} value
   */
  api.getObject = function (key) {
    var val = db.getItem(key);
    return val == null ? null : JSON.parse(val);
  };



};