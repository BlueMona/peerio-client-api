/**
 * Messages-specific sql
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    var api = Peerio.SqlQueries = Peerio.SqlQueries || {};

    //-- MESSAGES WRITE -------------------------------------------------------------------------------------------------
    api.createMessage = function (id, seqID, index, conversationID, sender, timestamp, body, files) {
        return Peerio.SqlDB.user.executeSql(
            'INSERT OR IGNORE INTO messages VALUES(?,?,?,?,?,?,?,?)',
            [
                id,
                seqID,
                is.number(index) ? index : null,
                conversationID,
                sender,
                timestamp,
                body || '',
                api.serializeArray(files)
            ]);
    };

    //-- MESSAGES READ -------------------------------------------------------------------------------------------------
    api.getMessageByID = function (messageID) {
        return Peerio.SqlDB.user.executeSql(
            'SELECT * FROM messages WHERE id=?',
            [messageID]
        );
    };

    api.getNextMessagesPage = function (conversationID, lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql(
            'SELECT * FROM messages WHERE conversationID=? AND seqID<? ORDER BY seqID DESC LIMIT ?',
            [
                conversationID,
                lastSeqID,
                pageSize
            ]);
    };

    api.getPrevMessagesPage = function (conversationID, lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql(
            'SELECT * FROM messages WHERE conversationID=? AND seqID>? ORDER BY seqID ASC LIMIT ?',
            [
                conversationID,
                lastSeqID,
                pageSize
            ]);
    };

    api.getMessagesRange = function (conversationID, fromSeqID, toSeqID) {
        return Peerio.SqlDB.user.executeSql(
            'SELECT * FROM messages WHERE conversationID=? AND seqID>=? and seqID<=? ORDER BY seqID ASC',
            [
                conversationID,
                fromSeqID,
                toSeqID
            ]);
    };

    api.getUnreceiptedMessages = function (conversationID, fromSeqID, toSeqID, username) {
        return Peerio.SqlDB.user.executeSql(
            'SELECT id FROM messages WHERE conversationID=? AND seqID>=? AND seqID<=? AND sender!=? ORDER BY seqID ASC',
            [
                conversationID,
                fromSeqID,
                toSeqID,
                username
            ]);
    };

})();
