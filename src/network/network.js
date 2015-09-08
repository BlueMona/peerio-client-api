/**
 * Peerio network protocol implementation
 */

// todo: socket should not attempt reconnection when device is offline

var Peerio = this.Peerio || {};
Peerio.Net = {};

Peerio.Net.init = function () {
  'use strict';
  var API_VERSION = '2';
  var api = Peerio.Net;
  delete Peerio.Net.init;
  var hasProp = Peerio.Util.hasProp;
  //-- SOCKET EVENT HANDLING, AUTH & CONNECTION STATE ------------------------------------------------------------------
  var connected = false;
  var authenticated = false;
  var user = null;

  // some events, Peerio.Net consumer might be interested in
  api.EVENTS = {
    onConnect: 'onConnect',
    onDisconnect: 'onDisconnect',
    onAuthenticated: 'onAuthenticated',
    onAuthFail: 'onAuthFail'
  };

  // Peerio.Net.EVENT handlers grouped by event types
  // - subscription is available through public api
  // - there is no way to unsubscribe atm, it's not needed
  var netEventHandlers = {};
  _.forOwn(api.EVENTS, function (val) {
    netEventHandlers[val] = [];
  });

  // calls Peerio.Net.EVENTS handlers
  function fireEvent(name) {
    netEventHandlers[name].forEach(function (handler) {
      window.setTimeout(function () {
        try {
          handler();
        } catch (e) {
          console.error(e);
        }
      }, 0);
    });
  }

  var socketEventHandlers = {
    connect: onConnect,
    disconnect: onDisconnect
  };

  /**
   * Injects Peerio socket event handlers.
   * App logic is supposed to handle those events, but Net has nothing to do over this data,
   * so we make a simple way for Net to transfer events to App Logic
   * @param {string} eventName
   * @param {function} handler
   */
  api.injectPeerioEventHandler = function (eventName, handler) {
    if (socketEventHandlers[eventName]) throw eventName + ' handler already injected.';
    socketEventHandlers[eventName] = handler;
  };

  // this listens to socket.io events
  Peerio.Socket.injectEventHandler(function (eventName, data) {
    var handler = socketEventHandlers[eventName];
    if (handler) {
      handler(data);
    } else {
      console.log('unhandled socket event ', eventName, data);
    }

  });

  function onConnect() {
    sendToSocket('setApiVersion', {version: API_VERSION}, true)
      .then(function () {
        Peerio.Action.socketConnect();
        connected = true;
        fireEvent(api.EVENTS.onConnect);
        api.login(user, true)
          .catch(function (err) {
            console.log('Auto re-login failed. No new attempts will be made until reconnect.', err);
          });
      })
      .timeout(15000)// no crazy science behind this magic number, just common sense
      .catch(function (err) {
        // todo: this should not really happen
        // todo: if it does and it's a server problem, we should limit the number of attempts, or make them sparse
        console.error('setApiVersion ' + API_VERSION + ' failed', err);
        Peerio.Socket.reconnect();
      });
  }

  function onDisconnect() {
    // in case of errors disconnect events might be fired without 'connect' event between them
    // so we make sure we handle first event only
    if (!connected) return;
    Peerio.Action.socketDisconnect();
    rejectAllPromises();
    connected = false;
    authenticated = false;
    fireEvent(api.EVENTS.onDisconnect);
  }

  /**
   * Authenticates current socket session.
   * Stores user object to re-login automatically in case of reconnection.
   * @param {Peerio.Model.User} userObj
   * @param {bool} [autoLogin] - true when login was called automatically after reconnect
   * @promise {Peerio.Model.User} - resolves with authenticated user object
   */
  api.login = function (userObj, autoLogin) {
    if (!userObj) return Promise.reject();
    user = userObj;

    return sendToSocket('getAuthenticationToken', {
      username: user.username,
      publicKeyString: user.publicKey
    })
      .then(function (encryptedAuthToken) {
        return Peerio.Crypto.decryptAuthToken(encryptedAuthToken, user.keyPair);
      })
      .then(function (authToken) {
        return sendToSocket('login', {authToken: authToken});
      })
      .then(function () {
        authenticated = true;
        console.log('authenticated');
        if (autoLogin)
          fireEvent(api.EVENTS.onAuthenticated);

        return user;
      })
      .timeout(60000) // magic number based on common sense
      .catch(function (err) {
        // if it was a call from login page, we don't want to use wrong credentials upon reconnect
        console.log('authentication failed.', err);
        if (!autoLogin) user = null;
        else fireEvent(api.EVENTS.onAuthFail);
        return Promise.reject(err);
      });
  };

  //-- PROMISE MANAGEMENT ----------------------------------------------------------------------------------------------
  // here we store all pending promises by unique id
  var pending = {};
  // safe max promise id under 32-bit integer. Once we reach maximum, id resets to 0.
  var maxId = 4000000000;
  var currentId = 0;

  // registers new promise reject function and returns a unique id for it
  function addPendingPromise(rejectFn) {
    if (++currentId > maxId) currentId = 0;
    pending[currentId] = rejectFn;
    return currentId;
  }

  // removes previously registered promise rejection fn by id
  function removePendingPromise(id) {
    Peerio.Action.loadingDone();
    delete pending[id];
  }

  // rejects all pending promises. useful in case of socket errors, logout.
  function rejectAllPromises() {
    _.forOwn(pending, function (reject) {
      reject();
    });
    currentId = 0;
  }

  //-- HELPERS ---------------------------------------------------------------------------------------------------------
  /**
   *  generalized DRY function to use from public api functions
   *  @param {string} name - message name
   *  @param {Object} [data] - object to send
   *  @param {bool} [ignoreConnectionState] - only setApiVersion needs it, couldn't find more elegant way
   *  @promise
   */
  function sendToSocket(name, data, ignoreConnectionState) {
    if (!connected && !ignoreConnectionState) return Promise.reject('Not connected.');
    // unique (within reasonable time frame) promise id
    var id = null;

    return new Promise(function (resolve, reject) {
      Peerio.Action.loading();
      id = addPendingPromise(reject);
      Peerio.Socket.send(name, data, resolve);
    })
      // we want to catch all exceptions, log them and reject promise
      .catch(function (error) {
        console.log(error);
        return Promise.reject();
      })
      // if we got response, let's check it for 'error' property and reject promise if it exists
      .then(function (response) {
        return hasProp(response, 'error')
          ? Promise.reject(new PeerioServerError(response.error))
          : Promise.resolve(response);
      })
      .finally(removePendingPromise.bind(this, id));
  }

  //-- PUBLIC API ------------------------------------------------------------------------------------------------------

  /**
   * Subscribes a handler to network event
   * @param {string} eventName - one of the Peerio.Net.EVENTS values
   * @param {function} handler - event handler, no arguments will be passed
   */
  api.addEventListener = function (eventName, handler) {
    netEventHandlers[eventName].push(handler);
  };

  /**
   * Asks the server to validate a username.
   * @param {string}  username - Username to validate.
   * @promise {Boolean} - true if username is valid (free)
   */
  api.validateUsername = function (username) {
    if (!username) { return Promise.resolve(false); }
    return sendToSocket('validateUsername', {username: username})
      .then(function(response){
        return response.available;
      })
      .catch(PeerioServerError, function (error) {
        if (error.code === 400) return Promise.resolve(false);
        else return Promise.reject();
      });
  };

  /**
   * Asks the server to validate an address(email or phone).
   * @param {string} address  - Address to validate.
   * @promise {Boolean} - true if address is valid and not yet registered, false otherwise
   */
  api.validateAddress = function (address) {
    var parsed = Peerio.Util.parseAddress(address);
    if (!parsed) return Promise.resolve(false);
    return sendToSocket('validateAddress', {address: parsed})
      .return(true)
      .catch(PeerioServerError, function (error) {
        if (error.code === 400) return Promise.resolve(false);
        else return Promise.reject();
      });
  };

  /**
   * Begins an account registration challenge with the server.
   * @param {Peerio.Model.AccountInfo} accountInfo - Contains account information.
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
    return sendToSocket('register', accountInfo);
  };

  /**
   * Begins an account registration challenge with the server.
   * @param {string} decryptedToken - Contains account information.
   * @promise {Boolean} - always returns true or throws a PeerioServerError
   */
  api.activateAccount = function (decryptedToken) {
    return sendToSocket('activateAccount', {accountCreationToken: decryptedToken})
      .return(true);
  };

  /**
   * Sends back an address confirmation code for the user's email/phone number.
   * @param {string} username
   * @param {number} confirmationCode - 8 digit number.
   * @promise {Boolean}
   */
  api.confirmAddress = function (username, confirmationCode) {
    return sendToSocket('confirmAddress', {username: username, confirmationCode: confirmationCode})
      .return(true);
  };

  /**
   * Gets user settings and some personal data
   * @promise {{todo}}
   */
  api.getSettings = function () {
    return sendToSocket('getSettings');
  };

  /**
   * Change settings.
   * @param {object} settings
   * @promise
   */
  api.updateSettings = function (settings) {
    return sendToSocket('updateSettings', settings);
  };

  /**
   * Adds a new user address. Requires confirmation to make changes permanent.
   * @param {{type: 'email'||'phone', value: address }} address
   * @promise
   */
  api.addAddress = function (address) {
    return sendToSocket('addAddress', address);
  };

  /**
   * Confirms an address using confirmation code.
   * @param {string} code
   * @promise
   */
  api.confirmAddress = function (code) {
    return sendToSocket('confirmAddress', {confirmationCode: code});
  };

  /**
   * Sets an address as the primary address.
   * @param {string} address
   * @promise
   */
  api.setPrimaryAddress = function (address) {
    return sendToSocket('setPrimaryAddress', {address: address});
  };

  /**
   * Removes an address from user's account.
   * @param {string} address
   * @promise
   */
  api.removeAddress = function (address) {
    return sendToSocket('removeAddress', {address: address});
  };

  /**
   * Gets a publicKey for a user.
   * @param {string} username
   * @promise
   */
  api.getPublicKey = function (username) {
    return sendToSocket('getUserPublicKey', {username: username});
  };

  /**
   * Retrieves all contacts for the user.
   * @promise
   */
  api.getContacts = function () {
    return sendToSocket('getContacts');
  };

  /**
   * Retrieves all sent contact requests.
   * @promise
   */
  api.getSentContactRequests = function () {
    return sendToSocket('getSentContactRequests');
  };

  /**
   * Retrieves all received contact requests.
   * @promise
   */
  api.getReceivedContactRequests = function () {
    return sendToSocket('getReceivedContactRequests');
  };

  /**
   * Retrieves a Peerio username from an address.
   * @param {Object} address
   * @promise
   */
  api.addressLookup = function (address) {
    return sendToSocket('addressLookup', address);
  };

  /**
   * Sends a contact request to a username.
   * @param {string} username
   * @promise
   */
  api.addContact = function (username) {
    return sendToSocket('addContact', {contacts: [{username: username}]});
  };

  /**
   * Cancel a contact request previously sent to a username.
   * @param {string} username
   * @promise
   */
  api.cancelContactRequest = function (username) {
    return sendToSocket('cancelContactRequest', {username: username});
  };

  /**
   * Accept a contact request from a username.
   * @param {string} username
   * @promise
   */
  api.acceptContactRequest = function (username) {
    return sendToSocket('acceptContactRequest', {username: username});
  };

  /**
   * Decline a contact request from a username.
   * @param {string} username
   * @promise
   */
  api.declineContactRequest = function (username) {
    return sendToSocket('declineContactRequest', {username: username});
  };

  /**
   * Removes a username as a contact.
   * @param {string} username
   * @promise
   */
  api.removeContact = function (username) {
    return sendToSocket('removeContact', {username: username});
  };

  /**
   * Send a Peerio invitation to an address.
   * @param {Object} address
   * @promise
   */
  Peerio.Net.inviteUserAddress = function (address) {
    return sendToSocket('inviteUserAddress', {address: address});
  };

  /**
   * Send a Peerio message to contacts.
   * @param {Object} msg
   * @promise
   */
  Peerio.Net.createMessage = function (msg) {
    return sendToSocket('createMessage', msg);
  };

  /**
   * Retrieve a list of all user messages.
   * @promise
   */
  api.getAllMessages = function () {
    return sendToSocket('getAllMessages');
  };

  /**
   * Retrieve a message by its ID.
   * @param {array} ids - Array of all message IDs.
   * @promise
   */
  api.getMessages = function (ids) {
    return sendToSocket('getMessages', {ids: ids});
  };

  /**
   * Retrieve a list of all user message IDs.
   * @promise
   */
  api.getMessageIDs = function () {
    return sendToSocket('getMessageIDs');
  };

  /**
   * Retrieve a list of all unopened/modified IDs.
   * @promise
   */
  api.getModifiedMessageIDs = function () {
    return sendToSocket('getModifiedMessageIDs');
  };

  /**
   * Retrieve list of conversation IDs only.
   * @promise
   */
  api.getConversationIDs = function () {
    return sendToSocket('getConversationIDs');
  };

  /**
   * Retrieve list of conversations.
   * @promise
   */
  api.getAllConversations = function () {
    return sendToSocket('getAllConversations', {});
  };

  /**
   * Retrieve entire conversations.
   * @param {[]} conversations - Contains objects in format {id, page}
   * @promise
   */
  api.getConversationPages = function (conversations) {
    return sendToSocket('getConversationPages', {conversations: conversations});
  };

  /**
   * Mark a message as read.
   * @param {Array} read - array containing {id, encryptedReturnReceipt} objects
   * @promise
   */
  api.readMessages = function (read) {
    return sendToSocket('readMessages', {read: read});
  };

  /**
   * Remove a conversation and optionally also remove files.
   * @param {array} ids
   * @promise
   */
  api.removeConversation = function (ids) {
    return sendToSocket('removeConversation', {ids: ids});
  };

  /**
   * Initiate a file upload.
   * @param {object} uploadFileObject - containing:
   {object} header,
   {string} ciphertext,
   {number} totalChunks,
   {string} clientFileID,
   {string} parentFolder (optional)
   * @promise
   */
  api.uploadFile = function (uploadFileObject) {
    return sendToSocket('uploadFile', uploadFileObject);
  };

  /**
   * Uploads a file chunk.
   * @param {object} chunkObject - containing:
   {string} ciphertext,
   {number} chunkNumber,
   {string} clientFileID,
   * @promise
   */
  api.uploadFileChunk = function (chunkObject) {
    return sendToSocket('uploadFileChunk', chunkObject);
  };

  /**
   * Retrieve information about a single file.
   * @param {string} id
   * @promise
   */
  api.getFile = function (id) {
    return sendToSocket('getFile', {id: id});
  };

  /**
   * Retrieve a list of all user files.
   * @promise
   */
  api.getFiles = function () {
    return sendToSocket('getFiles');
  };

  /**
   * Retrieve file download information.
   * @param {string} id
   * @promise
   */
  api.downloadFile = function (id) {
    return sendToSocket('downloadFile', {id: id});
  };

  /**
   * Delete a file.
   * @param {array} ids - Contains id strings.
   * @promise
   */
  api.removeFile = function (ids) {
    return sendToSocket('removeFile', {ids: ids});
  };

  /**
   * Nuke a file.
   * @param {array} ids - Contains id strings.
   * @promise
   */
  api.nukeFile = function (ids) {
    return sendToSocket('nukeFile', {ids: ids});
  };

  /**
   * Set up 2FA. Returns a TOTP shared secret.
   * @promise
   */
  api.setUp2FA = function () {
    return sendToSocket('setUp2FA');
  };

  /**
   * Confirm 2FA. Send a code to confirm the shared secret.
   * @param {number} code
   * @promise
   */
  api.confirm2FA = function (code) {
    return sendToSocket('confirm2FA', {twoFACode: code});
  };

  /**
   * Generic 2FA. Send a code to auth.
   * @param {number} code
   * @param {string} username
   * @param {string} publicKey
   * @promise
   */
  api.validate2FA = function (code, username, publicKey) {
    return sendToSocket('validate2FA', {
      twoFACode: code,
      username: username,
      publicKeyString: publicKey
    });
  };

  /**
   * Delete account.
   * @promise
   */
  api.closeAccount = function () {
    return sendToSocket('closeAccount');
  };

};