/**
 * Contacts module for User object.
 */

var Peerio = this.Peerio || {};
Peerio.User = Peerio.User || {};

Peerio.User.addContactsModule = function (user) {
    'use strict';
    // todo: db cache

    var queue = Queue();
    var net = Peerio.Net;

    // todo from base
    user.contactsVersion = -1;

    user.pauseContactEvents = function () {
        queue.pause();
    }.bind(user);

    user.resumeContactEvents = function () {
        queue.resume();
    }.bind(user);

    user.getSortedContacts = function() {
        if(!user.contacts.sorted) {
            var i;
            for(i = 0; i < user.contacts.arr.length; ++i) {
                var c = user.contacts.arr[i];
                c.comparer = c.firstName ? c.firstName : c.username;
                c.comparer = c.comparer.toLowerCase();
            }
            user.contacts.sorted = user.contacts.arr
            .sort( (a, b) => {
                return a.comparer > b.comparer;
            });
        }
        return user.contacts.sorted;
    }.bind(user);

    //subscribing to server events
    net.subscribe('contactAdded', data=>queue.add(onAdded, data));
    net.subscribe('contactRemoved', data=>queue.add(onRemoved, data));
    net.subscribe('contactUpdated', data=>queue.add(onUpdated, data));

    net.subscribe('contactRequestSent', data=>queue.add(onRequestSent, data));
    net.subscribe('sentContactRequestRemoved', data=>queue.add(onSentRequestRemoved, data));

    net.subscribe('contactRequestReceived', data=>queue.add(onRequestReceived, data));
    net.subscribe('receivedContactRequestRemoved', data=>queue.add(onReceivedRequestRemoved, data));

    function updateCollectionVersion(version) {
        if (user.contactsVersion != -1 && user.contactsVersion < version) {
            Peerio.user.setContactsUnreadState(true);
        }
        user.contacts.sorted = null;
        user.contactsVersion = Math.max(user.contactsVersion, version);
        Peerio.TinyDB.saveItem('contactsVersion', user.contactsVersion,  user.username, user.keyPair.secretKey);
        Peerio.Action.contactsUpdated();
    }

    function setCryptoContacts() {
        var cryptoContacts = {};
        user.contacts.arr.forEach(item => {
            cryptoContacts[item.username] = {
                username: item.username,
                publicKey: item.publicKey
            };
        });

        Peerio.Crypto.setDefaultContacts(cryptoContacts);
    }

    function onAdded(data) {
        Peerio.Contact.fromServerData(data)
            .then(contact=> {
                contact.save();
                user.contacts.addOrReplace(contact);
                user.sentContactRequests.removeByKey(contact.username);
                user.receivedContactRequests.removeByKey(contact.username);
                setCryptoContacts();
                updateCollectionVersion(data.collectionVersion);
            })
            .catch(err => {
                L.error('Failed to process contactAdded event. {0}', err);
            });
    }

    function onRemoved(data) {
        try {
            Peerio.SqlQueries.deleteContact(data.username);
            user.contacts.removeByKey(data.username);
            setCryptoContacts();
            updateCollectionVersion(data.collectionVersion);
        } catch (err) {
            L.error('Failed to process contactRemoved event. {0}', err);
        }
    }

    function onUpdated(data) {
        try {
            user.loadContacts();
        } catch (err) {
            L.error('Failed to process contactUpdated event. {0}', err);
        }
    }

    function onRequestSent(data) {
        Peerio.Contact.fromServerData(data)
            .then(contact=> {
                // todo: legacy flags, refactor and remove
                contact.isRequest = true;
                contact.save();
                user.sentContactRequests.addOrReplace(contact);
                updateCollectionVersion(data.collectionVersion);
            })
            .catch(err => {
                L.error('Failed to process contactRequestSent event. {0}', err);
            });
    }

    function onSentRequestRemoved(data) {
        try {
            Peerio.SqlQueries.deleteContact(data.username);
            user.sentContactRequests.removeByKey(data.username);
            updateCollectionVersion(data.collectionVersion);
        } catch (err) {
            L.error('Failed to process sentContactRequestRemoved event. {0}', err);
        }
    }

    function onRequestReceived(data) {
        Peerio.Contact.fromServerData(data)
            .then(contact=> {
                contact.isRequest = contact.isReceivedRequest = true;
                contact.save();
                user.receivedContactRequests.addOrReplace(contact);
                updateCollectionVersion(data.collectionVersion);
            })
            .catch(err => {
                L.error('Failed to process contactRequestReceived event. {0}', err);
            });

    }

    function onReceivedRequestRemoved(data) {
        try {
            Peerio.SqlQueries.deleteContact(data.username);
            user.receivedContactRequests.removeByKey(data.username);
            updateCollectionVersion(data.collectionVersion);
        } catch (err) {
            L.error('Failed to process receivedContactRequestRemoved event. {0}', err);
        }
    }

    user.loadContactsCache = function () {
        return Peerio.Contacts.getContactsCache(user.username)
            .then(data => {
                user.contacts = data.contacts;
                user.receivedContactRequests = data.receivedRequests;
                user.sentContactRequests = data.sentRequests;
                setCryptoContacts();
                return Peerio.TinyDB.getItem('contactsVersion', user.username, user.keyPair.secretKey);
            })
            .then(contactsVersion => user.contactsVersion = contactsVersion == null ? -1 : contactsVersion);
    };

    /**
     * Reloads contact collection from server.
     * Skips reload if cached collection version is the same as on server.
     */
    user.loadContacts = function () {
        var msg = 'synchronizing contacts';
        // todo cache to db
        Peerio.Action.syncProgress(0, 0, msg);

        return Peerio.Net.getCollectionsVersion()
            .then(versionResp => {
                var currentVersion = versionResp.versions.contacts;
                // contacts are up to date
                if (user.contactsVersion === currentVersion)
                    return;

                // after all promises are done, setting collection version
                return Promise.all([
                        Peerio.Contacts.getContacts(user.username),
                        Peerio.Contacts.getReceivedRequests(),
                        Peerio.Contacts.getSentRequests()
                    ])
                    .spread(function (contacts, received, sent) {
                        user.contacts = contacts;
                        setCryptoContacts();

                        received.arr.forEach(item => item.isRequest = item.isReceivedRequest = true);
                        user.receivedContactRequests = received;

                        sent.arr.forEach(item => item.isRequest = true);
                        user.sentContactRequests = sent;

                        Promise.all([
                                Promise.each(contacts.arr, c => c.save()),
                                Promise.each(received.arr, c => c.save()),
                                Promise.each(sent.arr, c => c.save())
                            ])
                            .then(()=>removeDeletedContacts(contacts, received, sent))
                            .then(()=>updateCollectionVersion(currentVersion));

                    });
            })
            .finally(() => Peerio.Action.syncProgress(1, 1, msg));

    }.bind(user);

    function removeDeletedContacts(contacts, received, sent) {
        return Peerio.SqlQueries.getAllContactsUsernames()
            .then(usernames=> {
                var toDelete = [];
                usernames.forEach(u => {
                    if (contacts.dict[u] || received.dict[u] || sent.dict[u]) return;
                    toDelete.push(u);
                });
                return Promise.each(toDelete, u => Peerio.SqlQueries.deleteContact(u));
            });
    }

};
