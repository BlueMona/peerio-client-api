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
        getPinForUser: getPinForUser,
        getSavedKeys: getSavedKeys,
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

    function getPinForUser(username) {
        return Peerio.TinyDB.getObject(username + 'PIN');
    }
    /**
     * Tries to retrieve saved keys encrypted with passcode
     * @param username
     * @param userInput - we don't know if user entered PIN or passphrase, so we will try to treat is as a PIN first
     * @returns {Promise<{Keys} || boolean>} - base58 encoded keys
     *                  or true/false meaning that PIN exists but can't decrypt or PIN does not exist.
     */
    function getSavedKeys(username, userInput) {

        L.info('Checking for PIN existence.');

        return getPinForUser(username)
            .then(function (encrypted) {
                if (!encrypted) {
                    L.info('PIN is not set.');
                    return false;
                }

                L.info('PIN exists. Trying to decrypt keys with user input.');
                // if it failed because user entered passphrase - we don't care, other cases are logged anyway
                var keys;
                return decryptKeys(username, userInput, encrypted)
                    .then(k=> {
                        keys = {
                            keyPair: {
                                publicKey: Base58.decode(k.publicKey),
                                secretKey: Base58.decode(k.secretKey)
                            }
                        };
                        // publicKey contains extra char for hash
                        return Peerio.Crypto.getPublicKeyString(keys.keyPair.publicKey);
                    })
                    .then(pk => {
                        keys.publicKey = pk;
                        return keys;
                    })
                    .catch(() => true);
            });
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

        return Peerio.TinyDB.removeItem(lastLoginKey)
            .then(()=>L.info('Removed last saved login info'))
            .catch(err=>L.error('Failed to remove logged user info. {e}', err));
    }

    /**
     * Saves encrypted keys to local db.
     * @param {string} PIN
     * @param {string} username
     * @param {KeyPair} keyPair
     * @returns {Promise}
     */
    function setPIN(PIN, username, keyPair) {
        L.info('Peerio.Auth.setPIN(...). Deriving key.');

        return Peerio.Crypto.getKeyFromPIN(PIN, username)
            .then(function (PINkey) {
                L.info('Encrypting keys.');
                var obj = {
                    publicKey: Base58.encode(keyPair.publicKey),
                    secretKey: Base58.encode(keyPair.secretKey)
                };
                return Peerio.Crypto.secretBoxEncrypt(JSON.stringify(obj), PINkey);
            })
            .then(function (encrypted) {
                L.info('Storing encrypted keys.');
                //todo: encapsulate crypto details
                encrypted.ciphertext = nacl.util.encodeBase64(encrypted.ciphertext);
                encrypted.nonce = nacl.util.encodeBase64(encrypted.nonce);
                return Peerio.TinyDB.setObject(username + 'PIN', encrypted);
            })
            .then(()=> L.info('PIN is set'))
            .catch(function (e) {
                L.error('Error setting PIN. {0}', e);
                return Promise.reject();
            });
    }

    /**
     * Removes passphrase encrypted with PIN from local db
     * @param username
     * @returns {Promise}
     */
    function removePIN(username) {
        L.info('PeerioAuth.removePIN()');

        return Peerio.TinyDB.removeItem(username + 'PIN')
            .then(()=>L.info('Pin removed'))
            .catch(err=> {
                L.error('Failed to remove PIN. {0}', err);
                return Promise.reject();
            });
    }

    /**
     * Decrypts saved keys with pin
     * @param username
     * @param PIN
     * @param encryptedKeys
     * @returns {Promise<{publicKey:string, secretKey:string}>} - b64 encoded public and secret keys
     */
    function decryptKeys(username, PIN, encryptedKeys) {
        L.info('Generating decrypting key from PIN and username');
        return Peerio.Crypto.getKeyFromPIN(PIN, username)
            .then(PINkey => {
                L.info('Decrypting keys');
                // todo: this chunk of code knows too much about crypto
                return Peerio.Crypto.secretBoxDecrypt(nacl.util.decodeBase64(encryptedKeys.ciphertext),
                    nacl.util.decodeBase64(encryptedKeys.nonce), PINkey);
            })
            .then(keys => {
                if (!keys) return Promise.reject();

                L.info('Keys decrypted.');
                return JSON.parse(keys);
            })
            .catch(function (e) {
                L.error('Failed to decrypt keys. {0}', e);
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
