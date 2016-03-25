/**
 * Peerio network protocol implementation
 */


var Peerio = this.Peerio || {};
Peerio.Net = {};

Peerio.Net.init = function () {
    'use strict';

    var API_VERSION = '2.1.0';

    var api = Peerio.Net;
    Peerio.Net.init = undefined;
    var hasProp = Peerio.Util.hasProp;

    //-- SOCKET EVENT HANDLING, AUTH & CONNECTION STATE ----------------------------------------------------------------
    var connected = false;
    var authenticated = false;
    var user = null;
    var cached2FARequest = null;
    var gui2FAPromise = null;


    var socketEventHandlers = {
        connect: onConnect,
        disconnect: onDisconnect
    };

    /**
     * Injects Peerio socket server event handlers (app events, not connection events).
     * App logic is supposed to handle those events, but Net has nothing to do over this data,
     * so we make a simple way for Net to transfer events to App Logic
     * @param {string} eventName
     * @param {function} handler
     * @returns {string} registered event name
     */
    api.subscribe = function (eventName, handler) {
        if (socketEventHandlers[eventName]) throw eventName + ' handler already subscribed.';
        socketEventHandlers[eventName] = handler;
        return eventName;
    };

    // this starts listening to socket.io events
    Peerio.Socket.injectEventHandler(function (eventName, data) {
        L.silly('Server event: {0}, data: {1}', eventName, data);
        var handler = socketEventHandlers[eventName];
        if (handler) {
            handler(data);
        } else {
            console.log('unhandled socket event ', eventName, data);
        }

    });

    function checkClientVersion() {
        if (!Peerio.runtime.platform) {
            L.error('Could not detect runtime platform, skipping client version check');
            return Promise.resolve(true);
        }

        return sendToSocket('getClientVersionInfo', null, {ignoreConnectionState: true, ignoreAuthState: true})
            .then(versionData => {
                var versions = versionData && versionData[Peerio.runtime.platform];
                if (!versions) {
                    L.error('Could not find version information for platform {0}', Peerio.runtime.platform);
                    return true;
                }

                L.info('Checking client version {0} over server version data {1}', Peerio.runtime.version, versions);

                // Assigning Peerio.runtime variables in here is a bit clumsy
                // but there is a big chance of UI not being ready to
                // process the updateAvailable event when app starts,
                // because networking module starts before UI starts rendering
                // todo: find more elegant way. AppState ?

                var ltMin = Peerio.Util.simpleSemverCompare(Peerio.runtime.version, versions.min);
                if (ltMin !== false && ltMin < 0) {
                    Peerio.runtime.expired = true;
                    Peerio.Action.updateAvailable(true);
                    return false;
                }

                var ltCurr = Peerio.Util.simpleSemverCompare(Peerio.runtime.version, versions.current);
                if (ltCurr !== false && ltCurr < 0) {
                    Peerio.runtime.updateAvailable = true;
                    Peerio.Action.updateAvailable();
                }

                return true;
            });
    }


    function onConnect() {
        L.verbose('Network layer got connect event from socket');
        sendToSocket('setApiVersion', {version: API_VERSION}, {ignoreConnectionState: true, ignoreAuthState: true})
            .then(checkClientVersion)
            .then(function (proceed) {
                if (!proceed) {
                    Peerio.Socket.disableNetworking();
                    return;
                }
                L.info('Network layer set to connected state.');
                connected = true;
                window.setTimeout(Peerio.Action.connected, 0);
                if (user)
                    api.login(user, true)
                        .catch(function (err) {
                            L.error('Auto re-login failed. No new attempts will be made until reconnect. {0}', err);
                        });
            })
            .catch(function (err) {
                // This should not normally happen ever. But we must be prepared to not leave client in indeterminate state.
                console.error('setApiVersion ' + API_VERSION + ' failed', err);
                Peerio.Socket.reconnect();
            });
    }

    function onDisconnect() {
        // in case of errors disconnect events might be fired without 'connect' event between them
        // so we make sure we handle first event only
        if (!connected) return;
        rejectAllPromises('Disconnected');
        connected = false;
        authenticated = false;
        L.info('Network layer set to disconnected state.');
        Peerio.Action.disconnected();
    }

    /**
     * Authenticates current socket session.
     * Stores user object to re-login automatically in case of reconnection.
     * @param {{username: string, publicKey: string, keyPair: KeyPair}} userData
     * @param {boolean} [keepCredentials] - remember user credentials even if login fails
     * @returns {Promise}
     */
    api.login = function (userData, keepCredentials) {
        if (!userData) return Promise.reject();
        user = userData;

        if (!connected) return Promise.reject('Not Connected');

        return sendToSocket('getAuthenticationToken', {
            username: user.username,
            publicKeyString: user.publicKey
        }, {ignoreAuthState: true})
            .then(encryptedAuthToken => Peerio.Crypto.decryptAuthToken(encryptedAuthToken, user.keyPair))
            .then(authToken => sendToSocket('login', {authToken: authToken}, {ignoreAuthState: true}))
            .then(() => {
                L.info('connection authenticated');
                authenticated = true;
                Peerio.Action.authenticated();
            })
            .catch(error=> {
                    console.log('authentication failed.', error);
                    if (!keepCredentials)
                        user = null;

                    return Promise.reject(error);
                }
            );
    };

    api.signOut = function () {
        L.info('Network layer performs sign out');
        socketEventHandlers = {
            connect: onConnect,
            disconnect: onDisconnect
        };
        user = null;
        Peerio.Socket.reconnect();
    };

    //-- PROMISE MANAGEMENT --------------------------------------------------------------------------------------------
    // here we store all pending promises by unique id
    var pending = {};
    // safe max promise id under 32-bit integer. Once we reach maximum, id resets to 0.
    var maxID = 4000000000;
    var currentID = 0;

    // registers new promise reject function and returns a unique id for it
    function addPendingPromise(rejectFn) {
        if (++currentID > maxID) currentID = 0;
        pending[currentID] = rejectFn;
        return currentID;
    }

    // removes previously registered promise rejection fn by id
    function removePendingPromise(id) {
        Peerio.Action.loadingDone();
        delete pending[id];
    }

    // rejects all pending promises. useful in case of socket errors, logout.
    function rejectAllPromises(reason) {
        _.forOwn(pending, function (reject) {
            reject(reason);
        });
        currentID = 0;
    }

    //-- HELPERS -------------------------------------------------------------------------------------------------------
    var empty = {};

    api.sendToSocket = sendToSocket;

    /**
     *  generalized DRY function to use from public api functions
     *  @param {string} name - message name
     *  @param {Object} [data] - object to send
     *  @param {Object} [options]
     *  @param {boolean} [options.ignoreConnectionState] - only setApiVersion needs it, couldn't find more elegant way
     *  @param {boolean} [options.ignoreAuthState] - some functions do not need an authenticated connection
     *  @param {Array} [options.transfer] - array of objects to transfer to worker (object won't be available on this thread anymore)
     *  @param {boolean} [options.ignoreTimeout] - tells our function to ignore timeout completely. useful for file uploads
     *  @param {Number} [options.customTimeout] - custom timeout length for this call, in milliseconds
     *  @returns {Promise}
     */
    function sendToSocket(name, data, options) {
        var {ignoreConnectionState, ignoreAuthState,transfer, ignoreTimeout, customTimeout} = options || empty;

        if (!connected && !ignoreConnectionState) return Promise.reject(new Error('Not connected.'));
        if (!authenticated && !ignoreAuthState) return Promise.reject(new Error(name + ' requires authenticated connection.'));

        // unique (within reasonable time frame) promise id
        var id = null;
        var promise = new Promise(
            function (resolve, reject) {
                Peerio.Action.loading();
                id = addPendingPromise(reject);
                Peerio.Socket.send(name, data, resolve, transfer);
            });

        if (!ignoreTimeout) {
            promise = promise.timeout(customTimeout || Peerio.Config.serverResponseTimeout);
        }

        return promise
            .catch(function (error) {
                //just to log all non-server-returned errors
                L.error(error);
                return Promise.reject(error);
            })
            .then(function (response) {
                // if we got response, let's check it for 'error' property and reject promise if it exists
                if (!hasProp(response, 'error')) return Promise.resolve(response);

                var err = new PeerioServerError(response.error, response.message);
                L.error(err);
                // 2fa requested
                // TODO: add constraints, for which functions
                // is 2fa 424 error enabled
                if (response.error == 424) {
                    // ignore everything after 2FA request
                    if (gui2FAPromise) {
                        return Promise.reject({message: 'No operations before 2FA'});
                    }
                    // TODO: maybe store a stack of requests, still?
                    cached2FARequest = cached2FARequest || {
                            name: name,
                            data: data,
                            options: options
                        };

                    // for debugging
                    gui2FAPromise = gui2FAPromise ||
                        new Promise((nestedResolve, nestedReject) => {
                            Peerio.Action.twoFactorAuthRequested(nestedResolve, nestedReject);
                        })
                            .then(() => {
                                return sendToSocket(cached2FARequest.name, cached2FARequest.data, cached2FARequest.options);
                            })
                            .finally(() => {
                                cached2FARequest = null;
                                gui2FAPromise = null;
                            });

                    return gui2FAPromise;
                }
                return Promise.reject(err);
            })
            .finally(() => removePendingPromise(id));
    }

    //------------------------------------------------------------------------------------------------------------------
    //-- UTILITY API METHODS -------------------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Asks the server to validate a username.
     * @param {string}  username - Username to validate.
     * @returns {Promise<Boolean>} - true if username is valid (free)
     */
    api.validateUsername = function (username) {
        if (!username) {
            return Promise.resolve(false);
        }
        return sendToSocket('validateUsername', {username: username}, {ignoreAuthState: true})
            .then(function (response) {
                return response.available;
            });
    };

    /**
     * Asks the server to validate an address(email or phone).
     * @param {string} address  - Address to validate.
     * @returns {Promise<Boolean>} - true if address is valid and not yet registered, false otherwise
     */
    api.validateAddress = function (address) {
        var parsed = Peerio.Util.parseAddress(address);
        if (!parsed) return Promise.resolve(false);
        return sendToSocket('validateAddress', {address: parsed}, {ignoreAuthState: true})
            .then(function (response) {
                return response.available;
            });

    };

    //------------------------------------------------------------------------------------------------------------------
    //-- SIGNUP/DELETE ACCOUNT API METHODS -----------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Begins an account registration challenge with the server.
     * @param {Peerio.AccountInfo} accountInfo - Contains account information.
     * @promise {{
     *            username: 'Username this challenge is for (String)',
     *            accountCreationToken: {
     *              token: 'Encrypted token (Base64 String)',
     *              nonce: 'Nonce used to encrypt the token (Base64 string)'
     *            },
     *            ephemeralServerPublicKey: 'server's public key (Base58 String)'
     *          }} - server response
     */
    api.registerAccount = function (accountInfo) {
        return sendToSocket('register', accountInfo, {ignoreAuthState: true});
    };

    /**
     * Begins an account registration challenge with the server.
     * @param {string} decryptedToken - Contains account information.
     * @returns {Promise<Boolean>} - always returns true or throws a PeerioServerError
     */
    api.activateAccount = function (decryptedToken) {
        return sendToSocket('activateAccount', {accountCreationToken: decryptedToken}, {ignoreAuthState: true})
            .return(true);
    };

    /**
     * Deletes user account
     */
    api.closeAccount = function () {
        return sendToSocket('closeAccount');
    };


    //------------------------------------------------------------------------------------------------------------------
    //-- ACCOUNT SETTINGS/PREFERENCES API METHODS ----------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------------------------


    /**
     * Sends back an address confirmation code for the user's email/phone number.
     * @param {string} address
     * @param {number} confirmationCode - 8 digit number.
     * @returns {Promise<Boolean>}
     */
    api.confirmAddress = function (address, confirmationCode) {
        return sendToSocket('confirmAddress', {address: {value: address}, confirmationCode: confirmationCode})
            .return(true);
    };

    /**
     * Gets user settings and some personal data
     */
    api.getSettings = function () {
        return sendToSocket('getSettings');
    };

    /**
     * Change settings.
     * @param {object} settings
     */
    api.updateSettings = function (settings) {
        return sendToSocket('updateSettings', settings);
    };

    /**
     * Adds a new user address. Requires confirmation to make changes permanent.
     * @param {{type: 'email'||'phone', value: address }} address
     */
    api.addAddress = function (address) {
        return sendToSocket('addAddress', address);
    };

    /**
     * Sets an address as the primary address.
     * @param {string} address
     */
    api.setPrimaryAddress = function (address) {
        return sendToSocket('setPrimaryAddress', {address: {value: address}});
    };

    /**
     * Removes an address from user's account.
     * @param {string} address
     */
    api.removeAddress = function (address) {
        return sendToSocket('removeAddress', {address: {value: address}});
    };

    //------------------------------------------------------------------------------------------------------------------
    //-- CONTACTS API METHODS ------------------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Gets a publicKey for a user.
     * @param {string} username
     */
    api.getPublicKey = function (username) {
        return sendToSocket('getUserPublicKey', {username: username});
    };

    /**
     * Retrieves all contacts for the user.
     * @returns {Promise<[]>}
     */
    api.getContacts = function () {
        return sendToSocket('getContacts');
    };

    /**
     * Retrieves all sent contact requests.
     * @returns {Promise<[]>}
     */
    api.getSentContactRequests = function () {
        return sendToSocket('getSentContactRequests');
    };

    /**
     * Retrieves all received contact requests.
     * @returns {Promise<[]>}
     */
    api.getReceivedContactRequests = function () {
        return sendToSocket('getReceivedContactRequests');
    };

    /**
     * Retrieves a Peerio username from an address.
     * @param {Object} address
     */
    api.addressLookup = function (address) {
        return sendToSocket('addressLookup', address, {ignoreAuthState: true});
    };

    /**
     * Sends a contact request to a username.
     * @param {string} username
     */
    api.addContact = function (username) {
        return sendToSocket('addOrInviteContacts', {add: [{username: username}]});
    };

    /**
     * Sends a contact or invite request to usernames and/or addresses.
     * @param {object}  contacts - {add:[{username:String}], invite:[{email:String}]}
     */
    api.addOrInviteContacts = function (contacts) {
        return sendToSocket('addOrInviteContacts', contacts);
    };

    /**
     * Cancel a contact request previously sent to a username.
     * @param {string} username
     */
    api.cancelContactRequest = function (username) {
        return sendToSocket('cancelContactRequest', {username: username});
    };

    /**
     * Accept a contact request from a username.
     * @param {string} username
     */
    api.acceptContactRequest = function (username) {
        return sendToSocket('acceptContactRequest', {username: username});
    };

    /**
     * Decline a contact request from a username.
     * @param {string} username
     */
    api.rejectContactRequest = function (username) {
        return sendToSocket('declineContactRequest', {username: username});
    };

    /**
     * Removes a username as a contact.
     * @param {string} username
     */
    api.removeContact = function (username) {
        return sendToSocket('removeContact', {username: username});
    };

    /**
     * Send a Peerio invitation to an address.
     * @param {Object} address
     */
    api.inviteByEmail = function (address) {
        return sendToSocket('addOrInviteContacts', {invite: [{email: address}]});
    };

    /**
     * Set up 2FA. Returns a TOTP shared secret.
     */
    api.setUp2FA = function () {
        return sendToSocket('setUp2FA');
    };

    /**
     * Confirm 2FA. Send a code to confirm the shared secret.
     * @param {number} code
     */
    api.confirm2FA = function (code) {
        return sendToSocket('confirm2FA', {twoFACode: code});
    };

    /**
     * Generic 2FA. Sends a code to authenticate.
     * @param {number} code
     * @param {string} username
     * @param {string} publicKey
     */
    api.validate2FA = function (code, username, publicKey) {
        return sendToSocket('validate2FA', {
            twoFACode: code,
            username: username,
            publicKeyString: publicKey
        }, {ignoreAuthState: true});
    };

    /**
     * Registers device for push notifications
     */
    api.registerMobileDevice = function (data) {
        return sendToSocket('registerMobileDevice', data);
    };

    /**
     * Redeem coupon code
     */
    api.redeemCouponCode = function (code) {
        return sendToSocket('redeemCouponCode', {code: code});
    };

    /**
     * Get invitation code for the logged in user
     * @returns object of type {inviteCode: "ZDFGTK1232KDVN"}
     */
    api.getInviteCode = function () {
        return sendToSocket('getInviteCode');
    };


    //------------------------------------------------------------------------------------------------------------------
    //-- MESSAGES API METHODS ------------------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Send a Peerio message to contacts.
     * @param {Object} msg
     */
    api.createMessage = function (msg) {
        return sendToSocket('createMessage', msg);
    };


    /**
     * Retrieve a message by its ID.
     * @param {array} ids - Array of all message IDs.
     */
    api.getMessages = function (ids) {
        return sendToSocket('getMessages', {ids: ids});
    };

    /**
     * Retrieve list of conversations.
     */
    api.getAllConversations = function () {
        return sendToSocket('getAllConversations');
    };

    /**
     * todo: this is needed to support old desktop client, remove when it's rewritten
     * Mark a message as read.
     * @param {Array} read - array containing {id, encryptedReturnReceipt} objects
     */
    api.readMessages = function (read) {
        return sendToSocket('readMessages', {read: read});
    };

    /**
     * Remove a conversation and optionally also remove files.
     * @param {array} ids
     */
    api.removeConversation = function (ids) {
        return sendToSocket('removeConversation', {ids: ids});
    };

    //------------------------------------------------------------------------------------------------------------------
    //-- FILE API METHODS ----------------------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Initiate a file upload.
     * @param fileInfo
     * @param {object} fileInfo.header
     * @param {string} fileInfo.ciphertext
     * @param {number} fileInfo.totalChunks
     * @param {string} fileInfo.clientFileID
     * @param {string} [fileInfo.parentFolder]
     */
    api.uploadFile = function (fileInfo) {
        return sendToSocket('uploadFile', fileInfo);
    };

    /**
     * Uploads a file chunk.
     * @param chunk
     * @param {string} chunk.ciphertext
     * @param {number} chunk.chunkNumber
     * @param {string} chunk.clientFileID
     */
    api.uploadFileChunk = function (chunk) {
        return sendToSocket('uploadFileChunk', chunk, {transfer: [chunk.ciphertext], customTimeout: 150000});
    };

    /**
     * Retrieve information about a single file.
     * @param {string} id
     */
    api.getFile = function (id) {
        return sendToSocket('getFile', {id: id});
    };

    /**
     * Retrieve a list of all user files.
     */
    api.getFiles = function () {
        return sendToSocket('getFiles', null, {customTimeout: 60000});
    };

    /**
     * Retrieve file download information.
     * @param {string} id
     */
    api.getDownloadUrl = function (id) {
        return sendToSocket('downloadFile', {id: id});
    };

    /**
     * Delete a file.
     * @param {string} id
     */
    api.removeFile = function (id) {
        if (!id) return Promise.reject();
        return sendToSocket('removeFile', {ids: [id]});
    };

    /**
     * Nuke a file.
     * @param {string} id
     */
    api.nukeFile = function (id) {
        if (!id) return Promise.reject();
        return sendToSocket('nukeFile', {ids: [id]});
    };

    //------------------------------------------------------------------------------------------------------------------
    //-- MESSAGE/COLLECTION INDEX API METHODS --------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns maximum index id that exists for messages
     */
    api.getMaxMessageIndexID = function () {
        return sendToSocket('indexCount');
    };

    /**
     * Retrieves message index entries
     */
    api.getMessageIndexEntries = function (from, to) {
        return sendToSocket('indexQuery', {query: from === to ? [from] : [[from, to]]});
    };

    /**
     * Retrieves contact/file/folders collections versions
     */
    api.getCollectionsVersion = function () {
        return sendToSocket('getCollectionsVersion');
    };

};
