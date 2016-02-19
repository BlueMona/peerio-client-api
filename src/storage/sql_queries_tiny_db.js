/**
 * TinyDB sql
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    var api = Peerio.SqlQueries = Peerio.SqlQueries || {};

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
            'INSERT OR REPLACE INTO system_values(key, value) VALUES(?, ?)', [key, api.serializeObject(value)]
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


})();
