/**
 * Sql queries wrapper
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    Peerio.SqlQueries = {
        getMaxSeqID: getMaxSeqID,
        conversationExists: conversationExists,
        createConversation: createConversation,
        updateConversationParticipants: updateConversationParticipants,
        deleteConversation: deleteConversation,
        createMessage: createMessage,
        getMessageById: getMessageById,
        updateReceipts: updateReceipts

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
                                exParticipants, lastTimestamp, unread) {

        return Peerio.SqlDB.user.executeSql(
            'INSERT OR IGNORE INTO conversations VALUES(?,?,?,?,?,?,?,?,?)',
            [id, seqID, originalMsgID, subject, createdTimestamp, JSON.stringify(participants),
                JSON.stringify(exParticipants), lastTimestamp, unread]
        );
    }

    function updateConversationParticipants(id, seqID, participants, exParticipants, lastTimestamp) {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE conversations  SET  seqID=?, participants=?, exParticipants=?, lastTimestamp=? WHERE id=?',
            [seqID, JSON.stringify(participants), JSON.stringify(exParticipants), lastTimestamp, id]
        );
    }

    function deleteConversation(id) {
        return Promise.all([
            Peerio.SqlDB.user.executeSql('DELETE FROM conversations WHERE id=?', [id]),
            Peerio.SqlDB.user.executeSql('DELETE FROM messages WHERE conversationID=?', [id])
        ]);
    }


    function createMessage(id, seqID, conversationID, sender, timestamp, body, attachments,
                           receiptSecret, receipts, receiptSent, unread) {
        return Peerio.SqlDB.user.executeSql(
            'INSERT OR IGNORE INTO messages VALUES(?,?,?,?,?,?,?,?,?,?,?)',
            [id, seqID, conversationID, sender, timestamp, body, JSON.stringify(attachments), receiptSecret, JSON.stringify(receipts), receiptSent, unread]
        );
    }

    function getMessageById(messageID) {
        return Peerio.SqlDB.user.executeSql('SELECT * FROM messages WHERE id=?', [messageID]);
    }

    function updateReceipts(seqID, receipts, messageId, receipt) {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE messages SET seqID=?, receipts=? WHERE messageID=? and receiptSecret = ?',
            [seqID, JSON.stringify(receipts), messageId, receipt]
        );
    }


})();
