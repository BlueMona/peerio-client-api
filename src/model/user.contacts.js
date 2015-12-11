/**
 * Contacts module for User object.
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';
    Peerio.User = Peerio.User || {};

    Peerio.User.addContactsModule = function (user) {
        // todo: db cache

        function updateCollectionVersion(version) {
            user.contactsVersion = Math.max(user.contactsVersion, version);
            Peerio.Action.contactsUpdated();
        }

        /**
         * Adds/replaces a new contact to local contact list cache.
         * Normally as a result of server event.
         * @param {Peerio.Contact} contact
         * @param {number} version - collection version associated with this update
         */
        user.onContactAdded = function (contact, version) {
            user.contacts.addOrReplace(contact);
            user.sentContactRequests.removeByKey(data.username);
            user.receivedContactRequests.removeByKey(data.username);
            updateCollectionVersion(version);
        }.bind(user);

        /**
         * Removes a contact from local contact list cache.
         * Normally as a result of server event.
         * @param {string} username - removed contact username
         * @param {number} version - collection version associated with this update
         */
        user.onContactRemoved = function (username, version) {
            user.contacts.removeByKey(username);
            updateCollectionVersion(version);
        }.bind(user);

        /**
         * Adds/replaces a new contact request to local contact list cache.
         * Normally as a result of server event.
         * @param {Peerio.Contact} contact
         * @param {number} version - collection version associated with this update
         */
        user.onContactRequestSent = function (contact, version) {
            // todo: legacy flags, refactor and remove
            contact.isRequest = true;
            user.sentContactRequests.addOrReplace(contact);
            updateCollectionVersion(version);
        }.bind(user);

        /**
         * Removes a contact request from local contact list cache.
         * Normally as a result of server event.
         * @param {string} username - removed contact username
         * @param {number} version - collection version associated with this update
         */
        user.onSentContactRequestRemoved = function (username, version) {
            Peerio.user.sentContactRequests.removeByKey(username);
            updateCollectionVersion(version);
        }.bind(user);

        /**
         * Adds/replaces a new received contact request to local contact list cache.
         * Normally as a result of server event.
         * @param {Peerio.Contact} contact
         * @param {number} version - collection version associated with this update
         */
        user.onContactRequestReceived = function (contact, version) {
            // todo: legacy flags, refactor and remove
            contact.isRequest = contact.isReceivedRequest = true;
            user.receivedContactRequests.addOrReplace(contact);
            updateCollectionVersion(version);
        }.bind(user);

        /**
         * Removes a received request from local contact list cache.
         * Normally as a result of server event.
         * @param {string} username - removed contact username
         * @param {number} version - collection version associated with this update
         */
        user.onReceivedContactRequestRemoved = function (username, version) {
            Peerio.user.receivedContactRequests.removeByKey(username);
            updateCollectionVersion(version);
        }.bind(user);


        /**
         * Reloads contact collection from server.
         * Skips reload if cached collection version is the same as on server.
         */
        user.loadContacts = function () {
            var msg = 'synchronizing contacts';
            // todo cache to db
            Peerio.Action.syncProgress(0, 0, msg);

            return Peerio.Net.getCollectionsVersion()
                .then(response => {
                    // contacts are up to date
                    if (user.contactsVersion === response.versions.contacts)
                        return;

                    // contacts
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

                    // received requests
                    var p2 = Peerio.Contacts.getReceivedRequests()
                        .then(received => {
                            //todo: old code compatibility flags, refactor and remove
                            received.arr.forEach(item =>  item.isRequest = item.isReceivedRequest = true);
                            return user.receivedContactRequests = received;
                        });

                    // sent requests
                    var p3 = Peerio.Contacts.getSentRequests()
                        .then(sent => {
                            sent.arr.forEach(item => item.isRequest = true);
                            return user.sentContactRequests = sent;
                        });

                    // after all promises are done, setting collection version
                    return Promise.all([p1, p2, p3])
                        .then(function () {
                            // in case it got updated from other events already
                            updateCollectionVersion(response.versions.contacts);
                        });
                })
                .finally(()=>Peerio.Action.syncProgress(100, 100, msg));


        }.bind(this);

    }
})();
