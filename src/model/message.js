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
                Peerio.Conversation.updateReadState(data.conversationID, data.seqID, decrypted.receipts)
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
        );
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
            buildProperties: buildProperties,
            decryptReceipts: decryptReceipts

        };

        return obj;
    };

    /**
     * Parses server 'message_read' object data and adds receipt to existing message
     * @param receiptData
     */
    Peerio.Message.addReceipt = function (receiptData) {
        var receipts;

        // fetching message
        Peerio.SqlQueries.getMessageByID(receiptData.messageID)
            .then(res => {
                // message found?
                if (res.rows.length !== 1) return Promise.reject('Message id ' + receiptData.messageID + ' not found');
                // do we maybe already have this receipt?
                receipts = JSON.parse(res.rows.item(0).receipts) || [];
                if (receipts.indexOf(receiptData.username) >= 0) return Promise.reject('Receipt already exists.');
                // TODO: update conversation readState
                // adding receipt
               // receipts.push(receiptData.username);
               // return Peerio.SqlQueries.updateReceipts(receiptData.seqID, receipts, receiptData.messageId)
            })
            //.then(() => Peerio.Crypto.decryptReceipt(receiptData.username, receiptData.encrypted_receipt))
            //.then(decrypted => Peerio.SqlQueries.updateReceipts(receiptData.seqID, receipts, receiptData.messageId, decrypted))
            .catch(err => L.error('Failed to add receipt. {0}. {1}.', err, receiptData));
    };

    Peerio.Message.encrypt = function(recipients, subject, body, fileIDs) {
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