/**
 * General purpose sql queries
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    var api = Peerio.SqlQueries = Peerio.SqlQueries || {};

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


    //-- Utilities -----------------------------------------------------------------------------------------------------
    api.serializeArray = function(arr) {
        return arr && arr.length ? JSON.stringify(arr) : null;
    };

    api.serializeObject = function(obj) {
        return (is.object(obj) && Object.keys(obj).length===0) ? null : JSON.stringify(obj);
    }

})();
