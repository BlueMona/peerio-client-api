var Peerio = this.Peerio || {};
Peerio.SqlMigrations = Peerio.SqlMigrations || [];

(function () {

    var m = {

        version: 1,

        up: function (tx) {
            tx.executeSql(
                'CREATE TABLE files (' +
                'id TEXT PRIMARY KEY,' +  // file id
                'shortID TEXT,'        +  // short file id (file id hash)
                'header TEXT,'         +  // stringified file header json (to be able to share file)
                'name TEXT,'           +  // decrypted file name
                'creator TEXT,'        +  // username
                'sender TEXT,'         +  // username
                'timestamp INTEGER,'   +  // create timestamp
                'size INTEGER'         +  // in bytes
                ') WITHOUT ROWID');


            tx.executeSql(
                'CREATE TABLE contacts ('       +
                'username TEXT PRIMARY KEY,'    +
                'publicKey TEXT,'               +
                'firstName TEXT,'               +
                'lastName TEXT,'                +
                'address TEXT,'                 +
                'isDeleted BOOLEAN,'            +
                'isRequest BOOLEAN,'            +
                'isReceivedRequest BOOLEAN'     +
                ') WITHOUT ROWID'
            );

        },

        down: function (tx) {
            tx.executeSql('DROP TABLE files');
            tx.executeSql('DROP TABLE contacts')
        }

    };

    if (Peerio.SqlMigrations[m.version])
        throw new Error('Duplicate migration versions found.');

    Peerio.SqlMigrations[m.version] = m;

}());

