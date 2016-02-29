/**
 *
 * App migrator allows to execute any migration logic when user updates his app.
 * Migration can be applied system-wide (per application) or user-scoped (once user logs into new version first time).
 *
 * This not exactly like database migrations where we need a full history(or snapshot) to recreate database,
 * so we'll not make separate migration files, instead we'll maintain all the upgrade paths in here, removing older ones
 * when they're no more relevant.
 *
 */


var Peerio = this.Peerio || {};

(function () {
    'use strict';

    Peerio.AppMigrator = {
        migrateApp: migrationCheck.bind(null, 'app'),
        migrateUser: migrationCheck.bind(null, 'user')
    };

    var lastVersionKey = 'lastRunVersion';

    // universal migration check and runner
    function migrationCheck(type, username) {
        var key = lastVersionKey;

        // retrieving last run version
        return Peerio.TinyDB.getItem(key, type === 'user' && username )
            .then(lastVersion => {
                // if it's less then current running migration for app or user
                if (!lastVersion || Peerio.Util.simpleSemverCompare(lastVersion, Peerio.runtime.version) === -1)
                    return type === 'user' ? doMigrateUser(username) : doMigrateApp();

                L.info('{0} migrator found last run version {1} is up to date with runtime version {2}', type, lastVersion, Peerio.runtime.version);
            })
            // saving new version number
            .then(()=>Peerio.TinyDB.saveItem(key, Peerio.runtime.version, type === 'user' && username ))
            .catch(err => L.error("Error migrating app. {0} {1}", type === 'user' ? ' for username ' + username : '', err));
    }

    // the actual migration code
    function doMigrateApp() {
        L.info('Migrating app');
    }

    // the actual migration code
    function doMigrateUser(username) {
        L.info('Migrating app for user {0}', username);
        //Peerio.SqlDB.user.executeSql('DROP TABLE IF EXISTS versions');
        //Peerio.SqlDB.user.executeSql('DROP TABLE IF EXISTS messages');
        //Peerio.SqlDB.user.executeSql('DROP TABLE IF EXISTS conversations');
        //Peerio.SqlDB.user.executeSql('DROP TABLE IF EXISTS contacts');
        //Peerio.SqlDB.user.executeSql('DROP TABLE IF EXISTS files');
        //Peerio.SqlDB.user.executeSql('DROP TABLE IF EXISTS read_positions');
        //Peerio.SqlDB.system.executeSql('DROP TABLE IF EXISTS system_values');
        // return Peerio.SqlDB.deleteUserDB(username);
    }

})();

