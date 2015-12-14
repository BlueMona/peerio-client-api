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
        this.unread = true;
        this.receiptSent = false;

        return Peerio.Crypto.decryptMessage(data)
            .then(decrypted => {
                this.files = decrypted.fileIDs;
                this.body = decrypted.message;
                this.receiptSecret = decrypted.receipt.substring(0, 44);
                this.subject = decrypted.subject; // todo copy to conversation
                this.receipts = decrypted.receipts;
            })
            .then(()=> {
                // todo: find a way to remove direct dependency to Peerio.user
                // i sent this message
                if (this.sender === Peerio.user.username) {
                    this.unread = false;
                    this.receiptSent = true; //actually receipt not needed but this will make logic ignore it
                    return;
                }

                // I'm not the sender, which means it's incoming message and it might have my receipt
                return Promise.map(data.recipients, recipient => {
                    if (recipient.username !== Peerio.user.username || !recipient.receipt || !recipient.receipt.encryptedReturnReceipt) return;
                    return Peerio.Crypto.decryptReceipt(this.sender, recipient.receipt.encryptedReturnReceipt)
                        .then(decryptedReceipt=> {
                            if (decryptedReceipt.indexOf(this.receiptSecret) === 0) {
                                this.unread = false;
                                this.receiptSent = true;
                            }
                        })
                        .catch(err => {
                            L.error("Failed to decrypt receipt. {0}, {1}", recipient, err);
                            //todo remove this after client is changed to have all the public keys from deleted contacts
                            //because ignoring decrypt errors leaves a possibility to fake read status for malicious server
                            this.unread = false;
                            this.receiptSent = true;
                        });

                });

            })
            .return(this);
    }

    function loadLocalData(data) {
        _.assign(this, data);
        this.files = JSON.parse(this.files) || [];
        this.receipts = JSON.parse(this.receipts) || [];
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
            this.files,
            this.receiptSecret,
            this.receipts,
            this.receiptSent,
            this.unread
        );
    }


    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    /**
     * Call Peerio.Message() to create empty message object
     * @returns {Message}
     */
    Peerio.Message = function () {
        var obj = {
            loadServerData: loadServerData,
            loadLocalData: loadLocalData,
            buildProperties: buildProperties,
            insert: insert
        };

        return obj;
    };
    /**
     * Call to create and fully build Message instance from server data
     * @param {Object} data
     * @returns {Promise<Message>}
     */
    Peerio.Message.fromServerData = function (data) {
        return Peerio.Message()
            .loadServerData(data);
    };

    Peerio.Message.fromLocalData = function (data) {
        return Peerio.Message()
            .loadLocalData(data)
            .buildProperties();
    };

    Peerio.Message.addReceipt = function (receiptData) {
        var receipts;

        // fetching message
        Peerio.SqlQueries.getMessageById(receiptData.messageId)
            .then(res => {
                // message found?
                if (res.rows.length !== 1) return Promise.reject('Message id ' + receiptData.messageId + ' not found');
                // do we maybe already have this receipt?
                receipts = JSON.parse(res.rows.item(0).receipts) || [];
                if (receipts.indexOf(receiptData.username) >= 0) return Promise.reject('Receipt already exists.');
                // adding receipt
                receipts.push(receiptData.username);
            })
            .then(() => Peerio.Crypto.decryptReceipt(receiptData.username, receiptData.encrypted_receipt))
            .then(decrypted => Peerio.SqlQueries.updateReceipts(receiptData.seqID, receipts, receiptData.messageId, decrypted))
            .catch(err => L.error('Failed to add receipt. {0}. {1}.', err, receiptData));
    };


})();