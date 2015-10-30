var Peerio = this.Peerio || {};
Peerio.SqlMigrations = Peerio.SqlMigrations || [];

(function () {

    var m = {

        version: 0,

        up: function (tx) {
            tx.executeSql(
                'CREATE TABLE contacts (' +
                'username TEXT PRIMARY KEY, ' +
                'firstName TEXT, ' +
                'lastName TEXT, ' +
                'publicKey TEXT, ' +
                'address TEXT, ' +
                'isDeleted BOOLEAN)'
            );
        },

        down: function (tx) {
            tx.executeSql('DROP TABLE contacts');
        }

    };

    if (Peerio.SqlMigrations[m.version])
        throw new Error('Duplicate migration versions found.');

    Peerio.SqlMigrations[m.version] = m;

}());

