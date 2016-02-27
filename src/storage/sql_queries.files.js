/**
 * Files sql queries
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    var api = Peerio.SqlQueries = Peerio.SqlQueries || {};

    //-- READ ----------------------------------------------------------------------------------------------------------
    api.getFiles = function () {
        return Peerio.SqlDB.user.executeSql(
            'SELECT * FROM files ORDER BY timestamp DESC')
            .then(res => {
                var files = [];
                for (var i = 0; i < res.rows.length; i++) {
                    files.push(res.rows.item(i));
                }
                return files;
            });
    };
    api.getAllFilesShortIDs = function(){
        return Peerio.SqlDB.user.executeSql(
            'SELECT shortID FROM files')
            .then(res => {
                var IDs = [];
                for (var i = 0; i < res.rows.length; i++) {
                    IDs.push(res.rows.item(i).shortID);
                }
                return IDs;
            });
    };
    //-- WRITE ----------------------------------------------------------------------------------------------------------
    api.createOrUpdateFile = function (id, shortID, header, name, creator, sender, timestamp, size) {
        return Peerio.SqlDB.user.executeSql(
            'REPLACE INTO files VALUES(?,?,?,?,?,?,?,?)',
            [
                id,
                shortID,
                header,
                name,
                api.prepareString(creator),
                api.prepareString(sender),
                timestamp,
                size
            ]
        );
    };

    api.deleteFile = function (id) {
        return Peerio.SqlDB.user.executeSql(
            'DELETE FROM files WHERE id=?', [id]);
    };

    api.deleteFileByShortID = function (id) {
        return Peerio.SqlDB.user.executeSql(
            'DELETE FROM files WHERE shortID=?', [id]);
    };


})();
