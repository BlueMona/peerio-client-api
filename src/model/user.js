/**
 * Peerio User object holds authenticated user data
 * and orchestrates application on the top level
 *
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    // Module pattern without cached functions is optimal for User class

    Peerio.User = Peerio.User || {};

    /**
     * @param {string} username
     * @returns {object}
     */
    Peerio.User.create = function (username) {

        var user = {
            username: username,
            PINIsSet: false
        };

        Peerio.User.addAuthModule(user);
        Peerio.User.addSettingsModule(user);

        user.reSync = function () {
            return user.loadSettings()
                .then(user.loadContacts)
                .then(() => Peerio.ContactsEventHandler.resume())
                .then(user.loadFiles)
                .then(() => Peerio.FilesEventHandler.resume())
                .then(() => {
                    // a bit ugly but we need app to be usable while messages are syncing,
                    // so reSync promise needs to be resolved before messages are done syncing
                    //window.setTimeout(()=> {
                    //    Peerio.Sync.syncMessages()
                    //        .then(() => Peerio.MessagesEventHandler.resume());
                    //}, 0);
                });
        }.bind(user);

        user.stopAllServerEvents = function () {
            Peerio.Sync.interrupt();
            Peerio.MessagesEventHandler.pause();
            Peerio.FilesEventHandler.pause();
            Peerio.ContactsEventHandler.pause();
        }.bind(user);


        user.loadContacts = function () {
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
        }.bind(this);

        user.loadFiles = function () {
            //todo cache
            return Peerio.Files.getAllFiles();
        }.bind(user);


        return user;
    };

})();
