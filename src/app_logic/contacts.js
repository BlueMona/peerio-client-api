/**
 * Contact list logic
 *
 * Depends on:
 * ----------
 * Peerio.Net
 *
 */
var Peerio = this.Peerio || {};

(function () {
    'use strict';

    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    Peerio.Contacts = {
        getContactsCache: getContactsCache,
        getContacts: getContacts,
        getSentRequests: getSentRequests,
        getReceivedRequests: getReceivedRequests
    };
    //--------------------------------------------------------------------------------------------------------------------

    /**
     * Parses server response with user contacts or contact requests and returns contacts collection
     * @param {[]} data - contacts array
     * @return {Promise<Collection<Contact>>}
     */
    function createContacts(data, username, isServerData) {
        L.info('Processing {0} contacts data', data.length);

        var contacts = Collection('username', null, 'fullNameAndUsername');
        var counter = 0;
        return Promise.map(data, function (contactData) {
            return (isServerData ? Peerio.Contact.fromServerData(contactData) : Peerio.Contact.fromLocalData(contactData))
                .then(function (contact) {
                    isServerData && Peerio.Action.syncProgress(counter++, data.length, 'synchronizing contacts');
                    if (contact.username === username) contact.isMe = true;
                    contacts.add(contact, true);
                });
        }).then(function () {
            contacts.sort();
            return contacts;
        });
    }

    function getContactsCache(username) {
        var ret = {};
        return Peerio.SqlQueries.getContacts()
            .then(data => createContacts(data.filter(c=>!c.isRequest), username, false))
            .then(contacts => ret.contacts = contacts)
            .then(data => createContacts(data.filter(c=>c.isRequest && !c.isReceivedRequest), null, false))
            .then(sentRequests => ret.sentRequests = sentRequests)
            .then(data => createContacts(data.filter(c=>c.isReceivedRequest), null, false))
            .then(receivedRequests => ret.receivedRequests = receivedRequests)
            .return(ret);
    }


    /**
     * Retrieves contact list from server and build a Contact Collection
     * @param {string} username - authenticated user username (to build his contact object properly)
     * @return {Promise<Collection<Contact>>}
     */
    function getContacts(username) {
        L.info('Peerio.Contact.getAllFromServer()');
        L.B.start('processing contacts', 'Processing contact data from server');

        return Peerio.Net.getContacts() // contacts array from server
            .then(data => createContacts(data.contacts, username, true)) // converted to collection
            .catch(function (e) {
                L.error('Error loading contacts: {0}', e);
                return Promise.reject();
            })
            .finally(function () {
                L.B.stop('processing contacts');
            });

    }

    /**
     * Returns a list of sent contact requests in a form of Contact collection
     * @returns {Promise<Collection<Contact>>}
     */
    function getSentRequests() {
        return Peerio.Net.getSentContactRequests()
            .then(data => createContacts(data.contactRequests, null, true))
            .catch(function (e) {
                L.error('Error loading sent contact requests: {0}', e);
                return Promise.reject();
            });
    }

    /**
     * Returns a list of received contact requests in a form of Contact collection
     * @returns {Promise<Collection<Contact>>}
     */
    function getReceivedRequests() {
        return Peerio.Net.getReceivedContactRequests()
            .then(data => createContacts(data.contactRequests, null, true))
            .catch(function (e) {
                L.error('Error loading received contact requests: {0}', e);
                return Promise.reject();
            });
    }

})();