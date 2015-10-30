// Peerio AccountInfo object

var Peerio = this.Peerio || {};

(function () {
  'use strict';

  /**
   * @param username
   * @param firstName
   * @param lastName
   * @param publicKey - base58 string
   * @param localeCode
   * @constructor
   */
  Peerio.AccountInfo = function (username, firstName, lastName, publicKey, localeCode) {
    this.username = username;
    this.firstName = firstName;
    this.lastName = lastName;
    this.publicKeyString = publicKey;
    this.localeCode = localeCode || 'en';
  };

})();