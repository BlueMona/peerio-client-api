/**
 * Sql queries wrapper
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    Peerio.SqlQueries = {
        getMaxSeqID: getMaxSeqID,
        conversationExists: conversationExists
    };

    /**
     * Returns maximum sequence id that we have in local database
     * @returns {Promise<Number>}
     */
    function getMaxSeqID() {
        return Peerio.SqlDB.user.executeSql('SELECT MAX((SELECT MAX(seqID) from conversations),(SELECT MAX(seqID) from messages)) as maxid')
            .then(res => {
                return res.rows.item(0).maxid || 0;
            });
    }

    /**
     * Checks if conversation exists in local database
     * @param {string} id - conversation ID
     * @returns {Promise<Boolean>}
     */
    function conversationExists(id) {
        return Peerio.SqlDB.user.executeSql('SELECT (SELECT COUNT(*) FROM conversations WHERE id==?) == 1 as res', [id])
            .then(res => !!res.rows.item(0).res);
    }


    function createConversation(id, seqID, originalMsgID, subject, createdTimestamp, participants,
                                exParticipants, events, lastTimestamp, fileCount, msgCount, unread) {

        return Peerio.SqlDB.user.executeSql(
            'INSERT INTO conversations VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
            [id, seqID, originalMsgID, subject, createdTimestamp, participants,
                exParticipants, events, lastTimestamp, fileCount, msgCount, unread]
        );
    }

    function createMessage(){

    }


})();
