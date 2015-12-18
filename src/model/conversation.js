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
            this.exParticipants,
            this.lastTimestamp
        );
    }

    var emptyArr = [];

    /**
     * Loads file id array from all messages in ths conversation
     * @returns {Promise<this>}
     */
    function loadFileIds() {
        return Peerio.SqlQueries.getConversationFiles(this.id)
            .then(res=> {
                res = res.rows;
                var ids = [];

                for (var i = 0; i < res.length; i++) {
                    (JSON.parse(res.item(i).files) || emptyArr).forEach(id => ids.push(id));
                }
                this.fileIds = _.uniq(ids);
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
                this.applyLocalData(res.rows.item(0))
                this.buildProperties(this);
                return this;
            });
    }

    /**
     * Loads all messages for this conversation
     * @returns {Promise<this>}
     */
    function loadAllMessages() {
        return Peerio.SqlQueries.getMessages(this.id)
            .then(res => {
                res = res.rows;
                var ret = [];
                for (var i = 0; i < res.length; i++) {
                    ret.push(Peerio.Message().applyLocalData(res.item(i)));
                }
                this.messages = ret;
            })
            .return(this);
    }


    /**
     * Loads extended object properties
     * @returns {Promise<this>}
     */
    function loadStats() {
        return Promise.all([this.loadMessageCount(), this.loadFileIds(this)])
            .return(this);
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
            loadAllMessages: loadAllMessages,
            loadStats: loadStats,
            applyServerData: applyServerData,
            applyLocalData: applyLocalData,
            insert: insert,
            updateParticipants: updateParticipants,
            //--
            buildProperties: buildProperties,
            loadMessageCount: loadMessageCount,
            loadFileIds: loadFileIds
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

    Peerio.Conversation.getAll = function () {
        return Peerio.SqlQueries.getAllConversations()
            .then(materialize);
    };

    Peerio.Conversation.getNextPage = function (lastTimestamp) {

        return Peerio.SqlQueries.getConversationsPage(lastTimestamp, 10)
            .then(materialize);
    };

    function materialize(res) {
        res = res.rows;
        var ret = [];
        for (var i = 0; i < res.length; i++) {
            ret.push(Peerio.Conversation().applyLocalData(res.item(i)));
        }
        return ret;
    }


})();