/**
 * Various Peerio utility functions
 */

var Peerio = this.Peerio || {};
Peerio.Util = {};

Peerio.Util.init = function () {
  'use strict';

  var api = Peerio.Util = {};

  /**
   *  malicious server safe hasOwnProperty function
   *  @param {object} object to test for property existence, can be null or undefined
   *  @param {string} property name
   */
  api.hasProp = Function.call.bind(Object.prototype.hasOwnProperty);

  var emailExp = new RegExp('^([-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\\.[a-zA-Z]{2,20})$');
  var phoneExp = new RegExp('^\\+?(\\d|\\s|\\-|\\(|\\)){6,20}$');

  /**
   * Parses an address and returns its type and parsed format.
   * In the case of phone numbers, the number is stripped from any non-digits.
   * @param {string} address - Address to parse.
   * @return {object} {type:'email||phone', address:'parsed address'}
   */
  api.parseAddress = function (address) {
    if (emailExp.test(address)) {
      return {
        type: 'email',
        value: address.match(emailExp)[0]
      };
    }

    if (phoneExp.test(address)) {
      var phone = address.match(phoneExp)[0].split('');

      for (var i = 0; i < phone.length; i++) {
        if (!phone[i].match(/\d/))
          phone.splice(i, 1);
      }

      return {
        type: 'phone',
        value: phone.join('')
      };
    }

    return false;
  };

  /**
   *  1. detects if message from worker contains 'console.log' property
   *  2. if it does, prints out value array
   *  @param {Object} data - object passed by worker
   *  @returns {boolean} true if it was a 'console.log' message
   */
  api.processWorkerConsoleLog = function (data) {
    if (!data.hasOwnProperty('console.log')) return false;
    var args = data['console.log'];
    args.unshift('WORKER:');
    console.log.apply(console, args);
    return true;
  };

  /**
   * get string hash from string
   * @param {string} text
   * @returns {string} hash in HEX format
   */
  api.sha256 = function (text) {
    var hash = new jsSHA('SHA-256', 'TEXT');
    hash.update(text);
    return hash.getHash('HEX');
  };

  api.sortAsc = function (arr, prop) {
    return arr.sort(function (a, b) {
      if (a[prop] > b[prop]) return 1;
      if (a[prop] < b[prop]) return -1;
      return 0;
    });
  };
  api.sortDesc = function (arr, prop) {
    return arr.sort(function (a, b) {
      if (a[prop] > b[prop]) return -1;
      if (a[prop] < b[prop]) return 1;
      return 0;
    });
  };

  /**
   * Extracts extension from file name
   * @param fileName
   * @returns {string} dot-less extension
   */
  api.getFileExtension = function (fileName) {
    var dotInd = fileName.lastIndexOf('.');
    return dotInd >= 0 ? fileName.substring(dotInd + 1) : '';
  };

  /**
   * Removes extension (including dot) from file name
   * @param fileName
   * @returns {string}
   */
  api.getFileName = function (fileName) {
    var dotInd = fileName.lastIndexOf('.');
    if (dotInd >= 0)fileName = fileName.substring(0, dotInd);
    var slashInd = fileName.lastIndexOf('/');
    var bslashInd = fileName.lastIndexOf("\\");
    slashInd = Math.max(slashInd, bslashInd);
    if (slashInd >= 0) fileName = fileName.substring(slashInd + 1);
    return fileName;
  };

  api.getFileNameAndExtension = function (path) {
    return api.getFileName(path) + '.' + api.getFileExtension(path);
  };
};