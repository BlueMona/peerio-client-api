/**
 * Conversation model
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    /**
     * Fills/replaces current Conversation object properties with data sent by server.
     * @param data - conversation data in server format
     * @returns {Object} - this
     */
    function loadServerData(data) {
        if (!data) {
            L.error('loadServerData: can\'t load from undefined object');
            return this;
        }

        this.seqID = data.seqID;
        this.id = data.id;
        this.originalMsgID = data.original;
        this.lastTimestamp = data.lastTimestamp;
        this.fileCount = data.fileCount; // todo: probably should not rely on server
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
     * Builds computed properties that exist only in runtime
     */
    function buildProperties() {
        this.lastMoment = moment(this.lastTimestamp);
        this.exParticipants.forEach((p)=> {
            p.moment = moment(p.t);
        });
        return this;
    }

    /**
     * Saves object to database(ignores if exists)
     */
    function insert() {
        return Peerio.SqlQueries.createConversation(
            this.id,
            this.seqID,
            this.originalMsgID,
            this.subject,
            this.createdTimestamp,
            this.participants,
            this.exParticipants,
            this.lastTimestamp,
            this.unread);
    }

    function updateParticipants() {
        return Peerio.SqlQueries.updateConversationParticipants(
            this.id,
            this.seqID,
            this.participants,
            this.exParticipants,
            this.lastTimestamp
        );
    }


    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    /**
     * Call Peerio.Conversation() to create empty conversation object
     * @returns {Conversation}
     */
    Peerio.Conversation = function (id) {
        var obj = {
            loadServerData: loadServerData,
            buildProperties: buildProperties,
            insert: insert,
            updateParticipants: updateParticipants
        };
        if (id) obj.id = id;
        obj.self = obj;

        return obj;
    };
    /**
     * Call to create and fully build Conversation instance from server data
     * @param {Object} data
     * @returns {Promise<Conversation>}
     */
    Peerio.Conversation.fromServerData = function (data) {
        return Peerio.Conversation()
            .loadServerData(data);
    };

    Peerio.Conversation.deleteFromCache = function (id) {
        return Peerio.SqlQueries.deleteConversation(id);
    }

})();