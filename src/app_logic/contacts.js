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
    function createContactsFromServerData(data, username) {
        L.info('Processing {0} server contacts data', data.length);

        var contacts = Collection('username', null, 'fullNameAndUsername');
        var counter = 0;
        return Promise.map(data, function (contactData) {
            return Peerio.Contact.create(contactData)
                .then(function (contact) {
                    Peerio.Action.syncProgress(counter++, data.length, 'synchronizing contacts');
                    if (contact.username === username) contact.isMe = true;
                    contacts.add(contact, true);
                });
        }).then(function () {
            contacts.sort();
            return contacts;
        });
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
            .then(data => createContactsFromServerData(data.contacts, username)) // converted to collection
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
            .then(data => createContactsFromServerData(data.contactRequests))
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
            .then(data => createContactsFromServerData(data.contactRequests))
            .catch(function (e) {
                L.error('Error loading received contact requests: {0}', e);
                return Promise.reject();
            });
    }

})();