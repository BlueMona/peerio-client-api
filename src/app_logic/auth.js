/**
 * Peerio App Logic: Auth & Registration
 */


var Peerio = this.Peerio || {};
Peerio.Auth = {};

Peerio.Auth.init = function () {
  'use strict';

  var api = Peerio.Auth;
  delete Peerio.Auth.init;
  var net = Peerio.Net;

  var lastLoginKey = 'lastLogin';

  // Peerio.Net is a low-level service and it does not know about event system, so we bridge events.
  net.addEventListener(net.EVENTS.onConnect, Peerio.Action.socketConnect);
  net.addEventListener(net.EVENTS.onDisconnect, Peerio.Action.socketDisconnect);
  // this events will be fired on automatic re-login attempts only
  net.addEventListener(net.EVENTS.onAuthenticated, Peerio.Action.loginSuccess);
  net.addEventListener(net.EVENTS.onAuthFail, Peerio.Action.loginFail);

  /**
   * Initiates session authentication
   * @param username
   * @param passphraseOrPIN
   * @promise
   */
  api.login = function (username, passphraseOrPIN) {
    var isPinSet = false;
    return Peerio.TinyDB.getObject(username+'PIN')
      .then(function (encrypted) {
        if (encrypted) {
          isPinSet = true;
          return getPassphraseFromPIN(username, passphraseOrPIN, encrypted);
        }
        return passphraseOrPIN;
      })
      .then(function (passphrase) {
        Peerio.user = new Peerio.Model.User(username, passphrase || passphraseOrPIN);
        Peerio.user.isPINSet = isPinSet;
        return Peerio.user.generateKeys();
      })
      .then(function () {
        return net.login(Peerio.user);
      })
      .then(function (user) {
        Peerio.Crypto.setDefaultUserData(user.username, user.keyPair, user.publicKey);
        return net.getSettings();
      })
      .then(function (settings) {
        var u = Peerio.user;
        u.settings = settings;
        u.firstName = settings.firstName;
        u.lastName = settings.lastName;
        return Peerio.Contacts.updateContacts();
      });
  };

  /**
   * Retrieves saved login (last successful one)
   * @promise {null|{username, firstName}}
   */
  api.getSavedLogin = function () {
    return Peerio.TinyDB.getObject(lastLoginKey);
  };

  /**
   * Saves last logged in user details for future login
   * @param username
   * @param firstName
   * @returns nothing
   */
  api.saveLogin = function (username, firstName) {
    if (!firstName) firstName = username;
    Peerio.TinyDB.setObject(lastLoginKey, {username: username, firstName: firstName})
      .catch(function (e) {
        alert('Failed to remember username. Error:' + e);
      });
  };

  /**
   * Removes saved login info
   */
  api.clearSavedLogin = function () {
    Peerio.TinyDB.removeItem(lastLoginKey);
  };

  api.setPIN = function (PIN, username, passphrase) {
    return Peerio.Crypto.getKeyFromPIN(PIN, username)
      .then(function (PINkey) {
        return Peerio.Crypto.secretBoxEncrypt(passphrase, PINkey);
      }).then(function (encrypted) {
        encrypted.ciphertext = nacl.util.encodeBase64(encrypted.ciphertext);
        encrypted.nonce = nacl.util.encodeBase64(encrypted.nonce);
        return Peerio.TinyDB.setObject(username + 'PIN', encrypted);
      }).then(function(){
        Peerio.user.isPINSet = true;
      });
  };

  api.removePIN = function () {
    Peerio.TinyDB.removeItem(Peerio.user.username + 'PIN');
    Peerio.user.isPINSet = false;
  };

  function getPassphraseFromPIN(username, PIN, encryptedPassphrase) {
    return Peerio.Crypto.getKeyFromPIN(PIN, username)
      .then(function (PINkey) {
        return Peerio.Crypto.secretBoxDecrypt(nacl.util.decodeBase64(encryptedPassphrase.ciphertext),
          nacl.util.decodeBase64(encryptedPassphrase.nonce), PINkey);
      }).catch(function () {
        return Promise.resolve(null);
      });
  }

  api.signup = function (username, passphrase, firstName, lastName) {
    var keys;
    return Peerio.Crypto.getKeyPair(username, passphrase)
      .then(function (keyPair) {
        keys = keyPair;
        return Peerio.Crypto.getPublicKeyString(keyPair.publicKey);
      })
      .then(function (publicKeyString) {
        var info = new Peerio.Model.AccountInfo(username, firstName, lastName, publicKeyString, 'en');
        return net.registerAccount(info);
      })
      .then(function (creationToken) {
        return Peerio.Crypto.decryptAccountCreationToken(creationToken, username, keys);
      })
      .then(function (decryptedToken) {
        return net.activateAccount(decryptedToken);
      });
  };
};