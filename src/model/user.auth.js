/**
 * Auth module for User object.
 */

var Peerio = this.Peerio || {};


Peerio.User = Peerio.User || {};

Peerio.User.addAuthModule = function (user) {
    'use strict';

    function tryOfflineLogin(){
        return
    }

    user.login = function (passphraseOrPIN, isSystemPin) {
        var offlineLoginPossible = true;

        var promise = Peerio.Auth.getSavedKeys(user.username, passphraseOrPIN, isSystemPin)
            .then(keys => {
                if (keys === true || keys === false) {
                    return Peerio.Auth.generateKeys(user.username, passphraseOrPIN);
                }

                return keys;
            })
            .then(keys => {
                user.publicKey = keys.publicKey;
                user.keyPair = keys.keyPair;
                user.localEncryptionKey = Base58.encode(user.keyPair.secretKey);
            })
            .then(()=>{
                tryOfflineLogin()
            });

            //.then(()=> user.loadSettingsCache().catch(()=>offlineLoginPossible = false))
            //.then(()=> {
            //    if (!offlineLoginPossible) return;
            //    return Peerio.user.loadContactsCache().catch(()=>offlineLoginPossible = false);
            //})
            //.then(()=> {
            //    if (!offlineLoginPossible) return;
            //    return Peerio.user.loadFileCache().catch(()=>offlineLoginPossible = false);
            //})


        // making sure that the app is already connected
        promise = promise.then(() => {
            return new Promise((resolve, reject) => {
                var maxTries = 5;
                var currentTry = 0;
                var timeoutCheck = function () {
                    if (!Peerio.AppState.connected && (++currentTry < maxTries)) {
                        L.info('Not connected. Waiting');
                        window.setTimeout(timeoutCheck, 1000);
                        return;
                    }
                    resolve();
                };
                timeoutCheck();
            });
        });

        return promise
            .then(() => Peerio.Net.login({
                username: user.username,
                publicKey: user.publicKey,
                keyPair: user.keyPair
            }))
            .then(() => Peerio.SqlDB.openUserDB(user.username, user.localEncryptionKey))
            .then(() => Peerio.AppMigrator.migrateUser(user.username))
            .then(db => Peerio.SqlMigrator.migrateUp(db))
            .then(() => Peerio.Crypto.setDefaultUserData(user.username, user.keyPair, user.publicKey))
            .then(() => Peerio.Auth.getPinForUser(user.username))
            .then((pin) => {
                user.PINIsSet = !!pin;
            })
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

    user.setPIN = function (pin, isSystemPin) {
        return Peerio.Auth.setPIN(pin, user.username, user.keyPair, isSystemPin)
            .then(() => {
                // TODO: maybe some nicer way to separate system pin of user pin
                if (!isSystemPin) user.PINIsSet = true;
                Peerio.Action.settingsUpdated();
            });
    }.bind(user);

    user.removePIN = function (isSystemPin) {
        return Peerio.Auth.removePIN(user.username, isSystemPin).then(()=> {
            // TODO: maybe some nicer way to separate system pin of user pin
            if (!isSystemPin) user.PINIsSet = false;
            Peerio.Action.settingsUpdated();
        });
    }.bind(user);
};

