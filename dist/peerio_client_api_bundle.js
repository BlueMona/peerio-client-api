/**
 * Peerio passphrase generator
 *
 */


var Peerio = this.Peerio || {};
Peerio.PhraseGenerator = {};

Peerio.PhraseGenerator.init = function () {
  'use strict';

  var api = Peerio.PhraseGenerator = {};

  // dictionary for the language required will be loaded here
  var loadedDictionary = null;

  // building dictionary files list
  var base = Peerio.Config.apiFolder + 'dict/';

  /**
   * Generates passphrase
   * @param {string} lang - 2-letter language code
   * @param {Number} wordsCount - number of words in passphrase
   * @promise {string}
   */
  api.getPassPhrase = function (lang, wordsCount) {
    return buildDict(lang).then(function () {
      return generate(wordsCount);
    });
  };
  /**
   * Frees some RAM by cleaning cached dictionary.
   * Call this when PhraseGenerator is no longer needed.
   * PhraseGenerator is still usable after this call.
   */
  api.cleanup = function () {
    loadedDictionary = null;
  };

  function generate(wordsCount) {
    if (!loadedDictionary) return null;

    var phrase = '';
    for (var i = 0; i < wordsCount; i++)
      phrase += getRandomWord() + ' ';

    return phrase.trim().toLowerCase();
  }

  // asynchronously builds dictionary cache for specified language
  function buildDict(lang) {
    if (loadedDictionary && loadedDictionary.lang === lang)
      return Promise.resolve();

    loadedDictionary = null;
    return loadDict(lang)
      .then(function (raw) {
        // normalizing words
        var words = raw.split('\n');
        for (var i = 0; i < words.length; i++) {
          // removing leading/trailing spaces and ensuring lower case
          words[i] = words[i].trim();
          // removing empty strings
          if (words[i] === '') {
            words.splice(i, 1);
            i--;
          }
        }
        loadedDictionary = {lang: lang, dict: words};
      });
  }

  // loads dict by lang and return plaintext in promise
  function loadDict(lang) {
    var url = base + lang + '.txt';
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();

      if (xhr.overrideMimeType)
        xhr.overrideMimeType('text/plain');

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 0)
            resolve(xhr.responseText);
          else
            reject();
        }
      };

      xhr.open('GET', url);
      xhr.send('');
    });
  }

  function getRandomWord() {
    return loadedDictionary.dict[Math.floor(secureRandom() * loadedDictionary.dict.length)];
  }

  // todo move to Util?
  function secureRandom() {
    var result = '0.';
    var buffer = new Uint8Array(32);
    //todo this is not environment agnostic, move to Peerio.Util and polyfill
    window.crypto.getRandomValues(buffer);
    for (var i = 0; i < buffer.length; i++) {
      if (buffer[i] <= 249)
        result += (buffer[i] % 10).toString();
    }
    return parseFloat(result);
  }

};

/**
 *  Crypto Hub
 *  ===========================================
 *  Provides access to N crypto worker instances, allowing to parallelise crypto operations.
 *  Crypto Hub functions use the same namespace and signatures
 *  as original Peerio.Crypto library does.
 *  This allows us to replace worker with regular UI-thread Peerio.Crypto library in no time.
 *
 */


var Peerio = this.Peerio || {};
Peerio.Crypto = {};

