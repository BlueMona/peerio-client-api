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
    return new Promise(function (resolve) {
      // todo PIN
      var passphrase = passphraseOrPIN;
      Peerio.user = new Peerio.Model.User(username, passphrase);
      resolve();
    })
      .then(function(){
        return Peerio.user.generateKeys();
      })
      .then(function () {
        return net.login(Peerio.user);
      })
      .then(function (user) {
        Peerio.Crypto.setDefaultUserData(user.username, user.keyPair, user.publicKey);
        return net.getSettings();
      })
      .then(function(settings){
        var u = Peerio.user;
        u.settings = settings;
        u.firstName = settings.firstName;
        u.lastName = settings.lastName;
        return Peerio.Contacts.updateContacts();
      });
  };

  function buildFullName(user){
   return ((user.firstName||'') +' ' + (user.lastName||'')).trim();
  }
  function buildFullNameAndUsername(user){
    return (user.fullName + ' ('+user.username+')').trim();
  }

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

  api.signup = function (username, passphrase) {
    var keys;
    return Peerio.Crypto.getKeyPair(username, passphrase)
      .then(function (keyPair) {
        keys = keyPair;
        return Peerio.Crypto.getPublicKeyString(keyPair.publicKey);
      })
      .then(function (publicKeyString) {
        var info = new Peerio.Model.AccountInfo(username, username, username, publicKeyString, 'en');
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