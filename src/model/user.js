/**
 * Peerio User object
 *
 *  todo: not sure if it is really needed, current idea is to put some validations and other simple user-related logic in here
 */

var Peerio = this.Peerio || {};
Peerio.Model = Peerio.Model || {};

(function () {
  'use strict';

  /**
   * Creates User object asynchronously populating it will keys.
   * Executes callback when User object
   * @param username
   * @param passphrase
   * @param callback
   * @constructor
   */
  var u = Peerio.Model.User = function (username, passphrase) {
    this.username = username;
    this.passphrase = passphrase;
    this.isMe = !!passphrase;

    if (this.isMe) {
      this.contacts = {};
      this.keyPair = {};
    }
  };

  /**
   * Generates keyPair and publicKeyString and fills corresponding properties
   * @promise {Peerio.Model.User}- resolved with self when ready
   */
  u.prototype.generateKeys = function () {
    var self = this;
    return Peerio.Crypto.getKeyPair(self.username, self.passphrase)
      .then(function (keys) {
        self.keyPair = keys;
        return Peerio.Crypto.getPublicKeyString(keys.publicKey);
      })
      .then(function (publicKey) {
        self.publicKey = publicKey;
      });
  };

})();