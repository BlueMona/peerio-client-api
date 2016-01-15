/**
 * Message model
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    /**
     * Fills/replaces current Message object properties with data sent by server.
     * @param data - message data in server format
     * @returns {Object} - this
     */
    function applyServerData(data) {
        if (!data) {
            L.error('loadServerData: can\'t load from undefined object');
            return this;
        }

        this.id = data.id;
        this.seqID = data.seqID;
        this.conversationID = data.conversationID;
        this.sender = data.sender;
        this.timestamp = data.timestamp;

        return Peerio.Crypto.decryptMessage(data)
            .then(decrypted => {
                this.files = decrypted.fileIDs;
                this.body = decrypted.message;
                this.subject = decrypted.subject;
                this.receipts = decrypted.receipts;
                this.innerIndex = decrypted.innerIndex;
                this.sequence = decrypted.sequence;
            })
            .return(this);
    }

    function applyLocalData(data) {
        _.assign(this, data);
        this.files = JSON.parse(this.files) || [];
        this.buildProperties();
        return this;
    }

    /**
     * Builds computed properties
     */
    function buildProperties() {
        this.moment = moment(this.timestamp);
        return this;
    }

    function insert() {
        return Peerio.SqlQueries.createMessage(
            this.id,
            this.seqID,
            this.conversationID,
            this.sender,
            this.timestamp,
            this.body,
            this.files
        ).then(()=> {
            if (!this.receipts || !this.receipts.length) return;
            return Promise.each(decrypted.receipts,
                username => Peerio.SqlQueries.updateReadPosition(this.conversationID, username, this.seqID));
        });
    }

    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    /**
     * Call Peerio.Message() to create empty message object
     * @returns {Message}
     */
    Peerio.Message = function () {
        var obj = {
            applyServerData: applyServerData,
            applyLocalData: applyLocalData,
            insert: insert,
            //--
            buildProperties: buildProperties
        };

        return obj;
    };

    Peerio.Message.encrypt = function (recipients, subject, body, fileIDs) {
        var message = {
            message: body,
            receipt: nacl.util.encodeBase64(nacl.randomBytes(32)),
            fileIDs: fileIDs || [],
            participants: recipients,
            sequence: 0
        };
        if (subject !== null) message.subject = subject;
        return Peerio.Crypto.encryptMessage(message, recipients);
    };


})();