/**
 * Contact model
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    /**
     * Fills/replaces current Contact object properties with data sent by server.
     * @param data - contact data in server format
     * @returns {Object} - this
     */
    function loadServerData(data) {
        if (!data) {
            L.error('loadServerData: can\'t load from undefined object');
            return this;
        }
        //-- copied properties
        this.username = data.username;
        this.publicKey = data.publicKeyString;
        this.firstName = data.firstName || '';
        this.lastName = data.lastName || '';
        this.address = data.primaryAddress;
        // this.addresses = data.addresses;
        this.isDeleted = data.isDeleted;
        if (data.isMe) this.isMe = true; //todo change after server supports adding self to contact list

        return this;
    }

    /**
     * Builds computed properties
     */
    function buildProperties() {
        // full name is both first and last names, or one of them if another is not available,
        // or just username if none of the names are available
        this.fullName = this.firstName + ' ' + this.lastName;
        this.fullName = this.fullName.trim() || this.username;

        if (this.fullName !== this.username)
            this.fullNameAndUsername = this.fullName + ' (' + this.username + ')';

        return this;
    }

    /**
     * Generates png data urls
     * @returns {Promise} - resolves with 'this' when done
     */
    function buildIdenticon() {
        if (!this.publicKey) return Promise.reject();

        var header = 'data:image/png;base64,';

        return Peerio.Crypto.getAvatar(this.username, this.publicKey)
            .then(avatar => {
                var size = 12;
                this.icon12 = [];
                this.icon12.push(header + new Identicon(avatar[0].substring(0, 32), size, 0).toString());
                this.icon12.push(header + new Identicon(avatar[0].substring(32, 64), size, 0).toString());
                this.icon12.push(header + new Identicon(avatar[1].substring(0, 32), size, 0).toString());
                this.icon12.push(header + new Identicon(avatar[1].substring(32, 64), size, 0).toString());
                size = 18;
                this.icon18 = [];
                this.icon18.push(header + new Identicon(avatar[0].substring(0, 32), size, 0).toString());
                this.icon18.push(header + new Identicon(avatar[0].substring(32, 64), size, 0).toString());
                this.icon18.push(header + new Identicon(avatar[1].substring(0, 32), size, 0).toString());
                this.icon18.push(header + new Identicon(avatar[1].substring(32, 64), size, 0).toString());
            })
            .catch(function (err) {
                // not having identicon is not critical, just logging
                L.error('Failed to build identicon for: {0}. {1}', self.username, err);
            })
            .return(this);
    }

    /**
     * Removes state from contact object.
     * @param {string} state - state will be removed only if it equals this parameter
     */
    function resetState(state) {
        if (this.state === state) this.state = '';
    }

    /**
     * Accepts contact request
     * @returns {Promise} - resolves if message was delivered to server
     */
    function accept() {
        L.info('Contact accept: {0}', this.username);
        this.state = 'accepting';
        return Peerio.Net.acceptContactRequest(this.username)
            .finally(resetState.bind(this, this.state));
    }

    /**
     * Rejects contact request
     * @returns {Promise} - resolves if message was delivered to server
     */
    function reject() {
        L.info('Contact reject: {0}', this.username);
        this.state = 'rejecting';
        return Peerio.Net.rejectContactRequest(this.username)
            .finally(resetState.bind(this, this.state));
    }

    /**
     * Cancels sent contact request
     * @returns {Promise} - resolves if message was delivered to server
     */
    function cancelRequest() {
        L.info('Contact request cancel: {0}', this.username);
        this.state = 'cancelling';
        return Peerio.Net.cancelContactRequest(this.username)
            .finally(resetState.bind(this, this.state));
    }

    /**
     * Removes contact
     * @returns {Promise} - resolves if message was delivered to server
     */
    function remove() {
        L.info('Contact remove: {0}', this.username);
        this.state = 'removing';
        return Peerio.Net.removeContact(this.username)
            .finally(resetState.bind(this, this.state));
    }

    /**
     * Sends contact request to this.username
     * @returns {Promise} - resolves if message was delivered to server
     */
    function add() {
        L.info('Contact add: {0}', this.username);
        this.state = 'adding';
        return Peerio.Net.addContact(this.username)
            .finally(resetState.bind(this, this.state));
    }

    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    /**
     * Call Peerio.Contact() to create empty contact object
     * @param {string} [username] - optionally set username for empty contact
     * @returns {Contact}
     */
    Peerio.Contact = function (username) {
        var obj = {
            loadServerData: loadServerData,
            buildProperties: buildProperties,
            buildIdenticon: buildIdenticon,
            add: add,
            accept: accept,
            reject: reject,
            cancelRequest: cancelRequest,
            remove: remove
        };

        obj.self = obj;

        if (username) {
            obj.username = username;
            obj.buildProperties();
        }

        return obj;
    };
    /**
     * Call to create and fully build Contact instance from server data
     * @param {Object} data
     * @returns {Promise<Contact>}
     */
    Peerio.Contact.create = function (data) {
        return Peerio.Contact()
            .loadServerData(data)
            .buildProperties()
            .buildIdenticon();
    };

})();