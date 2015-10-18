/**
 * Peerio App Logic: Auth & Registration
 */


var Peerio = this.Peerio || {};
Peerio.Auth = {};

Peerio.Auth.init = function () {
  'use strict';

  L.verbose('Peerio.Auth.init() start');

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
    L.B.start('Peerio.Auth.login()', 'Login time');
    L.info('Peerio.Auth.login({0},...)', username);
    var isPinSet = false;
    L.info('Checking for PIN existence.');
    return Peerio.TinyDB.getObject(username + 'PIN')
      .then(function (encrypted) {
        if (encrypted) {
          L.info('PIN exists. Decrypting key with PIN.');
          isPinSet = true;
          return getPassphraseFromPIN(username, passphraseOrPIN, encrypted);
        }
        L.info('PIN does not exist.');
        return passphraseOrPIN;
      })
      .then(function (passphrase) {
        L.info('Creating User object.');
        Peerio.user = new Peerio.Model.User(username, passphrase || passphraseOrPIN);
        Peerio.user.isPINSet = isPinSet;
        L.info('Converting user data to key pair.');
        return Peerio.user.generateKeys();
      })
      .then(function () {
        L.info('Starting server authentication.');
        return net.login(Peerio.user);
      })
      .then(function (user) {
        L.info('Authenticated. Setting default user data for Crypto.');
        Peerio.Crypto.setDefaultUserData(user.username, user.keyPair, user.publicKey);
        L.info('Loading user settings from server');
        return net.getSettings();
      })
      .then(function (settings) {
        L.info('Settings received. Loading contacts from server.');
        var u = Peerio.user;
        u.settings = settings;
        u.firstName = settings.firstName;
        u.lastName = settings.lastName;
        return Peerio.Contacts.updateContacts();
      })
      .then(function () {
        L.info('Contacts received. Loading file list from server.');
        return Peerio.Files.getAllFiles();
      })
      .then(function () {
        L.info('Files loaded. Login done.');
        L.B.stop('Peerio.Auth.login()');
      })
      .catch(function (e) {
        L.error('Error during login. {0}', e);
        L.B.stop('Peerio.Auth.login()');
        return Promise.reject();
      });
  };

  /**
   * Retrieves saved login (last successful one)
   * @promise {null|{username, firstName}}
   */
  api.getSavedLogin = function () {
    L.info('Retrieving last logged in user data.');
    return Peerio.TinyDB.getObject(lastLoginKey)
      .then(function (data) {
        L.info('Last login data: {0}', data);
        return data;
      })
      .catch(function (e) {
        L.error('Error retrieving last login data: {0}', e);
      });
  };

  /**
   * Saves last logged in user details for future login
   * @param username
   * @param firstName
   * @returns nothing
   */
  api.saveLogin = function (username, firstName) {
    if (!firstName) firstName = username;
    var data = {username: username, firstName: firstName};
    L.info('Saving logged user info. {0}', data);
    Peerio.TinyDB.setObject(lastLoginKey, data)
      .then(function () {
        L.info('Logged user info saved.');
      })
      .catch(function (e) {
        L.error('Failed to save logged user info. Error: {0}', e);
        return Promise.reject();
      });
  };

  /**
   * Removes saved login info
   */
  api.clearSavedLogin = function () {
    L.info('Removing last logged user info');
    try {
      Peerio.TinyDB.removeItem(lastLoginKey);
    } catch (e) {
      L.error('Failed to remove logged user info. {e}', e);
    }
  };

  api.setPIN = function (PIN, username, passphrase) {
    L.info('Peerio.Auth.setPIN(...). Deriving key.');
    ;
    return Peerio.Crypto.getKeyFromPIN(PIN, username)
      .then(function (PINkey) {
        L.info('Encrypting passphrase.');
        return Peerio.Crypto.secretBoxEncrypt(passphrase, PINkey);
      })
      .then(function (encrypted) {
        L.info('Storing encrypted passphrase.');
        encrypted.ciphertext = nacl.util.encodeBase64(encrypted.ciphertext);
        encrypted.nonce = nacl.util.encodeBase64(encrypted.nonce);
        return Peerio.TinyDB.setObject(username + 'PIN', encrypted);
      })
      .then(function () {
        L.info('Pin is set.');
        Peerio.user.isPINSet = true;
      })
      .catch(function (e) {
        L.error('Error setting PIN. {0}', e);
        return Promise.reject();
      });
  };

  api.removePIN = function () {
    L.info('PeerioAuth.removePIN()');
    try {
      Peerio.TinyDB.removeItem(Peerio.user.username + 'PIN');
      Peerio.user.isPINSet = false;
      L.info('Pin removed');
    } catch (e) {
      L.error('Failed to remove PIN. {0}', e);
    }
  };

  function getPassphraseFromPIN(username, PIN, encryptedPassphrase) {
    L.info('Generating key from PIN and username');
    return Peerio.Crypto.getKeyFromPIN(PIN, username)
      .then(function (PINkey) {
        L.info('Decrypting passphrase');
        return Peerio.Crypto.secretBoxDecrypt(nacl.util.decodeBase64(encryptedPassphrase.ciphertext),
          nacl.util.decodeBase64(encryptedPassphrase.nonce), PINkey);
      })
      .then(function (p) {
        L.info('Passphrase decrypted.');
        return p;
      })
      .catch(function (e) {
        L.error('Failed to decrypt passphrase.', e);
        // reject is more correct, but it will complicate login promise chain a lot
        return Promise.resolve(null);
      });
  }

  api.signup = function (username, passphrase, firstName, lastName) {
    L.info('Peerio.Auth.signup(username:{0}, firstName:{1}, lastName:{2})', username, firstName, lastName);
    L.info('Generating keys');
    var keys;
    return Peerio.Crypto.getKeyPair(username, passphrase)
      .then(function (keyPair) {
        keys = keyPair;
        L.info('Generating public key string');
        return Peerio.Crypto.getPublicKeyString(keyPair.publicKey);
      })
      .then(function (publicKeyString) {
        var info = new Peerio.Model.AccountInfo(username, firstName, lastName, publicKeyString, 'en');
        L.info('Registering account with server. {0}', info);
        return net.registerAccount(info);
      })
      .then(function (creationToken) {
        L.info('Decrypting creation token: {0}', creationToken);
        return Peerio.Crypto.decryptAccountCreationToken(creationToken, username, keys);
      })
      .then(function (decryptedToken) {
        L.info('Activating account with decrypted token: {0}', decryptedToken);
        return net.activateAccount(decryptedToken);
      })
      .then(function () {
        L.info('Account activated. Signup finished.');
      })
      .catch(function (e) {
        L.error('Filed to signup: {0}', e);
        return Promise.reject();
      });
  };

  L.verbose('Peerio.Auth.init() end');

};