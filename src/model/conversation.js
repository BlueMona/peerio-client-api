/**
 * Conversation model
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    /**
     * Fills/replaces current Conversation object properties with data sent by server.
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
        this.lastTimestamp = data.lastTimestamp;
        this.participants = data.participants; //todo: CHECK FOR MATCH when original message arrives
        if (data.events) {
            this.exParticipants = [];
            data.events.forEach(event => {
                if (event.type !== 'remove') return;
                this.exParticipants.push({u: event.participant, t: event.timestamp});
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
        this.exParticipants = JSON.parse(this.exParticipants) || [];
        this.readState = JSON.parse(this.readState) || {};
        return this;
    }

    /**
     * Builds computed properties that exist only in RAM
     * @returns {Peerio.Conversation} - this
     */
    function buildProperties() {
        this.lastMoment = moment(this.lastTimestamp);
        this.createdMoment = moment(this.createdTimestamp);
        this.exParticipants.forEach((p)=> {
            p.moment = moment(p.t);
        });

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
        return Peerio.SqlQueries.getConversation(this.id)
            .then(res => {
                this.applyLocalData(res.rows.item(0));
                this.buildProperties(this);
                return this;
            });
    }

    function updateReadState(seqID, usernames) {
        if (!is.array(usernames)) usernames = [usernames];
        var dirty = false;
        usernames.forEach(user => {
            if (!this.readState.hasOwnProperty(user)) {
                this.readState[user] = seqID;
                dirty = true;
                return;
            }
            if(this.readState[user].seqID>= seqID) return;
            this.readState[user].seqID = seqID;

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
        if (recipients.indexOf(Peerio.user.username) < 0)
            recipients.push(Peerio.user.username);

        return Peerio.Message.encrypt(recipients, typeof(subject) === 'undefined' ? '' : subject, body, fileIDs)
            .then(encrypted => {
                if (!encrypted.header || !encrypted.body) return Promise.reject('Message encryption failed.');
                var ret = {
                    recipients: recipients,
                    header: encrypted.header,
                    body: encrypted.body,
                    isDraft: false
                };
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
            });
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
            applyServerData: applyServerData,
            applyLocalData: applyLocalData,
            insert: insert,
            updateParticipants: updateParticipants,
            updateReadState: updateReadState,
            reply: reply,
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
