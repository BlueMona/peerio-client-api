/**
 * Auth module for User object.
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';
    Peerio.User = Peerio.User || {};

    Peerio.User.addAuthModule = function (user) {

        user.login = function (passphraseOrPIN) {
            return Peerio.Auth.resolvePassphrase(user.username, passphraseOrPIN)
                .spread((passphrase, PINIsSet) => {
                    user.passphrase = passphrase;
                    user.PINIsSet = PINIsSet;
                })
                .then(() => Peerio.Auth.generateKeys(user.username, user.passphrase))
                .then((keys) => {
                    user.publicKey = keys.publicKey;
                    user.keyPair = keys.keyPair;
                })
                .then(() => Peerio.Net.login({
                    username: user.username,
                    publicKey: user.publicKey,
                    keyPair: user.keyPair
                }))
                .then(() => Peerio.SqlDB.openUserDB(user.username, user.passphrase))
                .then(db => Peerio.SqlMigrator.migrateUp(db))
                .then(() => Peerio.Crypto.setDefaultUserData(user.username, user.keyPair, user.publicKey))
                .then(() => user.reSync())
                .then(()=> {
                    Peerio.Dispatcher.onAuthenticated(function () {
                        user.reSync()
                            .catch(err => {
                                L.error('Synchronization failed. {0}.', err);
                                Peerio.Action.showAlert({text: err});
                            });
                    });
                    Peerio.Dispatcher.onDisconnected(user.stopAllServerEvents);
                })
                .catch((e)=> {
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
            Peerio.Auth.setPIN(pin, user.username, user.passphrase)
                .then(() => user.PINIsSet = true)
                .then(()=>Peerio.Action.settingsUpdated);
        }.bind(user);

        user.removePIN = function () {
            if (Peerio.Auth.removePIN(user.username)) {
                user.PINIsSet = false;
                Peerio.Action.settingsUpdated();
            }
        }.bind(user);

    }
})();
