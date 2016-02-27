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

    //-- WRITE ----------------------------------------------------------------------------------------------------------
    api.createFile = function (id, shortId, header, name, creator, sender, timestamp, size) {
        return Peerio.SqlDB.user.executeSql(
            'INSERT OR IGNORE INTO files VALUES(?,?,?,?,?,?,?,?)',
            [
                id,
                shortId,
                header,
                name,
                creator,
                sender,
                timestamp,
                size]
        );
    };

    api.deleteFile = function (id) {
        return Peerio.SqlDB.user.executeSql(
            'DELETE FROM files WHERE id=?'
        );
    }


})();
