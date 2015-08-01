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
    return loadedDictionary.dict[secureRandom(loadedDictionary.dict.length)];
  }

  function secureRandom(count) {
    var rand = new Uint32Array(1);
    var skip = 0x7fffffff - 0x7fffffff % count;
    var result;

    if (((count - 1) & count) === 0) {
      window.crypto.getRandomValues(rand);
      return rand[0] & (count - 1);
    }
    do {
      window.crypto.getRandomValues(rand);
      result = rand[0] & 0x7fffffff;
    } while (result >= skip);
    return result % count;
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
 * Centralized place to collect and provide global application state information.
 * This is useful for components which were instantiated too late to be able to handle previous events.
 */

var Peerio = this.Peerio || {};
Peerio.AppState = {};

Peerio.AppState.init = function () {
  'use strict';

  var api = Peerio.AppState = {};
  var d = Peerio.Dispatcher;

  // initial state
  api.loading = false;     // is app currently transferring/waiting for data
  api.connected = false;   // is app connected to peerio server socket
  api.authenticated = false; // is current connection authenticated

  /**
   * Adds a custom state rule to AppState.
   * You can provide your own logic of how AppState properties change on Dispatcher events.
   * On *action* event, *property* will be set to *value* or to return value of the *value* function.
   * @param {string} action - action name that will trigger this rule
   * @param {string} property - app state property name (will be available as AppState.property)
   * @param {null|string|number|object|Function} value - the value to set to property. Or function that will return such value.
   */
  api.addStateRule = function (action, property, value) {
    var setFn;
    if (typeof(value) === 'function') {
      setFn = value.bind(api);
    } else {
      setFn = setState.bind(api, property, value);
    }
    d['on' + action](setFn);
  };
  /**
   * Executes specified function on specified action.
   * This is pretty much the same as addStateRule, but manipulates state inside of passed function.
   * @param {string} action - action name that will trigger handler execution
   * @param {function} handler - function that will handle the action event
   */
  api.addStateTrigger = function (action, handler) {
    d['on' + action](handler.bind(api));
  };

  function setState(prop, value) {
    this[prop] = value;
  }

  // subscribing to state-changing events
  d.onLoading(setState.bind(api, 'loading', true));
  d.onLoadingDone(setState.bind(api, 'loading', false));

  d.onSocketConnect(setState.bind(api, 'connected', true));
  d.onSocketDisconnect(function () {
    api.connected = false;
    api.authenticated = false;
  });

  d.onAuthenticated(setState.bind(api, 'authenticated', true));

};
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
 * Tiny permanent storage abstraction/wrapper.
 * Use it for storing small (few megabytes) data only.
 */

var Peerio = this.Peerio || {};
Peerio.TinyDB = {};

Peerio.TinyDB.init = function () {
  'use strict';

  var api = Peerio.TinyDB = {};
  // currently, localStorage is fine for all platforms
  var db = window.localStorage;

  /**
   * Saves scalar value to storage.
   * @param {string} key - unique key. Existing value with the same key will be overwritten.
   * @param {string|number|boolean|null} value - should have toString() function, because storage accepts only strings.
   */
  api.setVar = function (key, value) {
    db.setItem(key, value.toString());
  };

  /**
   * Saves object or array to storage.
   * @param {string} key - unique key. Existing value with the same key will be overwritten.
   * @param {object|Array} value - Will be serialized with JSON.stringify(), because storage accepts only strings.
   */
  api.setObject = function (key, value) {
    db.setItem(key, JSON.stringify(value));
  };

  /**
   * Removes item from storage
   * @param {string} key
   */
  api.removeItem = db.removeItem.bind(db);

  /**
   * Removes all items from storage
   */
  api.clearStorage = db.clear.bind(db);

  /**
   * Retrieves value as string
   * @params {string} key - unique key
   * @returns {string|null} value
   */
  api.getString = function (key) {
    return db.getItem(key);
  };

  /**
   * Retrieves value as number
   * @params {string} key - unique key
   * @returns {number|null} value
   */
  api.getNumber = function (key) {
    var val = db.getItem(key);
    return val == null ? null : +val;
  };

  /**
   * Retrieves value as boolean
   * @params {string} key - unique key
   * @returns {boolean|null} value
   */
  api.getBool = function (key) {
    var val = db.getItem(key);
    return val == null ? null : val === 'true';
  };

  /**
   * Retrieves value as parsed object using JSON.parse()
   * @params {string} key - unique key
   * @returns {object|null} value
   */
  api.getObject = function (key) {
    var val = db.getItem(key);
    return val == null ? null : JSON.parse(val);
  };



};
/**
 *  Peerio Actions to use with Dispatcher
 *  -------------------------------------
 *
 *  use Peerio.Action.ACTION_NAME to reference action name string
 *  use Peerio.Action.ACTION_NAME([params]) to execute action function (first letter of the method is in lower case)
 *  use Peerio.Dispatcher.onACTION_NAME(callback) to subscribe to action
 */

var Peerio = this.Peerio || {};
Peerio.Action = {};

Peerio.Action.init = function () {
  'use strict';

  Peerio.Action = {};

  /**
   * Adds an action to Event System. Creates convenience functions.
   * Use this at any time to add a new action type.
   * There is no way to remove action type atm, as it is not needed.
   * @param {string} actionName - the name of new action. Important: PascalCase.
   */
  Peerio.Action.add = function(actionName){
    if(Peerio.Action[actionName]) throw 'Illegal attempt to register existing Action. Or other property with same name exists.';

    Peerio.Action[actionName] = actionName;

    var actionMethodName = actionName[0].toLowerCase() + actionName.substring(1);
    // creating action function
    Peerio.Action[actionMethodName] = Peerio.Dispatcher.notify.bind(null, actionName);
    Peerio.Dispatcher.addActionType(actionName);
  };

  // Default actions list with parameter information
  // preferable naming style: "Action", "ObjectAction" or "ActionDetail"
  // IMPORTANT NOTE ABOUT NAMING:
  // 1. Action names should always
  //      * Be longer then 1 symbol
  //      * Start from upper case letter
  //      * Example: MyAction
  // 2. Dispatcher subscription methods will be named in following pattern
  //      Peerio.Dispatcher.onMyAction(...subscriber)
  //      e.g. action name will be prefixed with "on"
  // 3. Action names will be available as properties on Actions object like so:
  //      Peerio.Action.MyAction
  //      value of the property === Action name ("MyAction")
  // 4. Action execution methods will have action name but with first letter in lower case
  //      Peerio.Action.myAction(...params)
  [
    //------- ACTIONS EMITTED BY CORE -------
    'SocketConnect',       // WebSocket reported successful connect
    'SocketDisconnect',    // WebSocket reported disconnected(and reconnecting) state
    'Authenticated',       // WebSocket connection was authenticated
    'Loading',             // Data transfer is in process
    'LoadingDone'         // Data transfer ended
    //'LoginProgress',       // {string} state
    //'LoginSuccess',        // login attempt succeeded
    //'LoginFail',           // login attempt failed
    //'TwoFARequest',        // server requested 2fa code
    //'TwoFAValidateSuccess',// 2fa code validation success
    //'TwoFAValidateFail',   // 2fa code validation fail
    //'TOFUFail',            // Contact loader detected TOFU check fail
    //'MessageSentStatus',   // progress report on sending message {object, Peerio.Action.Statuses} internal temporary guid
    //'ConversationUpdated', // messages were updated in single conversation thread {id} conversation id
    //'MessagesUpdated',     // there was an update to the messages in the following conversations {array} conversation ids
    //'ConversationsLoaded', // Peerio.user.conversations was created/replaced from cache or network. Full update.
    //'FilesUpdated',        // Something in user files collection has changed, so you better rerender it
    //'ContactsUpdated',     // One or more contacts loaded/modified/deleted

  ].forEach(function (action) {
      Peerio.Action.add(action);
    });

  // Enums
  Peerio.Action.Statuses = {
    Pending: 0,
    Success: 1,
    Fail: 2
  };

};


/**
 *  Dispatcher manages system-wide events
 *  --------------------------------------------------------------
 *  1. It provides a set of Peerio.Action.*([args]) functions which can be called
 *  by different components to notify other interested components.
 *  (see separate actions.js file).
 *
 *  2. It provides subscription/unsubscription mechanism to allow components to be notified when action happen
 *  Peerio.Dispatcher.subscribe(Peerio.Action.ACTION_NAME, callback_function)
 *  or use syntactic sugar: Peerio.Dispatcher.onACTION_NAME(callback_function)
 *  Peerio.Dispatcher.unsubscribe(subscription_id or callback_function,...)
 *
 *  Subscribers are being called synchronously in reversed order
 *  (last subscriber is called first)
 *  If subscriber returns true (===) processing stops (a la preventDefault).
 *
 *  No other logic is performed here, just dispatching.
 *  In some special cases custom dispatching logic is implemented, see overrides.js
 *
 */

var Peerio = this.Peerio || {};
Peerio.Dispatcher = {};

Peerio.Dispatcher.init = function () {
  'use strict';

  var api = Peerio.Dispatcher = {};

  // subscribers container
  // KEY: action. VALUE: [{id, handler},..] objects array
  var subscribers = {};

  /**
   * subscribes callback to action
   * @param {string} action - one of the events enum values
   * @param {function} handler - action handler
   * @returns {number} - subscription uuid. You can use this id, or the same callback to unsubscribe later.
   */
  api.subscribe = function (action, handler) {
    var id = uuid.v4();
    subscribers[action].push({
      id: id,
      handler: handler
    });
    return id;
  };

  /**
   * Unsubscribes from action
   * @param {...number|...function|[]} arguments -  subscription id or the actual subscribed callback.
   * You can pass one or more parameters with ids or callbacks or arrays containing mixed ids and callbacks
   * Note that if callback is passed, it will be unsubscribed from all actions.
   */
  api.unsubscribe = function () {
    var removeSubscriber = function (subscriber) {
      var predicate = typeof (subscriber) === 'function' ? {handler: subscriber} : {id: subscriber};
      _.forIn(subscribers, function (value) {
        _.remove(value, predicate);
      });
    };
    // if array is passed, we will iterate it. If not, we will iterate arguments.
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      if (Array.isArray(a)) a.forEach(removeSubscriber);
      else removeSubscriber(a);
    }
  };

  /**
   * Notifies subscribers on action and passes optional arguments.
   * This is an abstract function, more convenient specialized functions
   * from Peerio.Action namespace should be used by components
   * @param {string} action - one of Peerio.Action names
   * @param arguments - any additional arguments will be passed to subscribers
   */
  api.notify = function (action) {
    var args = _.rest(arguments);
    var subs = subscribers[action];
    for (var i = subs.length - 1; i >= 0; i--) {
      if (subs[i].handler.apply(null, args) === true) break;
    }
  };

  /**
   * Registers new Action with dispatcher.
   * Adds a onActionName convenience function to Peerio.Dispatcher.
   * YOU SHOULD NOT NORMALLY USE THIS FUNCTION.
   * Instead, register new actions with Peerio.Action.add(actionName).
   * @param {string} actionName - the name of new action. Important: PascalCase.
   */
  api.addActionType = function(actionName){
    if(subscribers[actionName]) throw 'Illegal attempt to register existing Action';
    // pre-creating action subscribers array
    subscribers[actionName] = [];
    // creating syntactic sugar method wrapping Peerio.Dispatcher.subscribe
    api['on' + actionName] = function (handler) {
      return api.subscribe(actionName, handler);
    };
  };

};
/**
 * Special cases for some of the standard action dispatching.
 * You can do the same for your custom actions,
 * just override Peerio.Action.actionName function.
 */


