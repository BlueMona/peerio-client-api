/**
 * Auth module for User object.
 */

var Peerio = this.Peerio || {};


Peerio.User = Peerio.User || {};

Peerio.User.addAuthModule = function (user) {
    'use strict';
    user.login = function (passphraseOrPIN) {
        return Peerio.Auth.getSavedKeys(user.username, passphraseOrPIN)
            .then(keys => {
                if (keys === true || keys === false) {
                    user.PINIsSet = keys;
                    return Peerio.Auth.generateKeys(user.username, passphraseOrPIN)
                }

                user.PINIsSet = true;
                return keys;
            })
            .then((keys) => {
                user.publicKey = keys.publicKey;
                user.keyPair = keys.keyPair;
                user.localEncryptionKey = Base58.encode(user.keyPair.secretKey)
            })
            .then(() => Peerio.Net.login({
                username: user.username,
                publicKey: user.publicKey,
                keyPair: user.keyPair
            }))
            .then(() => Peerio.SqlDB.openUserDB(user.username, user.localEncryptionKey))
            .then(db => Peerio.SqlMigrator.migrateUp(db))
            .then(() => Peerio.Crypto.setDefaultUserData(user.username, user.keyPair, user.publicKey))
            .then(() => user.reSync())
            .then(()=> {
                Peerio.Dispatcher.onAuthenticated(function () {
                    user.reSync()
                        .catch(err => {
                            L.error('Synchronization failed. {0}.', err);
                            //TODO: if it fails due to disconnection - its ok
                            //TODO: otherwise it's a problem, maybe report it on the sync view
                        });
                });
                Peerio.Dispatcher.onDisconnected(user.stopAllServerEvents);
            })
            .catch((e)=> {
                L.error('Peerio.user.login error. {0}', e);
                // ! This is an important piece.
                // Usually, to perform 'sign out' we reload app to clean all states and open resources.
                // But here(initial login) we don't want to do that, because it will create an unpleasant UX.
                // So we clean resources manually.
                Peerio.Net.signOut();
                Peerio.SqlDB.closeAll();
                return Promise.reject(e);
            });

    }.bind(user);

    user.setPIN = function (pin) {
        return Peerio.Auth.setPIN(pin, user.username, user.keyPair)
            .then(() => {
                user.PINIsSet = true;
                Peerio.Action.settingsUpdated();
            });
    }.bind(user);

    user.removePIN = function () {
        return Peerio.Auth.removePIN(user.username).then(()=> {
            user.PINIsSet = false;
            Peerio.Action.settingsUpdated();
        });
    }.bind(user);
};