Peerio.Crypto.init = function () {
  'use strict';

  Peerio.Crypto = {};
  // malicious server safe hasOwnProperty function;
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);
  // web worker instance
  var workers = []; // todo: maybe add a limit
  // pending promises callbacks
  // id: {resolve: resolve callback, reject: reject callback}
  var callbacks = {};
  var workerCount = Math.min(Peerio.Config.cpuCount, 4);
  // creating worker instances
  for (var i = 0; i < workerCount; i++) {
    workers[i] = new Worker(Peerio.Config.apiFolder + 'crypto_worker_bundle.js');
    // handling a message from worker
    workers[i].onmessage = function (message) {
      var data = message.data;
      var promise = callbacks[data.id];

      if (hasProp(data, 'error'))
        promise.reject(data.error);
      else
        promise.resolve(data.result);

      delete callbacks[data.id];
    };
  }
  var lastWorkerIndex = -1;
  // returns new worker instance in cycle
  function getWorker() {
    if (++lastWorkerIndex === workers.length)
      lastWorkerIndex = 0;
    return workers[lastWorkerIndex];
  }

  // this two methods should execute on all workers
  // they don't expect a response from worker
  [
    'setDefaultUserData',
    'setDefaultContacts'
  ].forEach(function (fnName) {
      Peerio.Crypto[fnName] = function () {
        var args = [];
        for (var a = 0; a < arguments.length; a++)
          args[a] = arguments[a];

        for (var w = 0; w < workers.length; w++)
          workers[w].postMessage({fnName: fnName, args: args});
      };
    });

  // this methods will execute on one of the workers,
  // each of them expect response from worker
  [
    'getKeyPair',
    'getPublicKeyString',
    'getPublicKeyBytes',
    'secretBoxEncrypt',
    'secretBoxDecrypt',
    'getKeyFromPIN',
    'decryptAccountCreationToken',
    'decryptAuthToken',
    'getAvatar',
    'encryptMessage',
    'encryptFile',
    'decryptMessage',
    'decryptFile',
    'decryptFileName'
  ].forEach(function (fnName) {
      Peerio.Crypto[fnName] = function () {
        var id = uuid();
        // we copy arguments object data into array, because that's what worker is expecting to use it with apply()
        // don't change this to Array.slice() because it will prevent runtime optimisation
        var args = [];
        for (var i = 0; i < arguments.length; i++)
          args[i] = arguments[i];

        var ret = new Promise(function (resolve, reject) {
          callbacks[id] = {
            resolve: resolve,
            reject: reject
          };
        });
        getWorker().postMessage({id: id, fnName: fnName, args: args});
        return ret;
      };
    });

};

// Peerio AccountInfo object

var Peerio = this.Peerio || {};
Peerio.Model = Peerio.Model || {};

(function () {
  'use strict';

  /**
   * @param username
   * @param firstName
   * @param lastName
   * @param publicKey - base58 string
   * @param localeCode
   * @constructor
   */
  Peerio.Model.AccountInfo = function (username, firstName, lastName, publicKey, localeCode) {

    this.username = username;
    this.firstName = firstName;
    this.lastName = lastName;
    this.publicKeyString = publicKey;
    this.localeCode = localeCode || 'en';
  };

})();
/**
 * Custom js Error object.
 * Network layer creates this object on server errors.
 */

function PeerioServerError(code) {
  this.code = +code;
  this.message = this.getMessage(code);
  this.timestamp = Date.now();
  this.isOperational = true;
}

PeerioServerError.prototype = Object.create(Error.prototype);

PeerioServerError.prototype.getMessage = function (code) {
  return this.errorCodes[code] || 'Server error.';
};

PeerioServerError.prototype.errorCodes = {
  404: 'Resource does not exist or you are not allowed to access it.',
  413: 'Storage quota exceeded.',
  406: 'Malformed request.',
  423: 'Authentication error.',
  424: 'Two-factor authentication required.',
  425: 'The account has been throttled (sent too many requests that failed to authenticate).',
  426: 'User blacklisted.'
};
// Peerio User object

var Peerio = this.Peerio || {};
Peerio.Model = Peerio.Model || {};

(function(){
  'use strict';

  Peerio.Model.User = function(username, publicKey, isMe){
    this.username = username;
    this.publicKey = publicKey;
    this.isMe = !!isMe;

    if(this.isMe){
      this.contacts = {};
      this.keyPair = {};
    }

  };

})();
/**
 * Peerio network protocol implementation
 */

// todo: socket should not attempt reconnection when device is offline

