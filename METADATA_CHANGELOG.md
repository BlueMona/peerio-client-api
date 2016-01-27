# Conversation and Message objects metadata
*as seen in communications with server*


## current (update every time it evolves)

**Conversation object metadata**

```
 id: {string} unique conversation id string,
 
 version: {string} metadata structure version

 original: {string} id of the first message in conversation,

 participants: ["username1", "username2"], // current participants, without the ones who left,

 lastTimestamp: {string} unix timestamp of last change in conversation or any of it's messages,

 fileCount: {number} number of files attached to conversation messages,

 messageCount: {number} number of messages in conversation,

 [folderID]: {string} folder id this conversation belongs to,

 // conversation events
 events:[
     {
         participant: "username",
         timestamp: {number} unix timestamp,
         type: "remove" // currently the only possible event type
     }
 ],

 // messages dictionary
 messages : { "{string} message id": Message object }
```

**Message object metadata**

```
id: "{string} message id",
version: "{string}",
sender: "username",
// receipts for this message
recipients: [
                {
                    username: "this receipt sender username",
                    [receipt]: {
                        isRead: {bool} if false - receipt and timesamp are null,
                        encryptedReturnReceipt: "ciphertext:nonce",
                        readTimestamp: {string} unix timestamp when server received receipt
                    }
                }
],

// crypto header
header: {

    version: {number} crypto version (this includes header structure and crypto logic),

    ephemeral: "{string} base64 ephemeral public key",

    // decryption information encrypted for each conversation participant
    decryptInfo:{
        "nonce1": "ciphertext1",
        "nonce2": "ciphertext2"
    }
},

body: "ciphertext",
conversationID: "{string} conversation id this message belongs to",
timestamp: {string} unix timestamp of when message was received by server,
isDraft: {bool} unused,
isModified: {bool} deprecated
```


## V2.0.0

**Type changed**
header: {
    version: "semver string"
}

## V1.1.0

**Added** to conversation  object
conversation version is being set by server according to highest message version in it 

version: "string"

**Added** to the message

version: "string"
outerIndex: 0 // message index (unencrypted part)
timestamp: 0

## V1.0.0 (initial)

**Conversation object**
```
 id: '',
 original: '',
 participants: ['', ''],
 lastTimestamp: '',
 fileCount: 0,
 messageCount: 0,
 folderID: '',
 events: [{
            participant: '',
            timestamp: 0,
            type: "remove"
         }],
 messages : { "message id": Message object }
```

**Message object**
```
id: '',
sender: '',
recipients: [{
                username: '',
                receipt: {
                            isRead: true,
                            encryptedReturnReceipt: '',
                            readTimestamp: ''
                         }
             }],
header: {
    version: 1,
    ephemeral: '',
    decryptInfo: { 'nonce': 'ciphertext' }
},
body: '',
conversationID: '',
timestamp: '',
isDraft: false,
isModified: false
```
