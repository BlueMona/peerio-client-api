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
        return Peerio.SqlDB.user.executeSql(
            'SELECT MAX((SELECT MAX(seqID) from conversations), (SELECT MAX(seqID) from messages)) as maxid')
            .then(res => {
                return res.rows.item(0).maxid || 0;
            });
    };

    //-- CONVERSATIONS WRITE -------------------------------------------------------------------------------------------
    api.createConversation = function (id, seqID, originalMsgID, participants, exParticipants, lastTimestamp) {
        return Peerio.SqlDB.user.executeSql(
            'INSERT OR IGNORE INTO conversations VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
            [
                id,
                seqID,
                originalMsgID,
                originalMsgID,
                null,
                null,
                null,
                serializeArray(participants),
                serializeObject(exParticipants),
                lastTimestamp,
                null,
                null
            ]);
    };

    api.updateConversationParticipants = function (id, seqID, participants, exParticipants) {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE conversations SET seqID=?, participants=?, exParticipants=? WHERE id=?',
            [
                seqID,
                serializeArray(participants),
                serializeArray(exParticipants),
                id
            ]);
    };

    api.updateConversationFromFirstMsg = function (messageID, subject, secretConversationID) {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE conversations SET subject = ?, secretConversationID = ? WHERE subject is null and originalMsgID = ?',
            [subject, secretConversationID, messageID]
        );
    };

    api.updateConversationLastMsgID = function (conversationID, messageID) {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE conversations SET lastMsgID = ? where id = ?',
            [messageID, conversationID]
        );
    };

    // TODO: transaction
    api.deleteConversation = function (id) {
        return Promise.all([
            Peerio.SqlDB.user.executeSql('DELETE FROM conversations WHERE id=?', [id]),
            Peerio.SqlDB.user.executeSql('DELETE FROM messages WHERE conversationID=?', [id])
        ]);
    };

    // TODO: this query is too heavy
    api.updateConversationsLastTimestamp = function () {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE conversations SET ' +
            'lastTimestamp = (SELECT MAX(timestamp) FROM messages WHERE conversationID=conversations.id), ' +
            'seqID = (SELECT MAX(seqID) FROM messages WHERE conversationID=conversations.id)'
        );
    };

    // TODO: this query is too heavy
    api.updateConversationsRead = function (username) {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE conversations SET ' +
            'unread = seqID > coalesce((SELECT pos.seqID FROM read_positions AS pos WHERE pos.conversationID=id AND pos.username=?), 0)',
            [username]
        );
    };

    api.setConversationsCreatedTimestamp = function () {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE conversations SET ' +
            'createdTimestamp = (SELECT MIN(timestamp) FROM messages WHERE conversationID=conversations.id) ' +
            'WHERE createdTimestamp IS NULL'
        );
    };

    api.updateConversationsHasFiles = function () {
        return Peerio.SqlDB.user.executeSql(
            'UPDATE conversations SET ' +
            'hasFiles = EXISTS (SELECT * FROM messages WHERE conversationID=conversations.id AND files IS NOT NULL LIMIT 1) ' +
            'WHERE hasFiles IS NULL'
        );
    };

    //-- READ POSITION -------------------------------------------------------------------------------------------------
    api.updateReadPosition = function (conversationID, username, seqID) {
        // first trying to update an existing record (only in case if seqID is > then when already have)
        return Peerio.SqlDB.user.executeSql(
            'UPDATE read_positions SET seqID = ? WHERE conversationID = ? AND username = ? AND seqID < ?',
            [seqID, conversationID, username, seqID]
        ).then(res=> {
            // in case it was updated, all is good
            if (res.rowsAffected > 0) return;
            // nothing was updated, this could mean 2 things
            // 1. (username; conversationID) pair does not exist
            // 2. seqID passed was <= existing one
            // to fix (1) we gonna make INSERT, to cover (2) and potential race condition we gonna IGNORE PK conflict on insert
            return Peerio.SqlDB.user.executeSql(
                'INSERT OR IGNORE INTO read_positions VALUES (?,?,?)',
                [conversationID, username, seqID]
            );
        });
    };

    /**
     * Gets read positions for conversation
     * @param conversationID
     * @returns {Promise<{username:seqID}>}
     */
    api.getReadPositions = function (conversationID) {
        return Peerio.SqlDB.user.executeSql('SELECT username, seqID FROM read_positions WHERE conversationID = ?', [conversationID])
            .then(res => {
                var ret = {};
                for (var i = 0; i < res.rows.length; i++) {
                    ret[res.rows.item(i).username] = res.rows.item(i).seqID;
                }

                return ret;
            });
    };

    //-- CONVERSATIONS READ --------------------------------------------------------------------------------------------

    api.getConversationsSecurityInfo = function () {
        return Peerio.SqlDB.user.executeSql(
            'select c.id, mFirst.id as msgID, c.secretConversationID, mLast.innerIndex as innerIndex, mLast.timestamp as timestamp ' +
            'from conversations c ' +
            'left join messages mFirst on c.originalMsgID = mFirst.id ' +
            'left join messages mLast on c.lastMsgID = mLast.id '
        ).then(res => {
            var ret = {};
            for (var i = 0; i < res.rows.length; i++) {
                var item = res.rows.item(i);
                ret[item.id] = item;
                item.empty = item.msgID == null; // conversation does not have messages (in our cache)
                item.innerIndex = item.innerIndex || 0;
                item.timestamp = item.timestamp || 0;
                // freeing memory
                item.id = undefined;
                item.msgID = undefined;
            }
            return ret;
        });
    };
    api.getConversationsRange = function (fromSeqID, toSeqID) {
        return Peerio.SqlDB.user.executeSql(
            'SELECT * FROM conversations WHERE seqID>=? and seqID<=? ORDER BY seqID DESC',
            [fromSeqID, toSeqID]
        );
    };

    api.getNextConversationsPage = function (lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql(
            'SELECT * FROM conversations WHERE seqID<? ORDER BY seqID DESC  LIMIT ?',
            [lastSeqID, pageSize]
        );
    };

    api.getPrevConversationsPage = function (lastSeqID, pageSize) {
        return Peerio.SqlDB.user.executeSql(
            'SELECT * FROM conversations WHERE seqID>? ORDER BY seqID ASC  LIMIT ?',
            [lastSeqID, pageSize]
        );
    };

    api.getConversation = function (conversationID) {
        return Peerio.SqlDB.user.executeSql(
            'SELECT * FROM conversations WHERE id=? LIMIT 1',
            [conversationID]
        );
    };

    api.getConversationFiles = function (conversationID) {
        return Peerio.SqlDB.user.executeSql(
            'SELECT files FROM messages WHERE files IS NOT NULL AND conversationID=?',
            [conversationID]
        );
    };

    api.getConversationMessageCount = function (conversationID) {
        return Peerio.SqlDB.user.executeSql('SELECT count(*) AS msgCount FROM messages WHERE conversationID=?', [conversationID]);
    };

    api.getConversationsUnreadState = function () {
        return Peerio.SqlDB.user.executeSql('SELECT EXISTS(SELECT * FROM conversations WHERE unread=1) AS unread')
            .then(res=>!!res.rows.item(0).unread);
    };


    //-- MESSAGES WRITE -------------------------------------------------------------------------------------------------
    api.createMessage = function (id, seqID, index, conversationID, sender, timestamp, body, files, receipt) {
        return Peerio.SqlDB.user.executeSql(
            'INSERT OR IGNORE INTO messages VALUES(?,?,?,?,?,?,?,?,?)',
            [
                id,
                seqID,
                is.number(index) ? index : null,
                conversationID,
                sender,
                timestamp,
                body || '',
                serializeArray(files),
                receipt
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

    api.getReceipts = function (conversationID, fromSeqID, toSeqID, username) {
        return Peerio.SqlDB.user.executeSql(
            'SELECT id, receipt, sender FROM messages WHERE conversationID=? AND seqID>=? AND seqID<=? AND sender!=? ORDER BY seqID ASC',
            [
                conversationID,
                fromSeqID,
                toSeqID,
                username
            ]);
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
            'INSERT OR REPLACE INTO system_values(key, value) VALUES(?, ?)', [key, JSON.stringify(value)]
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

    function serializeObject(obj) {
        return obj && Object.keys(obj).length ? JSON.stringify(obj) : null;
    }

})();
