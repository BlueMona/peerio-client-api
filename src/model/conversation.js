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
        this.lastTimestamp = data.last;
        this.fileCount = data.fileCount; // todo: probably should not rely on server
        this.participants = data.participants; //todo: CHECK FOR MATCH when original message arrives
        this.events = data.events;

        return this;
    }

    /**
     * Builds computed properties
     */
    function buildProperties() {
        if(this.events){
            this.exParticipants=[];
            this.events.forEach(event => {
                if (event.type !== 'remove') return;
                this.exParticipants.push(event.participant);
            });
        }
        return Promise.resolve();
    }

    /**
     * Saves object to database (Insert only, will fail if already exists)
     */
    function insertIntoDB(){
        return Peerio.SqlQueries.createConversation(
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
/*
 'id TEXT PRIMARY KEY,' + // conversationID
 'seqID INTEGER,' +       // last sequence id for this conversation
 'originalMsgID TEXT, ' +    // messageID this conversation started with
 'subject TEXT,' +        // subject from original message
 'created INTEGER,' +     // original message timestamp
 'participants TEXT,' +   // current participants array ['username','username'] excluding current user
 'exParticipants TEXT,' + // same but for the ones who left
 'events TEXT,' +         // events object for conversation
 'lastTimestamp INTEGER,' + // timestamp of last time this conversation or messages inside it got updated
 'fileCount INTEGER,' +
 'msgCount INTEGER,' +
 'unread BOOLEAN' +
 */


    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    /**
     * Call Peerio.Conversation() to create empty conversation object
     * @returns {Conversation}
     */
    Peerio.Conversation = function (id) {
        var obj = {
        };
        if(id) obj.id = id;
        obj.self = obj;

        return obj;
    };
    /**
     * Call to create and fully build Conversation instance from server data
     * @param {Object} data
     * @returns {Promise<Conversation>}
     */
    Peerio.Conversation.create = function (data) {
        return Peerio.Conversation()
            .loadServerData(data)
            .buildProperties();
    };

})();