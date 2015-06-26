/**
 * Peerio crypto library.
 * Partially based on https://github.com/kaepora/miniLock.
 * ======================
 * Functions accessible via window.Peerio.Crypto object.
 * Depends on libraries:
 * - nacl.js
 * - nacl_stream.js
 * - base58.js
 * - blake2s.js
 * - scrypt.js
 * - bluebird.js
 */

//
// todo: 1. probably replace "throw" with return values
// todo: 2. "contacts" dependency is not nice, is there a better way?
// todo: 3. maybe initialize crypto lib once instead of passing same user data to most of the functions

var Peerio = Peerio || {};
Peerio.Crypto = {};

(function () {
  'use strict';

  var base58Match = new RegExp('^[1-9ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$');
  var base64Match = new RegExp('^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$');

  var keySize = 32;
  var decryptInfoNonceSize = 24;
  var fileNonceSize = 16;
  // DO NOT CHANGE, it will change crypto output
  var scryptResourceCost = 14;
  var scryptBlockSize = 8;
  var scryptStepDuration = 1000;

  // todo: move to global helper
  // malicious server safe hasOwnProperty functions
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);

  function hasAllProps(obj, props) {
    for (var i = 0; i > props.length; i++)
      if (!hasProp(obj, props[i])) return false;

    return true;
  }

  var api = Peerio.Crypto;

  api.chunkSize = 1024 * 1024;

  //-- PUBLIC API --------------------------------------------------

  /**
   * Generates keypair from string key and salt (passphrase and username)
   * @param {string} key
   * @param {string} salt
   * @promise { publicKey: Uint8Array - Public encryption key, secretKey: Uint8Array - Secret encryption key }
   */
  api.getKeyPair = function (key, salt) {
    return new Promise(function (resolve) {
      var keyHash = new BLAKE2s(keySize);
      keyHash.update(nacl.util.decodeUTF8(key));
      salt = nacl.util.decodeUTF8(salt);

      // Generates 32 bytes of key material in a Uint8Array with scrypt
      scrypt(keyHash.digest(), salt, scryptResourceCost, scryptBlockSize, keySize, scryptStepDuration, resolve);

    }).then(function (keyBytes) {
        return nacl.box.keyPair.fromSecretKey(new Uint8Array(keyBytes));
      });
  };

  /**
   * Generates public key in string representation from key bytes
   * @param {Uint8Array} publicKeyBytes
   * @returns {string} Base58 encoded key
   */
  api.getPublicKeyString = function (publicKeyBytes) {
    var key = new Uint8Array(keySize + 1);
    for (var i = 0; i < publicKeyBytes.length; i++)
      key[i] = publicKeyBytes[i];

    var hash = new BLAKE2s(1);
    hash.update(publicKeyBytes);
    key[keySize] = hash.digest()[0];

    return Base58.encode(key);
  };

  /**
   * Extracts byte array from public key string representation
   * @param {string} publicKey
   * @return {Uint8Array} publicKeyBytes
   */
  api.getPublicKeyBytes = function (publicKey) {
    return Base58.decode(publicKey).subarray(0, keySize);
  };

  /**
   * Encrypts a plaintext using `nacl.secretbox` and returns the ciphertext and a random nonce.
   * @param {string} plaintext
   * @param {Uint8Array} key
   * @return {object} ciphertext - Contains ciphertext and nonce in Uint8Array format.
   */
  api.secretBoxEncrypt = function (plaintext, key) {
    var nonce = nacl.randomBytes(decryptInfoNonceSize);
    var ciphertext = nacl.secretbox(nacl.util.decodeUTF8(plaintext), nonce, key);
    return {
      ciphertext: ciphertext,
      nonce: nonce
    };
  };

  /**
   * Decrypts a ciphertext using `nacl.secretbox` and returns the plaintext.
   * @param {Uint8Array} ciphertext
   * @param {Uint8Array} nonce
   * @param {Uint8Array} key
   * @return {string} plaintext
   */
  api.secretBoxDecrypt = function (ciphertext, nonce, key) {
    return nacl.util.encodeUTF8(nacl.secretbox.open(ciphertext, nonce, key));
  };

  /**
   * Derive actual encryption key from a PIN using scrypt and BLAKE2s.
   * Key is used to encrypt long-term passphrase locally.
   * @param {string} PIN
   * @param {string} username
   * @promise {Uint8Array}
   */
  api.getKeyFromPIN = function (PIN, username) {
    return new Promise(function (resolve) {
      var hash = new BLAKE2s(keySize);
      hash.update(nacl.util.decodeUTF8(PIN));
      scrypt(hash.hexDigest(), nacl.util.decodeUTF8(username), scryptResourceCost, scryptBlockSize,
        keySize, scryptStepDuration, resolve);
    }).then(function (keyBytes) {
        return new Uint8Array(keyBytes);
      });
  };

  /**
   * Decrypts an account creation token.
   * @param {{ username: string,
   *           ephemeralServerID: string,
   *           accountCreationToken: {token: string, nonce: string}
   *         }} data - account creation challenge JSON as received from server.
   * @param {string} username - username
   * @param {object} keyPair - keys
   * @return {Uint8Array} decryptedToken
   */
  api.decryptAccountCreationToken = function (data, username, keyPair) {
    if (!hasAllProps(data, ['username', 'accountCreationToken', 'ephemeralServerID'])
      || !hasAllProps(data.accountCreationToken, ['token', 'nonce'])) {
      console.log('Invalid account creation token.');
      return false;
    }

    if (data.username !== username) {
      console.log('Username did not match the one in account creation token.');
      return false;
    }

    var token = nacl.box.open(
      nacl.util.decodeBase64(data.accountCreationToken.token),
      nacl.util.decodeBase64(data.accountCreationToken.nonce),
      api.getPublicKeyBytes(data.ephemeralServerID),
      keyPair.secretKey
    );

    //todo: explain magic numbers
    if (token && token.length === 0x20 && token[0] === 0x41 && token[1] === 0x43)
      return nacl.util.encodeBase64(token);

    console.log('Decryption of account creation token failed.');
    return false;
  };

  /**
   * Decrypts authToken
   * @param {{ephemeralServerID:string, token:string, nonce:string}} data - authToken data as received from server.
   * @param {object} keyPair
   * @returns {object|Boolean} decrypted token
   */
  api.decryptAuthToken = function (data, keyPair) {
    if (hasProp(data, 'error')) {
      console.error(data.error);
      return false;
    }

    var dToken = nacl.box.open(
      nacl.util.decodeBase64(data.token),
      nacl.util.decodeBase64(data.nonce),
      api.getPublicKeyBytes(data.ephemeralServerID),
      keyPair.secretKey
    );
    //todo: explain magic numbers
    if (dToken && dToken.length === 0x20 && dToken[0] === 0x41 && dToken[1] === 0x54)
      return nacl.util.encodeBase64(dToken);

    return false;
  };

  /**
   * Gets a user's avatar using their username and publicKey.
   * The avatar consists of two 256-bit BLAKE2 hashes spread across 4 identicons:
   * Identicon 1: First 128 bits of BLAKE2(username||publicKey).
   * Identicon 2:  Last 128 bits of BLAKE2(username||publicKey).
   * Identicon 3: First 128 bits of BLAKE2(publicKey||username).
   * Identicon 4:  Last 128 bits of BLAKE2(publicKey||username).
   * Note that the miniLock ID is hashed as its byte values, not as a string.
   * @param {string} username
   * @param {string} publicKey
   * @return {Array|Boolean} [hash1 (Hex string), hash2 (Hex string)]
   */
  api.getAvatar = function (username, publicKey) {
    if (!username || !publicKey) {
      return false;
    }

    var hash1 = new BLAKE2s(keySize);
    hash1.update(nacl.util.decodeUTF8(username));
    hash1.update(Base58.decode(publicKey));

    var hash2 = new BLAKE2s(keySize);
    hash2.update(Base58.decode(publicKey));
    hash2.update(nacl.util.decodeUTF8(username));

    return [hash1.hexDigest(), hash2.hexDigest()];
  };

  /**
   * Encrypt a message to recipients, return header JSON and body.
   * @param {object} message - message object.
   * @param {string[]} recipients - Array of usernames of recipients.
   * @param {User} sender
   * @param {function} callback - With header, body parameters, and array of failed recipients.
   */
  api.encryptMessage = function (message, recipients, sender, callback) {
    var validatedRecipients = validateRecipients(recipients, sender);

    encryptFile(
      new Blob([nacl.util.decodeUTF8(JSON.stringify(message))]),
      'message',
      validatedRecipients.publicKeys,
      sender,
      null,
      function (encryptedChunks, header) {
        if (!encryptedChunks) {
          callback(false);
          return false;
        }
        var encryptedBlob = new Blob(encryptedChunks);
        encryptedChunks = null;
        var reader = new FileReader();//todo: refactor to remove File API usage
        reader.onload = function (readerEvent) {
          var encryptedBuffer = new Uint8Array(readerEvent.target.result);
          var headerLength = byteArrayToNumber(encryptedBuffer.subarray(8, 12));
          header = JSON.parse(header);
          var body = nacl.util.encodeBase64(
            encryptedBuffer.subarray(12 + headerLength)
          );
          callback(header, body, validatedRecipients.failed);
        };
        reader.readAsArrayBuffer(encryptedBlob);
      }
    );
  };

  /**
   * Encrypt a file to recipients, return UTF8 Blob and header (separate).
   * @param {object} file - File object to encrypt.
   * @param {string[]} recipients - Array of usernames of recipients.
   * @param {User} sender
   * @param {function} fileNameCallback - Callback with encrypted fileName.
   * @param {function} callback - With header, body and failedRecipients parameters.
   */
  api.encryptFile = function (file, recipients, sender,  fileNameCallback, callback) {
    var validatedRecipients = validateRecipients(recipients, sender);

    var blob = file.slice();
    blob.name = file.name;
    encryptFile(
      blob,
      file.name,
      validatedRecipients.publicKeys,
      sender,
      fileNameCallback,
      function (encryptedChunks, header) {
        if (encryptedChunks) {
          encryptedChunks.splice(0, 4);
          callback(JSON.parse(header), encryptedChunks, validatedRecipients.failed);
        } else
          callback(false);
      }
    );
  };

  /**
   * Decrypt a message.
   * @param {object} messageObject - As received from server.
   * @param {User} user - decrypting user
   * @param {function} callback - with plaintext object.
   *
   */
  api.decryptMessage = function (messageObject, user, callback) {
    var header = JSON.stringify(messageObject.header);

    var messageBlob = new Blob([
      'miniLock',
      numberToByteArray(header.length),
      header,
      nacl.util.decodeBase64(messageObject.body)
    ]);

    decryptFile(messageBlob, user,
      function (decryptedBlob, saveName, senderID) {
        if (!decryptedBlob) {
          callback(false);
          return false;
        }
        // validating sender public key
        if (hasProp(user.contacts, messageObject.sender)
            && user.contacts[messageObject.sender].publicKey !== senderID) {
          callback(false);
          return false;
        }

        var decryptedBuffer;
        var reader = new FileReader(); // todo: remove file api usage
        reader.onload = function (readerEvent) {
          decryptedBuffer = nacl.util.encodeUTF8(
            new Uint8Array(readerEvent.target.result)
          );

          var message = JSON.parse(decryptedBuffer);

          // todo: should crypto really care what props message object has?
          //if (hasProp(message, 'subject') && hasProp(message, 'message')
          //    && hasProp(message, 'receipt') && hasProp(message, 'sequence')) {
          callback(message);
          //} else callback(false);
        };

        reader.readAsArrayBuffer(decryptedBlob);
      }
    );
  };

  /**
   * Decrypt a file.
   * @param {string} id - File ID
   * @param {object} blob - File ciphertext as blob
   * @param {object} header
   * @param {object} file
   * @param {User} user - decrypting user
   * @param {function} callback - with plaintext blob
   */
  api.decryptFile = function (id, blob, header, file, user, callback) {
    var headerString = JSON.stringify(header);
    var headerStringLength = nacl.util.decodeUTF8(headerString).length;
    var miniLockBlob = new Blob([
      'miniLock',
      numberToByteArray(headerStringLength),
      headerString,
      numberToByteArray(256), // todo: convert to constant
      nacl.util.decodeBase64(id),
      blob
    ]);

    decryptFile(miniLockBlob, user,
      function (decryptedBlob, saveName, senderID) {
        if (!decryptedBlob) {
          callback(false);
          return false;
        }

        var claimedSender = hasProp(file, 'sender') ? file.sender : file.creator;
        // this looks strange that we call success callback when sender is not in contacts
        // but it can be the case and we skip public key verification,
        // because we don't have sender's public key
        if (hasProp(user.contacts, claimedSender) && user.contacts[claimedSender].publicKey !== senderID)
          callback(false);
        else
          callback(decryptedBlob);
      }
    );
  };

  /**
   * Decrypt a filename from a file's ID given by the Peerio server.
   * @param {string} id - File ID (Base64)
   * @param {object} header - encryption header for file
   * @param {User} user
   * @return {string} fileName
   */
  api.decryptFileName = function (id, header, user) {
    var fileInfo = decryptHeader(header, user).fileInfo;

    fileInfo.fileNonce = nacl.util.decodeBase64(fileInfo.fileNonce);
    fileInfo.fileKey = nacl.util.decodeBase64(fileInfo.fileKey);

    var nonce = new Uint8Array(decryptInfoNonceSize);
    nonce.set(fileInfo.fileNonce);

    var decrypted = nacl.secretbox.open(nacl.util.decodeBase64(id), nonce, fileInfo.fileKey);
    decrypted = nacl.util.encodeUTF8(decrypted);

    while (decrypted[decrypted.length - 1] === '\0')
      decrypted = decrypted.slice(0, -1);

    return decrypted;
  };

  //-- END OF PUBLIC API -------------------------------------------

  //-- INTERNALS ---------------------------------------------------

  /**
   * Validates and builds a list of recipient public keys
   * @param {string[]} recipients - recipient usernames
   * @param {User} sender - username
   * @returns { { publicKeys:string[], failed:string[] } } - list of qualified public keys and usernames list
   *                                                         that failed to qualify as recipients
   */
  function validateRecipients(recipients, sender) {
    var publicKeys = [sender.publicKey];
    var failed = [];

    recipients.forEach(function (recipient) {

      var contact = sender.contacts[recipient];
      if (hasProp(contact, 'publicKey') && publicKeys.indexOf(contact.publicKey) < 0)
        publicKeys.push(contact.publicKey);
      else if(recipient != sender.username)
        failed.push(recipient);
    });

    return {publicKeys: publicKeys, failed: failed};
  }

  /**
   * Validates public key string
   * @param {string} publicKey
   * @returns {boolean} - true for valid public key string
   */
  function validatePublicKey(publicKey) {
    if (publicKey.length > 55 || publicKey.length < 40)
      return false;

    if (!base58Match.test(publicKey))
      return false;

    var bytes = Base58.decode(publicKey);
    if (bytes.length !== (keySize + 1))
      return false;

    var hash = new BLAKE2s(1);
    hash.update(bytes.subarray(0, keySize));
    if (hash.digest()[0] !== bytes[keySize])
      return false;

    return true;
  }

  /**
   * Validates nonce
   * @param {string} nonce - Base64 encoded nonce
   * @param {Number} expectedLength - expected nonce bytes length
   * @returns {boolean}
   */
  function validateNonce(nonce, expectedLength) {
    if (nonce.length > 40 || nonce.length < 10)
      return false;

    if (base64Match.test(nonce))
      return nacl.util.decodeBase64(nonce).length === expectedLength;

    return false;
  }

  /**
   * Validates symmetric key.
   * @param {string} key - Base64 encoded key
   * @returns {boolean} - true for valid key
   */
  function validateKey(key) {
    if (key.length > 50 || key.length < 40)
      return false;

    if (base64Match.test(key))
      return nacl.util.decodeBase64(key).length === keySize;

    return false;
  }

  /**
   * Converts 4-byte little-endian byte array to number
   * @param {Uint8Array} byteArray
   * @returns {Number}
   */
  function byteArrayToNumber(byteArray) {
    var n = 0;
    for (var i = 3; i >= 0; i--) {
      n += byteArray[i];
      if (i > 0) {
        n = n << 8;
      }
    }
    return n;
  }

  /**
   * Converts number to 4-byte little-endian byte array
   * @param {Number} n
   * @returns {Uint8Array}
   */
  function numberToByteArray(n) {
    var byteArray = new Uint8Array(4);
    for (var i = 0; i < byteArray.length; i++) {
      byteArray[i] = n & 255;
      n = n >> 8;
    }
    return byteArray;
  }

  /**
   * Creates encrypted data header
   *  @param {string[]} publicKeys - recepients
   *  @param {User} sender
   *  @param {Uint8Array} fileKey
   *  @param {Uint8Array} fileNonce
   *  @param {Uint8Array} fileHash
   *  @returns {object} header
   */
  function createHeader(publicKeys, sender, fileKey, fileNonce, fileHash) {
    var ephemeral = nacl.box.keyPair();

    var header = {
      version: 1,
      ephemeral: nacl.util.encodeBase64(ephemeral.publicKey),
      decryptInfo: {}
    };

    var decryptInfoNonces = [];

    for (var i = 0; i < publicKeys.length; i++) {
      decryptInfoNonces.push(nacl.randomBytes(decryptInfoNonceSize));

      var decryptInfo = {
        senderID: sender.publicKey,
        recipientID: publicKeys[i],
        fileInfo: {
          fileKey: nacl.util.encodeBase64(fileKey),
          fileNonce: nacl.util.encodeBase64(fileNonce),
          fileHash: nacl.util.encodeBase64(fileHash)
        }
      };

      decryptInfo.fileInfo = nacl.util.encodeBase64(nacl.box(
        nacl.util.decodeUTF8(JSON.stringify(decryptInfo.fileInfo)),
        decryptInfoNonces[i],
        Base58.decode(publicKeys[i]).subarray(0, keySize),
        sender.keyPair.secretKey
      ));

      decryptInfo = nacl.util.encodeBase64(nacl.box(
        nacl.util.decodeUTF8(JSON.stringify(decryptInfo)),
        decryptInfoNonces[i],
        Base58.decode(publicKeys[i]).subarray(0, keySize),
        ephemeral.secretKey
      ));

      header.decryptInfo[nacl.util.encodeBase64(decryptInfoNonces[i])] = decryptInfo;
    }

    return header;
  }

  /**
   * Decrypts encrypted data header
   * @param {object} header - encrypted header
   * @param {User} user - decrypting user
   * @returns {object} header - decrypted decryptInfo object containing decrypted fileInfo object.
   */
  function decryptHeader(header, user) {
    if (!hasProp(header, 'version') || header.version !== 1)
      return false;

    if (!hasProp(header,'ephemeral') || !validateKey(header.ephemeral))
      return false;

    // Attempt decryptInfo decryptions until one succeeds
    var actualDecryptInfo = null;
    var actualDecryptInfoNonce = null;
    var actualFileInfo = null;

    for (var i in header.decryptInfo) {
      if (hasProp(header.decryptInfo, i) && validateNonce(i, decryptInfoNonceSize)) {
        actualDecryptInfo = nacl.box.open(
          nacl.util.decodeBase64(header.decryptInfo[i]),
          nacl.util.decodeBase64(i),
          nacl.util.decodeBase64(header.ephemeral),
          user.keyPair.secretKey
        );

        if (actualDecryptInfo) {
          actualDecryptInfo = JSON.parse(nacl.util.encodeUTF8(actualDecryptInfo));
          actualDecryptInfoNonce = nacl.util.decodeBase64(i);
          break;
        }
      }
    }

    if (!actualDecryptInfo || !hasProp(actualDecryptInfo, 'recipientID')
      || actualDecryptInfo.recipientID !== user.publicKey)
      return false;

    if (!hasAllProps(actualDecryptInfo, 'fileInfo', 'senderID') || !validatePublicKey(actualDecryptInfo.senderID))
      return false;

    try {
      actualFileInfo = nacl.box.open(
        nacl.util.decodeBase64(actualDecryptInfo.fileInfo),
        actualDecryptInfoNonce,
        Base58.decode(actualDecryptInfo.senderID).subarray(0, keySize),
        user.keyPair.secretKey
      );
      actualFileInfo = JSON.parse(nacl.util.encodeUTF8(actualFileInfo));
    }
    catch (err) {
      return false;
    }
    actualDecryptInfo.fileInfo = actualFileInfo;
    return actualDecryptInfo;

  }

  /**
   * Convenience method to read from blobs
   */
  function readFile(file, start, end, callback, errorCallback) {
    var reader = new FileReader();

    reader.onload = function (readerEvent) {
       callback({
        name: file.name,
        size: file.size,
        data: new Uint8Array(readerEvent.target.result)
      });
    };

    reader.onerror = function () {
      if (typeof(errorCallback) === 'function')
         errorCallback();

    };

    reader.readAsArrayBuffer(file.slice(start, end));
  }

  /**
   * Encrypts file
   * @param {{name: string, size: Number, data: ArrayBuffer}} file
   * @param {string} saveName
   * @param {string[]} publicKeys
   * @param {User} user
   * @param {Function} fileNameCallback - A callback with the encrypted fileName.
   * @param {Function} callback - Callback function to which encrypted result is passed.
   */
  function encryptFile(file, saveName, publicKeys, user, fileNameCallback, callback) {
    saveName += '.miniLock';
    var fileKey = nacl.randomBytes(keySize);
    var fileNonce = nacl.randomBytes(fileNonceSize);
    var streamEncryptor = nacl.stream.createEncryptor(
      fileKey,
      fileNonce,
      api.chunkSize
    );

    var paddedFileName = new Uint8Array(256);
    var fileNameBytes = nacl.util.decodeUTF8(file.name);
    if (fileNameBytes.length > paddedFileName.length) {
      //file name is too long
      callback(false);
      return false;
    }
    paddedFileName.set(fileNameBytes);

    var hashObject = new BLAKE2s(keySize);
    var encryptedChunk = streamEncryptor.encryptChunk(paddedFileName, false);

    if (!encryptedChunk) {
      //general encryption error'
      callback(false);
      return false;
    }

    if (typeof(fileNameCallback) === 'function') {
      fileNameCallback(encryptedChunk);
    }

    var encryptedChunks = [encryptedChunk];
    hashObject.update(encryptedChunk);

    encryptNextChunk(file, streamEncryptor, hashObject, encryptedChunks, 0,
      saveName, fileKey, fileNonce, publicKeys, user, callback);

  }

  /**
   * Decrypts file
   * @param {{name: string, size: Number, data: ArrayBuffer}}file
   * @param {User} user - decrypting user
   * @param {Function} callback - function to which decrypted result is passed.
   */
  function decryptFile(file, user, callback) {
    readFile(file, 8, 12, function (headerLength) {
      headerLength = byteArrayToNumber(headerLength.data);

      readFile(file, 12, headerLength + 12, function (header) {
        try {
          header = nacl.util.encodeUTF8(header.data);
          header = JSON.parse(header);
        }
        catch (error) {
          callback(false);
          return false;
        }
        var actualDecryptInfo = decryptHeader(header, user);
        if (!actualDecryptInfo) {
          callback(false, file.name, false);
          return false;
        }

        // Begin actual ciphertext decryption
        var dataPosition = 12 + headerLength;
        var streamDecryptor = nacl.stream.createDecryptor(
          nacl.util.decodeBase64(actualDecryptInfo.fileInfo.fileKey),
          nacl.util.decodeBase64(actualDecryptInfo.fileInfo.fileNonce),
          api.chunkSize
        );
        var hashObject = new BLAKE2s(keySize);
        decryptNextChunk(file, streamDecryptor, hashObject, [], dataPosition,
          actualDecryptInfo.fileInfo, actualDecryptInfo.senderID, headerLength, callback);
      });
    });
  }

  /**
   * Encrypts next chunk of data
   * @param {{name: string, size: Number, data: ArrayBuffer}} file
   * @param {object} streamEncryptor - nacl stream encryptor instance
   * @param {object} hashObject - blake2 hash object instance
   * @param {Uint8Array[]} encryptedChunks
   * @param {Number} dataPosition
   * @param {string} saveName
   * @param {Uint8Array} fileKey
   * @param {Uint8Array} fileNonce
   * @param {string[]} publicKeys
   * @param {User} user
   * @param {Function} callbackOnComplete {file, saveName, senderID}
   */
  function encryptNextChunk(file, streamEncryptor, hashObject, encryptedChunks, dataPosition,
                            saveName, fileKey, fileNonce, publicKeys, user, callbackOnComplete) {
    readFile(
      file,
      dataPosition,
      dataPosition + api.chunkSize,
      function (chunk) {
        chunk = chunk.data;
        var isLast = dataPosition >= (file.size - api.chunkSize);

        var encryptedChunk = streamEncryptor.encryptChunk(chunk, isLast);
        if (!encryptedChunk) {
          callbackOnComplete(false);
          return false;
        }

        hashObject.update(encryptedChunk);
        encryptedChunks.push(encryptedChunk);

        if (isLast) {
          streamEncryptor.clean();
          var header = createHeader(publicKeys, user, fileKey, fileNonce, hashObject.digest());
          header = JSON.stringify(header);
          // todo changing the string here requires change in the code that depends on that string length when reading blob
          encryptedChunks.unshift('miniLock', numberToByteArray(header.length), header);

          return callbackOnComplete(encryptedChunks, header, saveName, user.publicKey);
        }

        dataPosition += api.chunkSize;
        return encryptNextChunk(file, streamEncryptor, hashObject, encryptedChunks, dataPosition,
          saveName, fileKey, fileNonce, publicKeys, user, callbackOnComplete);

      }
    );
  }


  /**
   * Dencrypts next chunk of data
   * @param {{name: string, size: Number, data: ArrayBuffer}} file
   * @param {object} streamDecryptor - nacl stream decryptor instance
   * @param {object} hashObject - blake2 hash object instance
   * @param {Uint8Array[]} decryptedChunks
   * @param {Number} dataPosition
   * @param {object} fileInfo
   * @param {string} senderPublicKey
   * @param {Number} headerLength
   * @param {Function} callbackOnComplete {file, saveName, senderID}
   */
  function decryptNextChunk(file, streamDecryptor, hashObject, decryptedChunks, dataPosition,
                            fileInfo, senderPublicKey, headerLength, callbackOnComplete) {
    readFile(
      file,
      dataPosition,
      dataPosition + 4 + fileNonceSize + api.chunkSize,
      function (chunk) {
        var fileName = '';
        chunk = chunk.data;
        var actualChunkLength = byteArrayToNumber(chunk.subarray(0, 4));

        if (actualChunkLength > chunk.length) {
          callbackOnComplete(false);
          return false;
        }

        chunk = chunk.subarray(0, actualChunkLength + 4 + fileNonceSize);

        var decryptedChunk;
        var isLast = dataPosition >= ((file.size) - (4 + fileNonceSize + actualChunkLength));

        if (dataPosition === (12 + headerLength)) {
          // This is the first chunk, containing the filename
          decryptedChunk = streamDecryptor.decryptChunk(chunk, isLast);
          if (!decryptedChunk) {
            callbackOnComplete(false);
            return false;
          }

          fileName = nacl.util.encodeUTF8(decryptedChunk.subarray(0, 256));
          while (fileName[fileName.length - 1] === String.fromCharCode(0x00))
            fileName = fileName.slice(0, -1);

          hashObject.update(chunk.subarray(0, 256 + 4 + fileNonceSize));
        } else {
          decryptedChunk = streamDecryptor.decryptChunk(chunk, isLast);

          if (!decryptedChunk) {
            callbackOnComplete(false);
            return false;
          }

          decryptedChunks.push(decryptedChunk);
          hashObject.update(chunk);
        }

        dataPosition += chunk.length;
        if (isLast) {
          if (!nacl.verify(new Uint8Array(hashObject.digest()), nacl.util.decodeBase64(fileInfo.fileHash))) {
            //throw new Error('miniLock: Decryption failed - could not validate file contents after decryption')
            callbackOnComplete(false);
            return false;
          } else {
            streamDecryptor.clean();
            return callbackOnComplete(new Blob(decryptedChunks), fileName, senderPublicKey);
          }
        }
        else {
          return decryptNextChunk(file, streamDecryptor, hashObject, decryptedChunks, dataPosition,
            fileInfo, senderPublicKey, headerLength, callbackOnComplete);
        }
      }
    );
  }

  //-- END OF INTERNALS --------------------------------------------

})();