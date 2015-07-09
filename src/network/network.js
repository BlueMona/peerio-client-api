/**
 * Peerio network protocol implementation
 */

var Peerio = this.Peerio || {};
Peerio.Net = {};

(function () {
  'use strict';

  var api = Peerio.Net;
  // malicious server safe hasOwnProperty function
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);

  //-- PRIVATE: PROMISE MANAGEMENT -------------------------------------------------------------------------------------
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
    delete pending[id];
  }

  var ServerErrors = {
    getMessage: function (code) {
      return this[code] || 'Server error.';
    },
    404: 'Resource does not exist or you are not allowed to access it.',
    413: 'Storage quota exceeded.',
    406: 'Malformed request.',
    423: 'Authentication error.',
    424: 'Two-factor authentication required.',
    425: 'The account has been throttled (sent too many requests that failed to authenticate).',
    426: 'User blacklisted.'
  };
  // rejects all pending promises. useful in case of socket errors, logout.
  function rejectAllPromises() {
    _.forOwn(pending, function (reject) {
      reject();
    });
    pending = {};
    currentId = 0;
  }

  function PeerioServerError(code) {
    this.code = +code;
    this.message = ServerErrors.getMessage(code);
    this.timestamp = Date.now();
    this.isOperational = true;
  }

  PeerioServerError.prototype = Object.create(Error.prototype);

  /**
   *  generalized DRY function to use from public api functions
   *  @param {string} name - message name
   *  @param {Object} [data] - object to send
   */
  function sendToSocket(name, data) {
    // unique (within reasonable time frame) promise id
    var id = null;

    return new Promise(function (resolve, reject) {
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

  /**
   * Asks the server to validate a username.
   * @param {string}  username - Username to validate.
   * @promise {Boolean} - true if username is valid (free)
   */
  api.validateUsername = function (username) {
    if (!username) { return Promise.resolve(false); }
    return sendToSocket('validateUsername', {username: username})
      .return(true)
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
   *            ephemeralServerID: 'server's public key (Base58 String)'
   *          }} - server response
   */
  api.registerAccount = function (accountInfo) {
    return sendToSocket('registrationRequest', accountInfo);
  };

  /**
   * Begins an account registration challenge with the server.
   * @param {string} decryptedToken - Contains account information.
   * @promise {Boolean} - always returns true or throws a PeerioServerError
   */
  api.returnAccountCreationToken = function (decryptedToken) {
    return sendToSocket('accountCreationResponse', {accountCreationToken: decryptedToken})
      .return(true);
  };

  /**
   * Sends back an account confirmation code for the user's email/phone number.
   * @param {string} username
   * @param {number} confirmationCode - 8 digit number.
   * @promise {Boolean}
   */
  api.sendAccountConfirmation = function (username, confirmationCode) {
    return sendToSocket('accountConfirmation', {username: username, confirmationCode: confirmationCode})
      .return(true);
  };

  /**
   * Sends a request for authToken.
   * @param {string} username
   * @param {string} publicKey
   * @promise {{ ephemeralServerID: 'miniLock ID of server (Base58 String)',
   *             token: 'Encrypted token (Base64 String)',
   *             nonce: 'Nonce used to encrypt the token (Base64 string)' }}
   */
  api.getAuthenticationToken = function (username, publicKey) {
    return sendToSocket('getAuthenticationToken', {username: username, miniLockID: publicKey, apiVersion: '2.0.0'});
  };

  /**
   * Authenticates current websocket session
   * @param {string} authToken - decrypted auth token
   */
  api.login = function (authToken) {
    return sendToSocket('login', {authToken: authToken})
      .return(true)
      .catch(function () {
        return Promise.reject();
      });
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
    return sendToSocket('getMiniLockID', {username: username});
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
   * @param {array} contacts - Contains objects which either have a `username` or `address` property
   * @promise
   */
  api.addContact = function (contacts) {
    return sendToSocket('addContact', {contacts: contacts});
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
    var socketMsg = {
      isDraft: msg.isDraft,
      recipients: msg.recipients,
      header: msg.header,
      body: msg.body,
      files: msg.files
    };
    if (hasProp(msg, 'conversationID'))
      socketMsg.conversationID = msg.conversationID;

    return sendToSocket('createMessage', socketMsg);
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
   * @param {array} conversations - Contains objects in format {id, page}
   * @promise
   */
  api.getConversationPages = function (conversations) {
    return sendToSocket('getConversationPages', {conversations: conversations});
  };

  /**
   * Mark a message as read.
   * @param {array} read - array containing {id, encryptedReturnReceipt} objects
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
      miniLockID: publicKey
    });
  };

  /**
   * Delete account.
   * @promise
   */
  Peerio.Net.closeAccount = function () {
    return sendToSocket('closeAccount');
  };

}());