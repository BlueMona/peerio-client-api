/**
 * Peerio User object holds authenticated user data
 * and orchestrates application on the top level
 *
 * Depends on:
 * -----------
 * Peerio.Auth
 *
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    // Module pattern without cached functions is optimal for User class

    Peerio.User = function (username) {

        //-- PUBLIC API ----------------------------------------------------------------------------------------------------
        var user = {
            username: username,
            login: login,
            PINIsSet: false,
            setPIN: setPIN,
            removePIN: removePIN
        };
        //------------------------------------------------------------------------------------------------------------------

        function login(passphraseOrPIN) {
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
                //.then(() => Peerio.SqlDB.openUserDB(user.username, user.passphrase))
                //.then(db => Peerio.SqlMigrator.migrateUp(db))
                .then(() => Peerio.Crypto.setDefaultUserData(username, user.keyPair, user.publicKey))
                .then(() => {
                    Peerio.Net.subscribe(Peerio.Net.EVENTS.onAuthenticated, reSync);
                    Peerio.Net.subscribe(Peerio.Net.EVENTS.onDisconnect, stopAllServerEvents);
                    return reSync();
                });

        }

        function reSync() {
            return loadSettings()
                .then(loadContacts)
                .then(() => Peerio.ContactsEventHandler.resume())
                .then(loadFiles)
                .then(() => Peerio.FilesEventHandler.resume())
                .then(() => {
                    // a bit ugly but we need app to be usable while messages are syncing,
                    // so reSync promise needs to be resolved before messages are done syncing
                    //window.setTimeout(()=> {
                    //    Peerio.Sync.syncMessages()
                    //        .then(() => Peerio.MessagesEventHandler.resume());
                    //}, 0);
                });
        }

        function stopAllServerEvents() {
            Peerio.Sync.interrupt();
            Peerio.MessagesEventHandler.pause();
            Peerio.FilesEventHandler.pause();
            Peerio.ContactsEventHandler.pause();
        }

        function setPIN(pin) {
            Peerio.Auth.setPIN(pin, user.username, user.passphrase)
                .then(() => user.PINIsSet = true)
                .then(()=>Peerio.Action.settingsUpdated);
        }

        function removePIN() {
            if (Peerio.Auth.removePIN(user.username)) {
                user.PINIsSet = false;
                Peerio.Action.settingsUpdated();
            }
        }

        function loadSettings() {
            //todo attempt cache first and then call for net update
            return Peerio.Net.getSettings()
                .then(settings => {
                    user.settings = settings;
                    Peerio.Action.settingsUpdated();
                });
        }

        function loadContacts() {
            // todo cache first
            var p1 = Peerio.Contacts.getContacts(user.username)
                .then(contacts => {
                    user.contacts = contacts;

                    var cryptoContacts = {};
                    contacts.arr.forEach(item => {
                        cryptoContacts[item.username] = {
                            username: item.username,
                            publicKey: item.publicKey
                        }
                    });

                    Peerio.Crypto.setDefaultContacts(cryptoContacts);
                });

            var p2 = Peerio.Contacts.getReceivedRequests()
                .then(received => {
                    //todo: old code compatibility flags, refactor and remove
                    received.arr.forEach(item =>  item.isRequest = item.isReceivedRequest = true);
                    return user.receivedContactRequests = received;
                });

            var p3 = Peerio.Contacts.getSentRequests()
                .then(sent => {
                    sent.arr.forEach(item => item.isRequest = true);
                    return user.sentContactRequests = sent;
                });

            return Promise.all([p1, p2, p3]);
        }

        function loadFiles() {
            //todo cache
            return Peerio.Files.getAllFiles();
        }

        return user;
    };

})();