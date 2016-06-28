var Peerio = this.Peerio || {};
Peerio.SqlMigrations = Peerio.SqlMigrations || [];

(function () {

    var m = {

        version: 2,

        up: function (tx) {
            tx.executeSql(
                'ALTER TABLE conversations ' +
                'ADD COLUMN ' +
                'isGhost BOOLEAN DEFAULT 0'                // is the conversation marked as ghost
            );

            tx.executeSql('CREATE INDEX conv_ghost_index ON conversations (isGhost)');
        },

        down: function (tx) {
            // we cannot easily remove columns in sqlite, will have to recreate the table
            tx.executeSql('DROP TABLE conversations');

            tx.executeSql(
                'CREATE TABLE conversations (' +
                'id TEXT PRIMARY KEY,' +            // conversationID
                'seqID INTEGER,' +                  // last sequence id for this conversation
                'originalMsgID TEXT, ' +            // messageID this conversation started with
                'lastMsgID TEXT, ' +                // last messageID in this conversation
                'secretConversationID TEXT, ' +     // generated in original message and shared across all the following ones
                'subject TEXT,' +                   // subject from original message
                'createdTimestamp INTEGER,' +       // original message timestamp
                'participants TEXT,' +              // current participants array ['username','username'] excluding current user
                'exParticipants TEXT,' +            // same but for the ones who left
                'lastTimestamp INTEGER,' +          // timestamp of last time this conversation or messages inside it got updated
                'hasFiles BOOLEAN,' +               // there was at least one file shared in this conversation
                'unread BOOLEAN' +                  // is there new messages in this conversation
                ') WITHOUT ROWID');

            tx.executeSql('CREATE INDEX conv_seq_index ON conversations (seqID)');
            tx.executeSql('CREATE INDEX conv_original_index ON conversations (originalMsgID)');
            tx.executeSql('CREATE INDEX conv_unread_index ON conversations (unread)');
            tx.executeSql('CREATE INDEX conv_has_files_index ON conversations (hasFiles)');
        }

    };

    if (Peerio.SqlMigrations[m.version])
        throw new Error('Duplicate migration versions found.');

    Peerio.SqlMigrations[m.version] = m;

}());

