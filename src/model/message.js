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
    function loadServerData(data) {
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
                this.attachments = decrypted.fileIDs;
                this.body = decrypted.message;
                this.receiptSecret = decrypted.receipt;
                this.receipts = decrypted.receipts;
                this.subject = decrypted.subject; // todo copy to conversation
                return this;
        });

    }
/*
 'id TEXT PRIMARY KEY,' + // messageID
 'seqID INTEGER,' +       // sequence id for this message
 'conversationID TEXT,' + // conversation this message belongs to
 'timestamp INTEGER,' +     // timestamp
 'sender TEXT,' +           // username
 'body TEXT,' +
 'receiptSecret TEXT,' +    // for messages sent by current user
 'receiptToSend TEXT,' +    // in case of offline we cache it here to send later
 'receipts TEXT,' +         // received receipts (for own messages) ['username', 'username']
 'attachments TEXT,' +      // file id array ['id', 'id']
 'unread BOOLEAN' +
 */
    /**
     * Builds computed properties
     */
    function buildProperties() {
        return this;
    }

    function save(){
        return Peerio.SqlQueries.createMessage(
            this.id,
            this.seqID,
            this.originalMsgID,
            this.subject,
            this.createdTimestamp,
            JSON.stringify(this.participants),
            JSON.stringify(this.exParticipants),
            JSON.stringify(this.events),
            this.lastTimestamp,
            this.fileCount,
            this.msgCount,
            this.unread);
    }

    function loadFromDB(){

    }


    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    /**
     * Call Peerio.Message() to create empty message object
     * @returns {Message}
     */
    Peerio.Message = function () {
        var obj = {
            loadServerData: loadServerData,
            buildProperties: buildProperties,
            save: save
        };

        return obj;
    };
    /**
     * Call to create and fully build Message instance from server data
     * @param {Object} data
     * @returns {Promise<Message>}
     */
    Peerio.Message.create = function (data) {
        return Peerio.Message()
            .loadServerData(data)
            .then(msg => msg.buildProperties());
    };

})();