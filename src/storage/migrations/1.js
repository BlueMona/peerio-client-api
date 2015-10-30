var Peerio = this.Peerio || {};
Peerio.SqlMigrations = Peerio.SqlMigrations || [];

(function () {

    var m = {

        version: 1,

        up: function (tx) {

            tx.executeSql(
                'CREATE TABLE conversations (' +
                'id TEXT PRIMARY KEY,' + // conversationID
                'seqID INTEGER,' +       // last sequence id for this conversation
                'originalMsgID TEXT, ' +    // messageID this conversation started with
                'subject TEXT,' +        // subject from original message
                'createdTimestamp INTEGER,' +     // original message timestamp
                'participants TEXT,' +   // current participants array ['username','username'] excluding current user
                'exParticipants TEXT,' + // same but for the ones who left
                'events TEXT,' +         // events object for conversation
                'lastTimestamp INTEGER,' + // timestamp of last time this conversation or messages inside it got updated
                'fileCount INTEGER,' +
                'msgCount INTEGER,' +
                'unread BOOLEAN' +         // true for conversations that have updates user needs to see
                ') WITHOUT ROWID');

            tx.executeSql('CREATE INDEX conv_seq_index ON conversations (seqID)');
            tx.executeSql('CREATE INDEX conv_original_index ON conversations (originalMsgID)');
            tx.executeSql('CREATE INDEX conv_last_ts_index ON conversations (lastTimestamp desc)');
            tx.executeSql('CREATE INDEX conv_unread_index ON conversations (unread)');

            tx.executeSql(
                'CREATE TABLE messages (' +
                'id TEXT PRIMARY KEY,' + // messageID
                'seqID INTEGER,' +       // sequence id for this message
                'conversationID TEXT,' + // conversation this message belongs to
                'timestamp INTEGER,' +     // timestamp
                'sender TEXT,' +           // username
                'body TEXT,' +
                'receiptSecret TEXT,' +    // for messages sent by current user
                'receiptToSend TEXT,' +    // in case of offline we cache it here to send later
                'receipts TEXT,' +         // received receipts (for own messages) ['username', 'username']
                'attachments TEXT,' +      // file id array ['id', 'id']
                'unread BOOLEAN' +         // true for unread messages
                ') WITHOUT ROWID'
            );

            tx.executeSql('CREATE INDEX msg_seq_index ON messages (seqID)');
            tx.executeSql('CREATE INDEX msg_ts_index ON messages (createdTimestamp)');
            tx.executeSql('CREATE INDEX msg_conv_id_index ON messages (conversationID)');

        },

        down: function (tx) {
            tx.executeSql('DROP TABLE conversations');
            tx.executeSql('DROP TABLE messages')
        }

    };

    if (Peerio.SqlMigrations[m.version])
        throw new Error('Duplicate migration versions found.');

    Peerio.SqlMigrations[m.version] = m;

}());

