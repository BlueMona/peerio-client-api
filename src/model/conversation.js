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

    function loadLocalData(data){
        _.assign(this, data);
        this.participants = JSON.parse(this.participants)||[];
        this.exParticipants = JSON.parse(this.exParticipants) ||[];
        return this;
    }

    /**
     * Builds computed properties that exist only in runtime
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
            loadLocalData: loadLocalData,
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

    Peerio.Conversation.fromLocalData = function (data) {
        return Peerio.Conversation()
            .loadLocalData(data)
            .buildProperties();
    };

    Peerio.Conversation.deleteFromCache = function (id) {
        return Peerio.SqlQueries.deleteConversation(id);
    }

})();