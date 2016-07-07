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
        this.outerTimestamp = data.timestamp;
        this.outerIndex = data.outerIndex;
        this.metadataVersion = data.version;
        this.isGhost = !!data.isGhost ? 1 : 0;

        return Peerio.Crypto.decryptMessage(data)
            .then(decrypted => {
                this.files = decrypted.fileIDs;
                this.body = this.isGhost ? JSON.stringify({
                    id: decrypted.id,
                    recipient: decrypted.recipient,
                    subject: decrypted.subject,
                    message: decrypted.message,
                    files: decrypted.files,
                    timestamp: decrypted.timestamp,
                    passphrase: decrypted.passphrase,
                    lifeSpanInSeconds: decrypted.lifeSpanInSeconds 
                }) : decrypted.message;
                this.subject = decrypted.subject;
                this.receipts = decrypted.receipts;
                this.innerIndex = decrypted.innerIndex;
                this.sequence = decrypted.sequence;
                // Id => ID, yeah, fml, too late now
                // Id - normal
                // ID - some old, mostly staging messages, only affects our internal accounts, safe to remove sometimes soon
                this.secretConversationID = decrypted.secretConversationId || decrypted.secretConversationID;
                this.timestamp = decrypted.timestamp || this.outerTimestamp;
                this.encryptedMetadataVersion = decrypted.metadataVersion;
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
            this.innerIndex,
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
            buildProperties: buildProperties
        };

        return obj;
    };

    Peerio.Message.encrypt = function (recipients, subject, body, fileIDs, index, secretConversationID) {
        var message = {
            version: '1.1.0',
            metadataVersion: '1.1.0',
            // prod desktop uses 'Id' already, so...
            secretConversationId: secretConversationID,
            innerIndex: index,
            message: body,
            receipt: 'deprecated',
            fileIDs: fileIDs || [],
            participants: recipients,
            timestamp: Date.now()

        };
        if (subject !== null) message.subject = subject;
        return Peerio.Crypto.encryptMessage(message, recipients);
    };


})();
