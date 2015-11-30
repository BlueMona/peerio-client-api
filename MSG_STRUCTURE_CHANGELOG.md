# Encrypted message structure changelog


## current (update every time it evolves)

```
secretConversationID: "string",
innerIndex: 0,
timestamp: 0,
subject: "message subject",
message: "message body",
receipt: "random base64 secret string",
fileIDs: ["file_id1", "file_id2"],
participants: ["username1", "username2"],
sequence: 0 // deprecated, remove in next version
```


## V1.1.0
This version improves conversation security.

**Added**
```
secretConversationID: "string" //conversation id encrypted in every message
innerIndex: 0 // message index in conversation
timestamp: 0  // encrypted timestamp
```

**Removed**
```
ack: "deprecated"
```

**Deprecated**, but not yet removed for backwards compatibility. Remove in next versions.
```
sequence: 0  
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

