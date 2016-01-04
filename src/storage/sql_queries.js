/**
 * Sql queries wrapper
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    var api = Peerio.SqlQueries = {};

    /**
     * Returns maximum sequence id that we have in local database
     * @returns {Promise<Number>}
     */
    api.getMaxSeqID = function () {
        return Peerio.SqlDB.user.executeSql('SELECT MAX((SELECT MAX(seqID) from conversations), (SELECT MAX(seqID) from messages), (SELECT MAX(lastReceiptSeqID) from messages)) as maxid')
            .then(res => {
                return res.rows.item(0).maxid || 0;
            });
    };


    api.createConversation = function (id, seqID, originalMsgID, participants,
                                       exParticipants, lastTimestamp) {

        return Peerio.SqlDB.user.executeSql(
            'INSERT OR IGNORE INTO conversations VALUES(?,?,?,?,?,?,?,?,?,?)',
            [id, seqID, originalMsgID, null, null, serializeArray(participants),
                serializeArray(exParticipants), lastTimestamp, 0, null]
        );
    };

    api.updateConversationParticipants = function (id, seqID, participants, exParticipants) {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE conversations  SET  seqID=?, participants=?, exParticipants=? WHERE id=?',
            [seqID, serializeArray(participants), serializeArray(exParticipants), id]
        );
    };

    api.updateConversationSubject = function (subject, messageId) {
        return Peerio.SqlDB.user.executeSql('UPDATE conversations SET subject = ? WHERE subject is null and originalMsgID = ?', [subject, messageId]);
    };

    api.deleteConversation = function (id) {
        return Promise.all([
            Peerio.SqlDB.user.executeSql('DELETE FROM conversations WHERE id=?', [id]),
            Peerio.SqlDB.user.executeSql('DELETE FROM messages WHERE conversationID=?', [id])
        ]);
    };


    api.createMessage = function (id, seqID, conversationID, sender, timestamp, body, files,
                                  receiptSecret, receipts, receiptSent, unread) {
        return Peerio.SqlDB.user.executeSql(
            'INSERT OR IGNORE INTO messages VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
            [id, seqID, 0, conversationID, sender, timestamp, body || '', serializeArray(files),
                receiptSecret || null, serializeArray(receipts), receiptSent ? 1 : 0, unread ? 1 : 0]
        );
    };

    api.getMessageById = function (messageID) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM messages WHERE id=?', [messageID]);
    };

    api.updateReceipts = function (seqID, receipts, messageId, receipt) {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE messages SET lastReceiptSeqID=?, receipts=? WHERE id=? and receiptSecret = ?',
            [seqID, serializeArray(receipts), messageId, receipt || null]
        );
    };

    api.updateConversationsLastTimestamp = function () {
        return Peerio.SqlDB.user.executeSql('UPDATE conversations SET lastTimestamp = (SELECT timestamp FROM messages WHERE conversationID=conversations.id ORDER BY seqID DESC LIMIT 1),'
            + ' seqID = (SELECT seqID FROM messages WHERE conversationID=conversations.id ORDER BY seqID DESC LIMIT 1)');
    };

    api.setConversationsCreatedTimestamp = function () {
        return Peerio.SqlDB.user.executeSql('UPDATE conversations SET createdTimestamp = (SELECT timestamp FROM messages WHERE conversationID=conversations.id ORDER BY seqID ASC LIMIT 1) WHERE createdTimestamp IS NULL');
    };

    api.updateConversationsUnread = function () {
        return Peerio.SqlDB.user.executeSql('UPDATE conversations SET unread = (SELECT count(*) FROM messages WHERE conversationID=conversations.id AND unread=1)');
    };

    api.updateConversationsHasFiles = function () {
        return Peerio.SqlDB.user.executeSql('UPDATE conversations SET hasFiles = EXISTS (SELECT * FROM messages WHERE conversationID=conversations.id AND files IS NOT NULL LIMIT 1) WHERE hasFiles IS NULL ');
    };

    api.getAllConversations = function () {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM conversations ORDER BY lastTimestamp DESC');
    };

    api.getConversationsRange = function (fromSeqID, toSeqID) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM conversations WHERE seqID>=? and seqID<=? ORDER BY seqID DESC', [fromSeqID, toSeqID]);
    };

    api.getNextConversationsPage = function (lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM conversations WHERE seqID<? ORDER BY seqID DESC LIMIT ?', [lastSeqID, pageSize]);
    };

    api.getPrevConversationsPage = function (lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM conversations WHERE seqID>? ORDER BY seqID ASC LIMIT ?', [lastSeqID, pageSize]);
    };

    api.getNextMessagesPage = function (conversationId, lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM messages WHERE conversationID=? AND seqID<? ORDER BY seqID DESC LIMIT ?', [conversationId, lastSeqID, pageSize]);
    };

    api.getPrevMessagesPage = function (conversationId, lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM messages WHERE conversationID=? AND seqID>? ORDER BY seqID ASC LIMIT ?', [conversationId, lastSeqID, pageSize]);
    };

    api.getMessagesRange = function (conversationId, fromSeqID, toSeqID) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM messages WHERE conversationID=? AND seqID>=? and seqID<=? ORDER BY seqID ASC', [conversationId, fromSeqID, toSeqID]);
    };

    api.getConversation = function (id) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM conversations WHERE id=? LIMIT 1', [id]);
    };

    api.getConversationFiles = function (id) {
        return Peerio.SqlDB.user.executeSql('SELECT files FROM messages WHERE files IS NOT NULL AND conversationID=?', [id]);
    };

    api.getMessages = function (conversationId) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM messages WHERE conversationID=? ORDER BY timestamp ASC', [conversationId]);
    };

    api.getConversationMessageCount = function (conversationId) {
        return Peerio.SqlDB.user.executeSql('SELECT count(*) AS msgCount FROM messages WHERE conversationID=?', [conversationId]);
    };

    //-- TINY DB -------------------------------------------------------------------------------------------------------
    api.checkSystemDB = function () {
        return Peerio.SqlDB.system.executeSql('SELECT count(*) as valueCount FROM system_values')
            .then((res) => {
                return res && res.rows.length ? res.rows.item(0)['valueCount'] : Promise.reject();
            });
    };

    api.getSystemValue = function (key) {
        return Peerio.SqlDB.system.executeSql('SELECT value FROM system_values WHERE key=?', [key])
            .then((res) => {
                return res && res.rows.length ? JSON.parse(res.rows.item(0)['value']) : null;
            });
    };

    api.setSystemValue = function (key, value) {
        return Peerio.SqlDB.system.executeSql(
            'INSERT OR REPLACE INTO system_values(key, value) VALUES(?, ?)', [key, value]
        );
    };

    api.removeSystemValue = function (key) {
        return Peerio.SqlDB.system.executeSql('DELETE FROM system_values WHERE key=?', [key]);
    };

    api.dropSystemTables = function () {
        return Peerio.SqlDB.system.executeSql('DROP TABLE system_values')
            .catch(()=> {
            });
    };

    // WARNING: Never ever change this, unless you are explicitly dropping/migrating system db in a new release
    api.createSystemTables = function () {
        return Peerio.SqlDB.system.executeSql(
            'CREATE TABLE system_values(key TEXT PRIMARY KEY, value TEXT) WITHOUT ROWID'
        );
    };

    //-- Utilities -----------------------------------------------------------------------------------------------------
    function serializeArray(arr) {
        return arr && arr.length ? JSON.stringify(arr) : null;
    }


})();
