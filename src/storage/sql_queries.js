/**
 * Sql queries wrapper
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    Peerio.SqlQueries = {
        getMaxSeqID: getMaxSeqID,
        createConversation: createConversation,
        updateConversationParticipants: updateConversationParticipants,
        updateConversationSubject: updateConversationSubject,
        deleteConversation: deleteConversation,
        createMessage: createMessage,
        getMessageById: getMessageById,
        updateReceipts: updateReceipts,
        updateConversationsLastTimestamp: updateConversationsLastTimestamp,
        updateConversationsUnreadCount: updateConversationsUnreadCount,
        updateConversationsHasFiles: updateConversationsHasFiles,
        setConversationsCreatedTimestamp: setConversationsCreatedTimestamp,
        getAllConversations: getAllConversations,
        getConversation: getConversation,
        getMessages: getMessages,
        getConversationFiles: getConversationFiles,
        getConversationMessageCount: getConversationMessageCount,
        getNextConversationsPage: getNextConversationsPage,
        getPrevConversationsPage: getPrevConversationsPage,
        getNextMessagesPage: getNextMessagesPage,
        getPrevMessagesPage: getPrevMessagesPage
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


    function createConversation(id, seqID, originalMsgID, participants,
                                exParticipants, lastTimestamp) {

        return Peerio.SqlDB.user.executeSql(
            'INSERT OR IGNORE INTO conversations VALUES(?,?,?,?,?,?,?,?,?,?)',
            [id, seqID, originalMsgID, null, null, serializeArray(participants),
                serializeArray(exParticipants), lastTimestamp, 0, null]
        );
    }

    function updateConversationParticipants(id, seqID, participants, exParticipants) {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE conversations  SET  seqID=?, participants=?, exParticipants=? WHERE id=?',
            [seqID, serializeArray(participants), serializeArray(exParticipants), id]
        );
    }

    function updateConversationSubject(subject, messageId) {
        return Peerio.SqlDB.user.executeSql('UPDATE conversations SET subject = ? WHERE subject is null and originalMsgID = ?', [subject, messageId]);
    }

    function deleteConversation(id) {
        return Promise.all([
            Peerio.SqlDB.user.executeSql('DELETE FROM conversations WHERE id=?', [id]),
            Peerio.SqlDB.user.executeSql('DELETE FROM messages WHERE conversationID=?', [id])
        ]);
    }


    function createMessage(id, seqID, conversationID, sender, timestamp, body, files,
                           receiptSecret, receipts, receiptSent, unread) {
        return Peerio.SqlDB.user.executeSql(
            'INSERT OR IGNORE INTO messages VALUES(?,?,?,?,?,?,?,?,?,?,?)',
            [id, seqID, conversationID, sender, timestamp, body || '', serializeArray(files),
                receiptSecret || null, serializeArray(receipts), receiptSent ? 1 : 0, unread ? 1 : 0]
        );
    }

    function getMessageById(messageID) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM messages WHERE id=?', [messageID]);
    }

    function updateReceipts(seqID, receipts, messageId, receipt) {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE messages SET seqID=?, receipts=? WHERE messageID=? and receiptSecret = ?',
            [seqID, serializeArray(receipts), messageId, receipt || null]
        );
    }

    function updateConversationsLastTimestamp() {
        return Peerio.SqlDB.user.executeSql('UPDATE conversations SET lastTimestamp = (SELECT timestamp FROM messages WHERE conversationID=conversations.id ORDER BY seqID DESC LIMIT 1),'
            + ' seqID = (SELECT seqID FROM messages WHERE conversationID=conversations.id ORDER BY seqID DESC LIMIT 1)');
    }

    function setConversationsCreatedTimestamp() {
        return Peerio.SqlDB.user.executeSql('UPDATE conversations SET createdTimestamp = (SELECT timestamp FROM messages WHERE conversationID=conversations.id ORDER BY seqID ASC LIMIT 1) WHERE createdTimestamp IS NULL');
    }

    function updateConversationsUnreadCount() {
        return Peerio.SqlDB.user.executeSql('UPDATE conversations SET unreadCount = (SELECT count(*) FROM messages WHERE conversationID=conversations.id AND unread=1)');
    }

    function updateConversationsHasFiles() {
        return Peerio.SqlDB.user.executeSql('UPDATE conversations SET hasFiles = EXISTS (SELECT * FROM messages WHERE conversationID=conversations.id AND files IS NOT NULL LIMIT 1) WHERE hasFiles IS NULL ');
    }

    function getAllConversations() {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM conversations ORDER BY lastTimestamp DESC');
    }

    function getNextConversationsPage(lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM conversations WHERE seqID<? ORDER BY seqID DESC LIMIT ?', [lastSeqID, pageSize]);
    }

    function getPrevConversationsPage(lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM conversations WHERE seqID>? ORDER BY seqID ASC LIMIT ?', [lastSeqID, pageSize]);
    }

    function getNextMessagesPage(conversationId, lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM messages WHERE conversationID=? AND seqID<? ORDER BY seqID DESC LIMIT ?', [conversationId, lastSeqID, pageSize]);
    }

    function getPrevMessagesPage(conversationId, lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM messages WHERE conversationID=? AND seqID>? ORDER BY seqID ASC LIMIT ?', [conversationId, lastSeqID, pageSize]);
    }


    function getConversation(id) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM conversations WHERE id=? LIMIT 1', [id]);
    }

    function getConversationFiles(id) {
        return Peerio.SqlDB.user.executeSql('SELECT files FROM messages WHERE files IS NOT NULL AND conversationID=?', [id]);
    }

    function getMessages(conversationId) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM messages WHERE conversationID=? ORDER BY timestamp ASC', [conversationId]);
    }

    function getConversationMessageCount(conversationId) {
        return Peerio.SqlDB.user.executeSql('SELECT count(*) AS msgCount FROM messages WHERE conversationID=?', [conversationId]);
    }

    //-- Utilities
    function serializeArray(arr) {
        return arr && arr.length ? JSON.stringify(arr) : null;
    }


})();
