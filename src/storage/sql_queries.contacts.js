/**
 * Contacts sql queries
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    var api = Peerio.SqlQueries = Peerio.SqlQueries || {};

    //-- READ ----------------------------------------------------------------------------------------------------------
    api.getContacts = function () {
        return Peerio.SqlDB.user.executeSql(
            'SELECT * FROM contacts')
            .then(res => {
                var contacts = [];
                for (var i = 0; i < res.rows.length; i++) {
                    var c = res.rows.item(i);
                    c.isDeleted = !!c.isDeleted;
                    c.isRequest = !!c.isRequest;
                    c.isReceivedRequest = !!c.isReceivedRequest;
                    contacts.push(c);
                }
                return contacts;
            });
    };

    api.getAllContactsUsernames = function(){
        return Peerio.SqlDB.user.executeSql(
            'SELECT username FROM contacts')
            .then(res => {
                var usernames = [];
                for (var i = 0; i < res.rows.length; i++) {
                    usernames.push(res.rows.item(i).username);
                }
                return usernames;
            });
    };

    //-- WRITE ----------------------------------------------------------------------------------------------------------
    api.createOrUpdateContact = function (username, publicKey, firstName, lastName, address, isDeleted, isRequest, isReceivedRequest) {
        return Peerio.SqlDB.user.executeSql(
            'REPLACE INTO contacts VALUES(?,?,?,?,?,?,?,?)',
            [
                username,
                publicKey,
                firstName,
                lastName,
                address,
                isDeleted,
                isRequest,
                isReceivedRequest
            ]
        );
    };

    api.deleteContact = function (username) {
        return Peerio.SqlDB.user.executeSql(
            'DELETE FROM contacts WHERE username=?', [username]);
    }


})();
