// Peerio AccountInfo object

var Peerio = this.Peerio || {};
Peerio.Model = Peerio.Model || {};

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
  Peerio.Model.AccountInfo = function (username, firstName, lastName, publicKey, localeCode) {

    this.username = username;
    this.firstName = firstName;
    this.lastName = lastName;
    this.publicKeyString = publicKey;
    this.localeCode = localeCode || 'en';
  };

})();