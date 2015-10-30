/**
 *
 * Peerio sql db migration template.
 * =================================
 *
 * To add a new migration:
 * 1. Scan `storage/migrations` folder, find a migration file with maximum version number e.g. `12.js`
 * 2. Add +1 to max migration number and create new file with that name, e.g. `13.js`
 * 3. Copy, uncomment, and fill migration template below.
 *
 * ! Do not modify older migrations, esp. ones that made it into production apps. !
 * ! Always create downgrade part of the migration, it will make development easier !
 */

/*

var Peerio = this.Peerio || {};
Peerio.SqlMigrations = Peerio.SqlMigrations || [];

(function () {

    var m = {

        version: 0,

        up: function (tx) {
            return tx.executeSql('');
        },

        down: function (tx) {
            return tx.executeSql('');
        }

    };

    if(Peerio.SqlMigrations[m.version])
        throw new Error('Duplicate migration versions found.');

    Peerio.SqlMigrations[m.version] = m;

}());

*/