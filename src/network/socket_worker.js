/**
 * Web Worker handling the actual web socket communication.
 * This architectural decision was made to minimize the impact
 * of potential performance bottleneck and UI thread blocking.
 *
 * IMPORTANT: socket client should be initialized before using,
 *            see documentation for onmessage handler below.
 *
 * todo: Ideally this should be decoupled further,
 *       moving out socket handling code to a separate file,
 *       that can be imported in a web worker wrapper or be used in UI thread as usual.
 *       We can do that when there are enough reasons for that,
 *       for now the only reason is the testability of smaller components,
 *       but we will not benefit from it, because API to test is extremely small
 *       and it will be covered by networking tests anyway.
 */

L.switchToWorkerMode('W_SOCK:');

// First message from UI thread should contain configuration data to initialise worker.
// All the following messages will be considered data to send through socket.
self.onmessage = function (payload) {
    initialize(payload.data);
    // replacing init handler with the one that will send data through socket
    self.onmessage = messageHandler;
};

// cfg - Peerio.Config object
function initialize(cfg) {
    var lastPing = null;
    var intervalID = null;

    var serverEvents = [
        'contactAdded',
        'contactRemoved',
        'contactRequestSent',
        'contactRequestReceived',
        'sentContactRequestRemoved',
        'receivedContactRequestRemoved',

        'seqIDUpdated',

        'fileAdded',
        'fileShared',
        'fileRemoved',

        'settingsUpdated',

        'twoFactorAuthRequested'
    ];

    function killSocketClient() {
        stopPingChecks();
        if (!self.peerioSocket)return;
        try {
            L.info('Disconnecting socket...');
            self.peerioSocket.disconnect();
        } catch (err) {
            console.log(err);
        }
        self.peerioSocket = null;
    }

    function createSocketClient() {
        killSocketClient();
        L.info('Creating socket.io instance: {0}', cfg.webSocketServer);
        // creating socket.io client instance
        self.peerioSocket = io.connect(cfg.webSocketServer, {transports: ['websocket'], forceNew: true});
        // socket events should be passed to UI thread

        // socket.io events
        // 'connect' is fired on every connection (including reconnection)
        self.peerioSocket.on('connect', function () {
            console.log('socket.io connect event');
            self.postMessage({socketEvent: 'connect'});
            startPingChecks();
        });

        // 'disconnect' is fired on every disconnection
        self.peerioSocket.on('disconnect', function (reason) {
            console.log('socket.io disconnect event. reason: ', reason);
            self.postMessage({socketEvent: 'disconnect'});
            stopPingChecks();
        });

        // Peerio server ping
        self.peerioSocket.on('ping', function () {
            self.setLastPing();
        });

        subscribeToServerEvents();

    }

    createSocketClient();

    // BROKEN CONNECTION DETECTION SYSTEM
    // Every time client receives a message, it saves the timestamp.
    // Interval function checks if last message was received more then pingTimeout milliseconds ago and restarts connection.
    // Server sends ping messages every 5 seconds to make this work in case of no meaningful messages are sent for some time

    // saves timestamp of last received ping
    self.setLastPing = function () {
        lastPing = Date.now();
    };

    // starts timeout checking interval
    function startPingChecks() {
        if (cfg.pingTimeout === 0) return;
        stopPingChecks();
        intervalID = setInterval(checkPings, Math.ceil(cfg.pingTimeout / 2));
    }

    // stops timeout checking interval interval
    function stopPingChecks() {
        if (intervalID != null)
            clearInterval(intervalID);

        intervalID = null;
        lastPing = null;
    }

    // detects timeout and resets connection
    function checkPings() {
        if (!lastPing) return;
        var timePassed = Date.now() - lastPing;
        if (timePassed > cfg.pingTimeout) {
            console.log('Heartbeat service detected broken connection. ' + Math.round(timePassed / 1000) + ' seconds without a ping.');
            resetConnection();
        }
    }

    // resets (restarts) connection
    function resetConnection() {
        killSocketClient();
        // Timeout 'just in case' :) Noticed a few times socket.io duplicating connections
        setTimeout(createSocketClient, 1000);
    }

    function subscribeToServerEvents() {
        // peerio events
        serverEvents.forEach(function (eventName) {
            self.peerioSocket.on(eventName,
                function (data) {
                    self.setLastPing();
                    self.postMessage({socketEvent: eventName, data: data});
                });
        });
    }


    // this function receives data from UI thread and sends it through socket
    self.messageHandler = function (payload) {
        var message = payload.data;

        //L.js config
        if (message.ljsConfig) {
            L.setOptions(message.ljsConfig);
            return;
        }

        switch (message.name) {
            case 'reconnectSocket':
                console.log('Application logic requested connection reset.');
                resetConnection();
                return;
            case 'disconnectSocket':
                console.log('Application logic requested socket disconnect.');
                killSocketClient();
                return;
            case 'connectSocket':
                console.log('Application logic requested socket connect.');
                createSocketClient();
                return;
            case 'pingWorker':
                console.log('Application logic sent socket worker ping.');
                self.postMessage({callbackID: message.callbackID, data: null});
                return;
        }


        self.peerioSocket.emit(message.name, message.data, function (response) {
            self.setLastPing();
            self.postMessage({
                callbackID: message.callbackID,
                data: response
            });
        });
    };
}
