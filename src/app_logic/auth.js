/**
 * Auth & Registration module
 *
 * Depends on:
 * ----------
 * Peerio.Net
 *
 */

/**
 * @name KeyPair
 * @property {Uint8Array} publicKey
 * @property {Uint8Array} secretKey
 */
/**
 * @name Keys
 * @property {string} publicKey
 * @property {KeyPair} keyPair
 */


var Peerio = this.Peerio || {};

(function () {
    'use strict';

    //-- Public API ------------------------------------------------------------------------------------------------------
    Peerio.Auth = {
        resolvePassphrase: resolvePassphrase,
        generateKeys: generateKeys,
        signup: signup,
        setPIN: setPIN,
        removePIN: removePIN,
        saveLogin: saveLogin,
        getSavedLogin: getSavedLogin,
        clearSavedLogin: clearSavedLogin
    };
    //--------------------------------------------------------------------------------------------------------------------

    // tinyDB key for last logged in user
    var lastLoginKey = 'lastLogin';

    /**
     * Detects if user entered code is PIN or passphrase and returns passphrase
     * @param username
     * @param enteredPass
     * @returns {Promise<string, bool>} - passphrase and flag PINIsSet
     */
    function resolvePassphrase(username, enteredPass) {
        var PINIsSet = false;

        L.info('Checking for PIN existence.');

        return Peerio.TinyDB.getObject(username + 'PIN')
            .then(function (encrypted) {
                if (encrypted) {
                    L.info('PIN exists. Decrypting key with PIN.');
                    PINIsSet = true;
                    return getPassphraseFromPIN(username, enteredPass, encrypted)
                    // if it failed because user entered passphrase - we don't care, other cases are logged anyway
                        .catch(() => enteredPass);
                }
                L.info('PIN does not exist.');
                return enteredPass;
            })
            .then(passphrase => [passphrase, PINIsSet]);
    }


    /**
     * Retrieves saved login (last successful one)
     * @promise {null|{username, firstName}}
     */
    function getSavedLogin() {
        L.info('Retrieving last logged in user data.');
        return Peerio.TinyDB.getObject(lastLoginKey)
            .then(function (data) {
                L.info('Last login data: {0}', data);
                return data;
            })
            .catch(function (e) {
                L.error('Error retrieving last login data: {0}', e);
            });
    }

    /**
     * Saves last logged in user details for future login
     * @param username
     * @param firstName
     * @returns {Promise}
     */
    function saveLogin(username, firstName) {
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
    }

    /**
     * Removes saved login info
     */
    function clearSavedLogin() {
        L.info('Removing last logged user info');
        try {
            Peerio.TinyDB.removeItem(lastLoginKey);
            return true;
        } catch (e) {
            L.error('Failed to remove logged user info. {e}', e);
            return false;
        }
    }

    /**
     * Saves encrypted passphrase to local db.
     * @param PIN
     * @param username
     * @param passphrase
     * @returns {Promise}
     */
    function setPIN(PIN, username, passphrase) {
        L.info('Peerio.Auth.setPIN(...). Deriving key.');

        return Peerio.Crypto.getKeyFromPIN(PIN, username)
            .then(function (PINkey) {
                L.info('Encrypting passphrase.');
                return Peerio.Crypto.secretBoxEncrypt(passphrase, PINkey);
            })
            .then(function (encrypted) {
                L.info('Storing encrypted passphrase.');
                //todo: encapsulate crypto details
                encrypted.ciphertext = nacl.util.encodeBase64(encrypted.ciphertext);
                encrypted.nonce = nacl.util.encodeBase64(encrypted.nonce);
                return Peerio.TinyDB.setObject(username + 'PIN', encrypted);
            })
            .catch(function (e) {
                L.error('Error setting PIN. {0}', e);
                return Promise.reject();
            });
    }

    /**
     * Removes passphrase encrypted with PIN from local db
     * @param username
     * @returns {boolean}
     */
    function removePIN(username) {
        L.info('PeerioAuth.removePIN()');
        try {
            Peerio.TinyDB.removeItem(username + 'PIN');
            L.info('Pin removed');
            return true;
        } catch (e) {
            L.error('Failed to remove PIN. {0}', e);
            return false;
        }
    }

    /**
     * Decrypts passphrase with pin
     * @param username
     * @param PIN
     * @param encryptedPassphrase
     * @returns {Promise<string>} passphrase
     */
    function getPassphraseFromPIN(username, PIN, encryptedPassphrase) {
        L.info('Generating key from PIN and username');
        return Peerio.Crypto.getKeyFromPIN(PIN, username)
            .then(PINkey => {
                L.info('Decrypting passphrase');
                // todo: this chunk of code knows too much about crypto
                return Peerio.Crypto.secretBoxDecrypt(nacl.util.decodeBase64(encryptedPassphrase.ciphertext),
                    nacl.util.decodeBase64(encryptedPassphrase.nonce), PINkey);
            })
            .then(passphrase => {
                L.info('Passphrase decrypted.');
                return passphrase;
            })
            .catch(function (e) {
                L.error('Failed to decrypt passphrase.', e);
                return Promise.reject();
            });
    }

    /**
     * Creates new account
     * @param username
     * @param firstName
     * @param lastName
     * @param passphrase
     * @returns {Promise<Keys>}
     */
    function signup(username, passphrase, firstName, lastName) {
        L.info('Peerio.Auth.signup(username:{0}, firstName:{1}, lastName:{2})', username, firstName, lastName);
        var keys;
        return generateKeys(username, passphrase)
            .then(keys_ => {
                keys = keys_;
                var info = new Peerio.AccountInfo(username, firstName, lastName, keys.publicKey, 'en');
                L.info('Registering account with server. {0}', info);
                return Peerio.Net.registerAccount(info);
            })
            .then(creationToken => {
                L.info('Decrypting creation token: {0}', creationToken);
                return Peerio.Crypto.decryptAccountCreationToken(creationToken, username, keys.keyPair);
            })
            .then(decryptedToken => {
                L.info('Activating account with decrypted token: {0}', decryptedToken);
                return Peerio.Net.activateAccount(decryptedToken);
            })
            .then(()=> {
                L.info('Account activated. Signup finished.');
                return keys;
            })
            .catch(e => {
                L.error('Filed to signup: {0}', e);
                return Promise.reject(e);
            });
    }

    /**
     * Generates binary keyPair and publicKey string
     * @param {string} username
     * @param {string} passphrase
     * @returns {Promise<Keys>}
     */
    function generateKeys(username, passphrase) {
        var keys = {};
        return Peerio.Crypto.getKeyPair(username, passphrase)
            .then(keyPair => {
                keys.keyPair = keyPair;
                return Peerio.Crypto.getPublicKeyString(keyPair.publicKey);
            })
            .then(publicKey => {
                keys.publicKey = publicKey;
                return keys;
            });
    }

})();