var Peerio = this.Peerio || {};
Peerio.ActionOverrides = {};

Peerio.ActionOverrides.init = function () {
  'use strict';

  Peerio.ActionOverrides = {};

  // Following overrides make sure that Loading action will be dispatched only once until LoadingDone will be called.
  // And LoadingDone will only be dispatched if it corresponds to the number of previously called Loading actions.
  // We need this because consumers are interested in knowing when the app is busy and not when individual tasks are starting and ending.
  (function () {
    var i = Peerio.Action.internal = {};
    i.loadingCounter = 0;
    Peerio.Action.loading = function () {
      if (++i.loadingCounter === 1) Peerio.Dispatcher.notify('Loading');
    };
    Peerio.Action.loadingDone = function () {
      if (--i.loadingCounter === 0) Peerio.Dispatcher.notify('LoadingDone');
      i.loadingCounter = Math.max(i.loadingCounter, 0);
    };
  }());

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
 * Various extensions to system/lib objects
 * ------------------------------------------------------
 */
(function () {
  'use strict';

  String.prototype.isEmpty = function() {
    return (this.length === 0 || !this.trim());
  };

}());

/**
 * Starts Error interceptor and reporter.
 *
 * This script should ideally use vanilla js only,
 * so it won't fail in case of errors in some lib it uses.
 *
 * It also tries to minimize performance impact and be unobtrusive,
 * not reporting the same errors more then once and not caching too much while offline.
 *
 */

var Peerio = this.Peerio || {};
Peerio.ErrorReporter = {};

Peerio.ErrorReporter.init = function () {
  'use strict';

  // Cache of reported errors.
  var reported = {};
  // How many reports are awaiting transmission.
  var queueLength = 0;
  // How many reports are allowed to await transmission.
  var maxQueueLength = 100;
  // in case there is already a handler, we'll save it here
  var oldHandler;

  /**
   * Allows error reporting
   */
  Peerio.ErrorReporter.enable = function () {
    oldHandler = window.onerror;
    window.onerror = errorHandler;
  };

  /**
   * Disables error reporting
   */
  Peerio.ErrorReporter.disable = function () {
    window.onerror = oldHandler;
  };

  function errorHandler(aMessage, aUrl, aRow, aCol, aError) {
    if (oldHandler) oldHandler(aMessage, aUrl, aRow, aCol, aError);

    if (queueLength >= maxQueueLength) return false;
    // check if this error was already reported
    var known = reported[aUrl];
    if (known && known.row === aRow && known.col === aCol) return false;

    // cache this report to prevent reporting it again
    reported[aUrl] = {row: aRow, col: aCol};

    var report = {
      ts: Math.floor(getUTCTimeStamp() / 1000),
      url: aUrl,
      row: aRow,
      col: aCol,
      msg: aMessage,
      version: Peerio.Config.appVersion
    };

    if (aError != null) {
      report.msg = aError.message;
      report.errType = aError.name;
      report.stack = aError.stack;
    }
    queueLength++;
    sendWhenOnline(JSON.stringify(report));
    return false;
  }

  // Forever delays report for 5 minutes while device is offline.
  // Attempts sending the report when device is online.
  function sendWhenOnline(msg) {
    if (navigator.onLine === false) {
      window.setTimeout(sendWhenOnline.bind(window, msg), 5 * 60 * 1000);
      return;
    }
    queueLength--;
    var request = new XMLHttpRequest();
    request.open('POST', Peerio.Config.errorReportServer);
    request.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    request.send(msg);
  }

  function getUTCTimeStamp() {
    var now = new Date();
    return now.valueOf() + now.getTimezoneOffset() * 60000;
  }


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
  Peerio.ErrorReporter.init(); // this does not enable error reporting, just initializes.
  Peerio.TinyDB.init();
  Peerio.Util.init();
  Peerio.Crypto.init();
  Peerio.PhraseGenerator.init();
  Peerio.Socket.init();
  Peerio.Net.init();
  Peerio.Dispatcher.init();
  Peerio.Action.init();
  Peerio.ActionOverrides.init();
  Peerio.AppState.init();

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
