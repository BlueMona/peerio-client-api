var Peerio = this.Peerio || {};
Peerio.SqlMigrations = Peerio.SqlMigrations || [];

(function () {

    var m = {

        version: 0,

        up: function (tx) {

            tx.executeSql(
                'CREATE TABLE conversations (' +
                'id TEXT PRIMARY KEY,' +            // conversationID
                'seqID INTEGER,' +                  // last sequence id for this conversation
                'originalMsgID TEXT, ' +            // messageID this conversation started with
                'subject TEXT,' +                   // subject from original message
                'createdTimestamp INTEGER,' +       // original message timestamp
                'participants TEXT,' +              // current participants array ['username','username'] excluding current user
                'exParticipants TEXT,' +            // same but for the ones who left
                'lastTimestamp INTEGER,' +          // timestamp of last time this conversation or messages inside it got updated
                'unread INTEGER,' +                 // number of new messages in conversation
                'hasFiles BOOLEAN' +                //
                ') WITHOUT ROWID');

            tx.executeSql('CREATE INDEX conv_seq_index ON conversations (seqID)');
            tx.executeSql('CREATE INDEX conv_original_index ON conversations (originalMsgID)');
            tx.executeSql('CREATE INDEX conv_last_ts_index ON conversations (lastTimestamp desc)');
            tx.executeSql('CREATE INDEX conv_unread_index ON conversations (unread)');
            tx.executeSql('CREATE INDEX conv_has_files_index ON conversations (hasFiles)');

            tx.executeSql(
                'CREATE TABLE messages (' +
                'id TEXT PRIMARY KEY,' + // messageID
                'seqID INTEGER,' +       // sequence id for this message
                'lastReceiptSeqID INTEGER,' +       // sequence id for this message
                'conversationID TEXT,' + // conversation this message belongs to
                'sender TEXT,' +           // username
                'timestamp INTEGER,' +     // timestamp
                'body TEXT,' +
                'files TEXT,' +      // file id array ['id', 'id']
                'receiptSecret TEXT,' +    // plaintext secret for both own and received messages
                'receipts TEXT,' +         // received receipts (for own messages) ['username', 'username']
                'receiptSent BOOLEAN,' +
                'unread BOOLEAN' +         // true for unread messages
                ') WITHOUT ROWID'
            );

            tx.executeSql('CREATE INDEX msg_seq_index ON messages (seqID)');
            tx.executeSql('CREATE INDEX msg_receipt_seq_index ON messages (lastReceiptSeqID)');
            tx.executeSql('CREATE INDEX msg_conv_id_index ON messages (conversationID)');
            tx.executeSql('CREATE INDEX msg_ts_index ON messages (timestamp)');
            tx.executeSql('CREATE INDEX msg_receipt_sent ON messages (receiptSent)');
            tx.executeSql('CREATE INDEX msg_unread ON messages (unread)');

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

