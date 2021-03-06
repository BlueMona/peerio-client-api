# Encrypted message structure changelog


## current (update every time it evolves)

```
version: "1.1.0",
metadataVersion: "1.1.0"
secretConversationID: "string",
innerIndex: 0,
timestamp: 0,
participants: ["username1", "username2"],
subject: "message subject", // in next versions leave this field for 1st message only
message: "message body",
receipt: "random base64 secret string", // deprecated, remove after desktop rewrite
fileIDs: [],
```


## V1.1.0
This version improves conversation security.

**Added**
```
version: "string"
metadataVersion: "string" // metadata version this conversation was created with
secretConversationID: "string" //random conversation id encrypted in every message
innerIndex: 0 // message index in conversation
timestamp: 0  // encrypted timestamp
```

**Removed**
```
ack: "deprecated"
sequence: 0 // removal of this field breaks compatibility with older Peerio versions 
```

## V1.0.0 (initial)

```
subject: "message subject",
message: "message body",
receipt: "random base64 secret string",
fileIDs: ["file_id1", "file_id2"],
ack: "deprecated",
participants: ["username1", "username2"],
sequence: 0 
```

