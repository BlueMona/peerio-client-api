/**
 * Auth module for User object.
 */

var Peerio = this.Peerio || {};


Peerio.User = Peerio.User || {};

Peerio.User.addAuthModule = function (user) {
    'use strict';


    user.login = function (passphraseOrPIN, isSystemPin) {
        var offlineLoginPossible = false;

        return Peerio.Auth.getSavedKeys(user.username, passphraseOrPIN, isSystemPin)
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
            .then(() => Peerio.Crypto.setDefaultUserData(user.username, user.keyPair, user.publicKey))
            .then(()=> {
                return user.loadSettingsCache()
                    .then(()=>offlineLoginPossible = !user.settings.twoFactorAuth)
                    .catch(L.error);
            })
            .then(()=> {
                L.info('Offline login is {0}', offlineLoginPossible ? 'possible!' : 'not possible!');
                // making sure that the app is already connected
                if (offlineLoginPossible) return;

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
                }).then(() => {
                    // if it's an 'online' login, then we care for 'login' to finish
                    return Peerio.Net.login({
                        username: user.username,
                        publicKey: user.publicKey,
                        keyPair: user.keyPair
                    });
                });

            })
            .then(() => Peerio.SqlDB.openUserDB(user.username, user.localEncryptionKey))
            .then(() => Peerio.AppMigrator.migrateUser(user.username))
            .then(() => Peerio.SqlMigrator.migrateUp(Peerio.SqlDB.user))
            .then(() => Peerio.Auth.getPinForUser(user.username))
            .then((pin) => {
                user.PINIsSet = !!pin;
            })
            .then(() => {
                if (offlineLoginPossible) {
                    L.info('Loading offline caches');
                    return user.loadContactsCache().then(user.loadFilesCache);
                }
                user.loadSettings();
                return user.reSync();
            })
            .then(()=> {
                Peerio.Dispatcher.onAuthenticated(function () {
                    user.loadSettings(); // it's ok to run this in parallel
                    user.reSync()
                        .catch(err => {
                            L.error('Synchronization failed. {0}.', err);
                            //TODO: if it fails due to disconnection - its ok
                            //TODO: otherwise it's a problem, maybe report it on the sync view
                        });
                });
                Peerio.Dispatcher.onDisconnected(user.stopAllServerEvents);
            })
            .then(() => {
                // if it's 'offline' login, we just call this to enable auto-relogins
                if (offlineLoginPossible)
                    Peerio.Net.login({
                        username: user.username,
                        publicKey: user.publicKey,
                        keyPair: user.keyPair
                    }, true);
            })
            .catch((e)=> {
                L.error('Peerio.user.login error. {0}', e);
                // ! This is an important piece.
                // Usually, to perform 'sign out' we reload app to clean all states and open resources.
                // But here(initial login) we don't want to do that, because it will create an unpleasant UX.
                // So we clean resources manually.
                // This is applicable to 'online' login only though.
                Peerio.Net.signOut();
                Peerio.SqlDB.closeAll();
                Peerio.Crypto.setDefaultUserData(null, null, null);
                Peerio.Crypto.setDefaultContacts(null);
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

