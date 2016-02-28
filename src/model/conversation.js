/**
 * Conversation model
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    /**
     * Fills/replaces current Conversation object properties with data sent by server.
     * This function prepares object for saving and may lack properties required for rendering in UI
     * @param data - conversation data in server format
     * @returns {Peerio.Conversation} - this
     */
    function applyServerData(data) {
        if (!data) {
            L.error('applyServerData: can\'t load from undefined object');
            return this;
        }

        this.seqID = data.seqID;
        this.id = data.id;
        this.originalMsgID = data.original;
        this.version = data.version || '1.0.0';
        this.lastTimestamp = data.lastTimestamp;
        this.participants = _.pull(data.participants, Peerio.user.username);
        if (data.events) {
            this.exParticipants = {};
            data.events.forEach(event => {
                if (event.type !== 'remove') return;
                this.exParticipants[event.participant] = event.timestamp;
            });
        }

        return this;
    }

    /**
     * Fills/replaces current Conversation object properties with data sent by server.
     * @param data - conversation data in server format
     * @returns {Peerio.Conversation} - this
     */
    function applyLocalData(data) {
        _.assign(this, data);
        this.participants = JSON.parse(this.participants) || [];
        this.exParticipants = JSON.parse(this.exParticipants) || {};
        return this;
    }

    /**
     * Builds computed properties that exist only in RAM
     * @returns {Peerio.Conversation} - this
     */
    function buildProperties() {
        this.lastMoment = moment(this.lastTimestamp);
        this.createdMoment = moment(this.createdTimestamp);
        this.exParticipantsArr = [];
        for (var username in this.exParticipants) {
            this.exParticipants[username] = moment(this.exParticipants[username]);
            this.exParticipantsArr.push(username);
        }

        return this;
    }

    /**
     * Saves object to database(ignores if exists)
     * @returns <Promise<SQLResultSet>>
     */
    function insert() {
        return Peerio.SqlQueries.createConversation(
            this.id,
            this.seqID,
            this.originalMsgID,
            this.participants,
            this.exParticipants,
            this.lastTimestamp);
    }

    /**
     * Updates participants and exParticipants lists in existing db object
     * @returns {Promise<SQLResultSet>}
     */
    function updateParticipants() {
        return Peerio.SqlQueries.updateConversationParticipants(
            this.id,
            this.seqID,
            this.participants,
            this.exParticipants
        );
    }

    var emptyArr = [];

    /**
     * Loads file id array from all messages in ths conversation
     * @returns {Promise<this>}
     */
    function loadFileIDs() {
        return Peerio.SqlQueries.getConversationFiles(this.id)
            .then(res=> {
                res = res.rows;
                var ids = [];

                for (var i = 0; i < res.length; i++) {
                    (JSON.parse(res.item(i).files) || emptyArr).forEach(id => ids.push(id));
                }
                this.fileIDs = _.uniq(ids);
            })
            .return(this);
    }

    /**
     * Loads message count for this conversation from db
     * @returns {Promise<this>}
     */
    function loadMessageCount() {
        return Peerio.SqlQueries.getConversationMessageCount(this.id)
            .then(res => this.messageCount = res.rows.item(0).msgCount)
            .return(this);
    }

    /**
     * Loads object from db and builds runtime properties
     * @returns {Promise<this>}
     */
    function load() {
        var p = Peerio.SqlQueries.getConversation(this.id)
            .then(res => {
                this.applyLocalData(res.rows.item(0));
                this.buildProperties(this);
            });

        return Promise.all([p, this.loadReadPositions()]).return(this);
    }

    function loadReadPositions() {
        return Peerio.SqlQueries.getReadPositions(this.id)
            .then(positions => {
                this.readPositions = positions;
            });
    }


    /**
     * Loads extended object properties
     * @returns {Promise<this>}
     */
    function loadStats() {
        return Promise.all([this.loadMessageCount(), this.loadFileIDs(this)])
            .return(this);
    }

    function reply(recipients, body, fileIDs, subject) {
        recipients = recipients.splice();
        if (recipients.indexOf(Peerio.user.username) < 0)
            recipients.push(Peerio.user.username);

        var index, secretConversationID;
        if (this.id) {
            var sec = Peerio.Sync.securityCache[this.id];
            if (!sec) return Promise.reject('Conversation not found in security cache.');
            index = sec.innerIndex || 0;//might be changed while encrypting
            secretConversationID = sec.secretConversationID || uuid.v4();
        } else {
            index = 0;
            secretConversationID = uuid.v4();
        }

        var failed = null;

        return Peerio.Message.encrypt(recipients, typeof(subject) === 'undefined' ? '' : subject, body, fileIDs, index, secretConversationID)
            .then(encrypted => {
                if (!encrypted.header || !encrypted.body) return Promise.reject('Message encryption failed.');
                var ret = {
                    version: '1.1.0',
                    outerIndex: index,
                    timestamp: Date.now(),
                    recipients: recipients,
                    header: encrypted.header,
                    body: encrypted.body,
                    isDraft: false
                };
                failed = encrypted.failed;
                if (this.id) ret.conversationID = this.id;
                return ret;
            })
            // re-encrypting file headers (sharing files)
            .then(function (messageDTO) {
                return buildFileHeaders(recipients, fileIDs)
                    .then(function (fileHeaders) {
                        messageDTO.files = fileHeaders;
                        return messageDTO;
                    });
            })
            .then(function (messageDTO) {
                return Peerio.Net.createMessage(messageDTO);
            })
            .then(result => {
                result.failed = failed;
                return result;
            });
    }

    //todo: queue calls
    var markingUpTo = null;

    function markAsRead(endSeqID) {
        if (!this.readPositions || !endSeqID) return;
        if (markingUpTo === endSeqID) return;

        var startSeqID = this.readPositions[Peerio.user.username];
        if (!is.number(startSeqID)) startSeqID = 0;
        if (startSeqID >= endSeqID) return;

        markingUpTo = endSeqID;

        return Peerio.SqlQueries.getUnreceiptedMessages(this.id, startSeqID + 1, endSeqID, Peerio.user.username)
            .then(res => {
                var toSend = [];
                for (var i = 0; i < res.rows.length; i++) {
                        var msg = res.rows.item(i);
                        toSend.push({id: msg.id, encryptedReturnReceipt: 'deprecated'});
                }
                return toSend;
            })
            .then(function (toSend) {
                if (!toSend.length) return;
                return Peerio.Net.readMessages(toSend);
            })
            .finally(()=> {
                markingUpTo = null;
            })

    }

    function buildFileHeaders(recipients, fileIDs) {
        return Promise.map(fileIDs, function (id) {
            var file = Peerio.user.files.dict[id];
            if (!file) {
                L.error("File id {0} not found in local cache. Cant build headers for it.", id);
                return;
            }
            return file.generateHeader(recipients, id)
                .then(function (header) {
                    return {id: id, header: header};
                });

        }, Peerio.Crypto.recommendedConcurrency);
    }


    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    /**
     * Call Peerio.Conversation() to create empty conversation object
     * @param {string} [id] - for future operations
     * @returns {Conversation}
     */
    Peerio.Conversation = function (id) {
        var obj = {
            id: id,
            load: load,
            loadStats: loadStats,
            loadReadPositions: loadReadPositions,
            applyServerData: applyServerData,
            applyLocalData: applyLocalData,
            insert: insert,
            updateParticipants: updateParticipants,
            reply: reply,
            markAsRead: markAsRead,
            //--
            buildProperties: buildProperties,
            loadMessageCount: loadMessageCount,
            loadFileIDs: loadFileIDs
        };

        return obj;
    };


    /**
     * Deletes conversation and all it's messages from local db
     * @param {string} id - conversation id
     * @returns {Promise<SQLResultSet>}
     */
    Peerio.Conversation.deleteFromCache = function (id) {
        return Peerio.SqlQueries.deleteConversation(id);
    };

    Peerio.Conversation.getRange = function (fromSeqID, toSeqID) {
        return Peerio.SqlQueries.getConversationsRange(fromSeqID, toSeqID).then(materialize);
    };

    Peerio.Conversation.getNextPage = function (lastSeqID, pageSize) {

        return Peerio.SqlQueries.getNextConversationsPage(lastSeqID, pageSize || 10)
            .then(materialize);
    };

    Peerio.Conversation.getPrevPage = function (lastSeqID, pageSize) {

        return Peerio.SqlQueries.getPrevConversationsPage(lastSeqID, pageSize || 10)
            .then(materialize);
    };

    Peerio.Conversation.getMessagesRange = function (conversationID, fromSeqID, toSeqID) {
        return Peerio.SqlQueries.getMessagesRange(conversationID, fromSeqID, toSeqID)
            .then(materializeMessages);
    };


    Peerio.Conversation.getNextMessagesPage = function (conversationID, lastSeqID, pageSize) {
        return Peerio.SqlQueries.getNextMessagesPage(conversationID, lastSeqID, pageSize || 10)
            .then(materializeMessages);
    };

    Peerio.Conversation.getPrevMessagesPage = function (conversationID, lastSeqID, pageSize) {
        return Peerio.SqlQueries.getPrevMessagesPage(conversationID, lastSeqID, pageSize || 10)
            .then(materializeMessages);
    };

    function materialize(res) {
        res = res.rows;
        var ret = [];
        for (var i = 0; i < res.length; i++) {
            ret.push(
                Peerio.Conversation()
                    .applyLocalData(res.item(i))
                    .buildProperties()
            );
        }
        return ret;
    }

    function materializeMessages(res) {
        res = res.rows;
        var ret = [];
        for (var i = 0; i < res.length; i++) {
            ret.push(
                Peerio.Message()
                    .applyLocalData(res.item(i))
                    .buildProperties()
            );
        }
        return ret;
    }


})();