var Peerio = this.Peerio || {};
Peerio.Net = {};

Peerio.Net.init = function () {
  'use strict';
  var API_VERSION = '2.0.0';
  var api = Peerio.Net = {};
  var hasProp = Peerio.Util.hasProp;
  //-- SOCKET EVENT HANDLING, AUTH & CONNECTION STATE ------------------------------------------------------------------
  var connected = false;
  var authenticated = false;
  var credentials = null;

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

  // this listens to socket.io events
  Peerio.Socket.injectEventHandler(function (eventName) {
    var handler = socketEventHandlers[eventName];
    if (handler) {
      handler();
    } else {
      console.log('unknown socket event ', eventName);
    }

  });

  function onConnect() {
    sendToSocket('setApiVersion', {version: API_VERSION})
      .then(function () {
        connected = true;
        fireEvent(api.EVENTS.onConnect);
        login();
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

    rejectAllPromises();
    connected = false;
    authenticated = false;
    fireEvent(api.EVENTS.onDisconnect);
  }

  function login() {
    if (!credentials) return;

    sendToSocket('getAuthenticationToken', {
      username: credentials.username,
      publicKeyString: credentials.publicKeyString
    })
      .then(function (encryptedAuthToken) {
        return Peerio.Crypto.decryptAuthToken(encryptedAuthToken, credentials.keyPair);
      })
      .then(function (authToken) {
        return sendToSocket('login', {authToken: authToken});
      })
      .then(function () {
        authenticated = true;
        console.log('authenticated');
        fireEvent(api.EVENTS.onAuthenticated);
      })
      .timeout(60000) // magic number based on common sense
      .catch(function () {
        console.log('authentication failed');
        fireEvent(api.EVENTS.onAuthFail);
      });
  }

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
    delete pending[id];
  }

  // rejects all pending promises. useful in case of socket errors, logout.
  function rejectAllPromises() {
    _.forOwn(pending, function (reject) {
      reject();
    });
    pending = {};
    currentId = 0;
  }

  //-- HELPERS ---------------------------------------------------------------------------------------------------------
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
   *            ephemeralServerKey: 'server's public key (Base58 String)'
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
   * Authenticates current websocket session.
   * Only need to call this once per app runtime, because credentials are being cached
   * and connection authenticates on every reconnect.
   * @param {string} username
   * @param {string} passphrase
   * @returns nothing. Provides api to read connection/auth state and events.
   */
  api.setCredentials = function (username, passphrase) {
    Peerio.Crypto.getKeyPair(username, passphrase).then(function (keys) {
      credentials = {
        username: username,
        publicKeyString: null,
        keyPair: {
          publicKey: keys.publicKey,
          secretKey: keys.secretKey
        }
      };
      return Peerio.Crypto.getPublicKeyString(keys.publicKey);
    }).then(function (publicKey) {
      credentials.publicKeyString = publicKey;
      login();
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
/**
 *  Portion of web socket handling code that runs in UI thread.
 *  This code provides a thin layer between socket instance in web worker
 *  and networking layer.
 */

var Peerio = this.Peerio || {};
Peerio.Socket = {};
/**
 * Initialises Peerio Socket handling code
 */
Peerio.Socket.init = function () {
  'use strict';

  Peerio.Socket = {};
  // malicious server safe hasOwnProperty function;
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);
  // webworker instance
  var worker;
  // socket events handler
  var eventHandler;
  // pending callbacks id:function
  var callbacks = {};

  /**
   *  Subscribes a callback to socket events and server push notifications.
   *  This method exists to provide better layer decoupling
   *  and is supposed to be called only once, there is no need for multiple handlers in current app design.
   *  @param {function(string)} handler - callback will be called with string parameter - event name.
   */
  Peerio.Socket.injectEventHandler = function (handler) {
    if (eventHandler) throw new Error('Socket event handler already injected.');
    eventHandler = handler;
  };

  Peerio.Socket.start = function () {
    // worker instance holding the actual web socket
    worker = new Worker(Peerio.Config.apiFolder + 'socket_worker_bundle.js');
    // handles messages from web socket containing worker
    worker.onmessage = messageHandler;

    // initializing worker
    worker.postMessage(Peerio.Config);
  };

  function messageHandler(message) {
    var data = message.data;

    if (hasProp(data, 'callbackID') && data.callbackID) {
      callbacks[data.callbackID](data.data);
      delete callbacks[data.callbackID];
      return;
    }

    if (eventHandler && hasProp(data, 'socketEvent')) {
      eventHandler(data.socketEvent);
    }
  }

  /**
   * Sends message to the serve
   *
   * @param {string} name - message name
   * @param {Object} [data] - message data
   * @param {Function} [callback] - server response
   */
  Peerio.Socket.send = function (name, data, callback) {

    // registering the callback, if provided
    var callbackID = null;
    if (typeof(callback) === 'function') {
      callbackID = uuid();
      callbacks[callbackID] = callback;
    }

    // object to send
    var message = {
      name: name,
      data: data,
      callbackID: callbackID
    };

    // for file upload we want to transfer ownership of the chunk data
    // so it won't get copied
    var transfer = null;
    if (name === 'uploadFileChunk') {
      transfer = [message.ciphertext];
    }

    worker.postMessage(message, transfer);
  };
  /**
   * Breaks current connection and reconnects
   */
  Peerio.Socket.reconnect = function () {
    worker.postMessage({name: 'reconnectSocket'});
  };
};

/**
 * Various Peerio utility functions
 */

var Peerio = this.Peerio || {};
Peerio.Util = {};

Peerio.Util.init = function () {
  'use strict';

  var api = Peerio.Util = {};

  /**
   *  malicious server safe hasOwnProperty function
   *  @param {object} object to test for property existence, can be null or undefined
   *  @param {string} property name
   */
  api.hasProp = Function.call.bind(Object.prototype.hasOwnProperty);

  var emailExp = new RegExp('^([-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\\.[a-zA-Z]{2,20})$');
  var phoneExp = new RegExp('^\\+?(\\d|\\s|\\-|\\(|\\)){6,20}$');

  /**
   * Parses an address and returns its type and parsed format.
   * In the case of phone numbers, the number is stripped from any non-digits.
   * @param {string} address - Address to parse.
   * @return {object} {type:'email||phone', address:'parsed address'}
   */
  api.parseAddress = function (address) {
    if (emailExp.test(address)) {
      return {
        type: 'email',
        value: address.match(emailExp)[0]
      };
    }

    if (phoneExp.test(address)) {
      var phone = address.match(phoneExp)[0].split('');

      for (var i = 0; i < phone.length; i++) {
        if (!phone[i].match(/\d/))
          phone.splice(i, 1);
      }

      return {
        type: 'phone',
        value: phone.join('')
      };
    }

    return false;
  };

};
/**
 * Main library file, contains initialisation code
 */

var Peerio = this.Peerio || {};

/**
 * Initializes all API modules.
 * This should be called whenever DOM/Device is ready.
 * Init order matters.
 */
Peerio.initAPI = function () {
  Peerio.Config.init();
  Peerio.Config.apiFolder = Peerio.apiFolder;
  delete Peerio.apiFolder;
  Peerio.Util.init();
  Peerio.Crypto.init();
  Peerio.PhraseGenerator.init();
  Peerio.Socket.init();
  Peerio.Net.init();

  Peerio.Socket.start();

  delete Peerio.initAPI;
};

// detecting api folder, this has to be done at script's first evaluation,
// and assumes there are no async scripts
(function () {
  'use strict';

  var path = document.currentScript && document.currentScript.getAttribute('src')
    || document.scripts[document.scripts.length - 1].getAttribute('src');
  // temporary saving api folder in rooot namespace until Config is initalized
  Peerio.apiFolder = path.substring(0, path.lastIndexOf('/')) + '/';
}());