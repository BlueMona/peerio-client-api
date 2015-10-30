/**
 * sqlite facade
 */
var Peerio = this.Peerio || {};
Peerio.SqlDB = {};


// TODO: 1. closeAllUserDatabases on logout
// TODO: 2. close user database on pause, open on resume
// TODO: 3. SQLError does not serialize properly so i added a catch filter, but it's better to tech L.js to handle that
Peerio.SqlDB.init = function () {
    'use strict';

    delete Peerio.SqlDB.init;

    var plugin = window.sqlitePlugin;
    // mockup for debugging in browser
    if (!plugin && window.PeerioDebug) {
        plugin = {
            openDatabase: function (params) {
                var ret = window.openDatabase(params.name, '1', params.name, 5 * 1024 * 1024);
                var origTran = ret.transaction.bind(ret);
                ret.executeSql = function (statement, values, resolve, reject) {
                    return origTran(function (tx) {
                        return tx.executeSql(statement, values, (tx, res)=>resolve(res), reject);
                    });
                };

                ret.open = function () {
                    console.log('DB OPEN MOCK');
                };

                ret.close = function () {
                    console.log('DB CLOSE MOCK');
                };
                ret.abortAllPendingTransactions = function () {
                    console.log('DB abortAllPendingTransactions MOCK');
                };

                return ret;

            },
            deleteDatabase: function (name) {
                console.warn('todo: delete polyfill for dev environment');
            }
        }
    }

    //-- PUBLIC API ----------------------------------------------------------------------------------------------------
    Peerio.SqlDB = {
        openUserDB: openUserDB,
        deleteUserDB: deleteUserDB,
        closeAll: closeAllUserDatabases
    };
    //------------------------------------------------------------------------------------------------------------------

    promisifyStatic();
    // security measure, to make sure previous database is closed after app reload
    closeAllUserDatabases();


    function openUserDB(username, passphrase) {
        return plugin.openDatabase(getUserDBName(username), passphrase)
            .then(db => Peerio.SqlDB.user = db)
            .catch(err => {
                L.error('Failed to open database for {0}. {1}', username, err);
                return Promise.reject();
            });
    }

    function deleteUserDB(username) {
        return plugin.deleteDatabase(getUserDBName(username));
    }

    function getUserDBName(username) {
        return 'peerio_' + username + '.db';
    }

    function closeAllUserDatabases() {
        var tmpdbName = '___peerio__tmp__system__db___';
        plugin.openDatabase(tmpdbName, '')
            .then(tmpdb => {
                var dblist = tmpdb.openDBs;
                setTimeout(()=> {
                    tmpdb.abortAllPendingTransactions();
                    tmpdb.close();
                    plugin.deleteDatabase(tmpdbName)
                }, 10);
                return dblist;
            })
            .then(dblist => {
                if (!dblist) return;
                Promise.each(Object.keys(dblist), dbname => {
                    if (dbname === tmpdbName) return;
                    plugin.openDatabase(dbname)
                        .then(db => {
                            db.abortAllPendingTransactions();
                            return db.close();
                        });
                });
            });
    }

    //-- PROMISIFICATORS -----------------------------------------------------------------------------------------------
    // replacing original functions is a bad idea, because plugin internally call them sometimes...
    // so every promisified function just takes original fn name and adds 'P' to it.
    // NOTE: executeSql inside transaction does not require promisification because transaction will resolve once all
    //       nested executeSql are done. Async inside transaction will break it anyway.
    function promisifyStatic() {
        var originalOpen = plugin.openDatabase.bind(plugin);
        var originalDelete = plugin.deleteDatabase.bind(plugin);

        plugin.openDatabase = (name, key) => {
            return new Promise((resolve, reject) => {
                var db = originalOpen({name: name, key: key, location: 2}, null, reject);
                promisifyDb(db);
                resolve(db);
            }).catch(function (err) {
                return Promise.reject(err && err.message || err);
            });
        };

        plugin.deleteDatabase = name => {
            return new Promise((resolve, reject) => {
                // todo, ideally we need to check if this db is open to close it first, because ios is known to leak otherwise
                originalDelete({name: name, location: 2}, resolve, reject);
            }).catch(function (err) {
                return Promise.reject(err && err.message || err);
            });
        };
    }

    function promisifyDb(db) {
        //NOTE: db.open is used internally by sqlite plugin, but function signature is the same, so - no harm
        var originalOpen = db.open.bind(db);
        var originalClose = db.close.bind(db);
        var originalTransaction = db.transaction.bind(db);
        var originalExecute = db.executeSql.bind(db);

        db.open = () => new Promise((resolve, reject) => originalOpen(resolve, reject));
        db.close = () => new Promise((resolve, reject) => originalClose(resolve, reject));
        db.transaction = fn => new Promise((resolve, reject) => {
            originalTransaction(tx => fn(tx), reject, resolve);// mixed order in api
        }).catch(function (err) {
            return Promise.reject(err && err.message || err);
        });
        db.executeSql = (statement, params) => {
            return new Promise((resolve, reject) => {
                originalExecute(statement, params, resolve, reject)
            }).catch(function (err) {
                return Promise.reject(err && err.message || err);
            });
        }
    }


};