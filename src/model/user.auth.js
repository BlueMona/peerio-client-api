/**
 * Auth module for User object.
 */

var Peerio = this.Peerio || {};


Peerio.User = Peerio.User || {};

Peerio.User.addAuthModule = function (user) {
    'use strict';

    // login step to deal with keys
    function setKeys(passphraseOrPIN, isSystemPin) {
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
    }

    function waitForNetLogin() {
        return new Promise((resolve) => {
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
    }

    function checkOfflineLogin() {
        var isOfflineLogin = false;
        var cacheAvailable = false;

        // checking if cache is available
        return user.loadSettingsCache()
            .then(()=> {
                L.info('Offline login is possible.');

                isOfflineLogin = !user.settings.twoFactorAuth;

                if (isOfflineLogin)
                    L.info('Proceeding with offline login.');
                else
                    L.info('Offline login denied due to 2fa enabled on this account.');

                cacheAvailable = true;
            })
            .catch(err=> {
                L.info("Offline login is not possible. {0}", err);
            })
            .then(()=>[isOfflineLogin, cacheAvailable]);
    }

    function initDatabases() {
        return Peerio.SqlDB.openUserDB(user.username, user.localEncryptionKey)
            .then(() => Peerio.AppMigrator.migrateUser(user.username))
            .then(() => Peerio.SqlMigrator.migrateUp(Peerio.SqlDB.user));
    }

    user.login = function (passphraseOrPIN, isSystemPin) {
        // 'offline login' might not be the best choice of words in here
        // what it really means is that login will be executed locally, over stored data
        // and actual server login will be executed now or later, in parallel, based on network availability.
        // 'online' login, on the other hand requires normal server login before proceeding with app login
        var isOfflineLogin = false;
        // this flag is needed cause for security reasons (2fa) we might deny offline login while still
        // wanting to use existing local cache after server login is done
        var cacheAvailable = false;

        return setKeys(passphraseOrPIN, isSystemPin)
            .then(checkOfflineLogin)
            .then(res => {
                isOfflineLogin = res[0];
                cacheAvailable = res[1];
            })
            .then(()=> {
                // if required - performing net login before proceeding to the next steps
                if (!isOfflineLogin)
                    return waitForNetLogin();
            })
            .then(initDatabases)
            .then(() => Peerio.Auth.getPinForUser(user.username).then(pin => user.PINIsSet = !!pin))
            .then(() => {
                if (!cacheAvailable) return;
                L.info('Loading offline caches');
                return user.loadContactsCache().then(user.loadFilesCache);
            })
            .then(()=> {
                // both offline and online login paths will execute this code on every authentication and disconnet
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
            .then(()=> {
                if (isOfflineLogin) return;
                // if this is online login, we need to sync first, since we logged in already and missed first 'onAuthenticated'
                user.loadSettings();
                return user.reSync();
            })
            .then(() => {
                if (!isOfflineLogin) return;
                // providing network layer with user credentials
                // the actual server login will be executed right now, in parallel
                // or later, when network is available
                Peerio.Net.login({
                    username: user.username,
                    publicKey: user.publicKey,
                    keyPair: user.keyPair
                }, true);

            })
            .catch((e)=> {
                L.error('Peerio.user.login error. {0}', e);
                // ! This is an important piece.
                // Usually, to perform 'sign out' we reload app to clean all states and resources.
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

