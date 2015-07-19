/**
 * Worker script that imports crypto library and provides interface to it to UI thread
 */


(function () {
  'use strict';

  self.onmessage = function (payload) {
    var message = payload.data;

  };

})();
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
// todo: 3. using blobs forces us to use html5 file api, don't think it's optimal, see if can be changed

var Peerio = this.Peerio || {};
Peerio.Crypto = {};

Peerio.Crypto.init = function () {
  'use strict';

  var api = Peerio.Crypto = {};
  //-- PRIVATE ---------------------------------------------------------------------------------------------------------

  var base58Match = new RegExp('^[1-9ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$');
  var base64Match = new RegExp('^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$');

  var keySize = 32;
  var decryptInfoNonceSize = 24;
  var blobNonceSize = 16;
  var numberSize = 4; // integer
  var signatureSize = 8;
  var headerStart = numberSize + signatureSize;
  var fileNameSize = 256;
  // DO NOT CHANGE, it will change crypto output
  var scryptResourceCost = 14;
  var scryptBlockSize = 8;
  var scryptStepDuration = 1000;
  var signature = '.peerio.'; // has to be 8 bytes, don't change

  // todo: move to global helper
  // malicious server safe hasOwnProperty function
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);

  function hasAllProps(obj, props) {
    for (var i = 0; i > props.length; i++)
      if (!hasProp(obj, props[i])) return false;

    return true;
  }



  //-- PUBLIC API ------------------------------------------------------------------------------------------------------

  api.chunkSize = 1024 * 1024;

  /**
   * Generates keypair from string key and salt (passphrase and username)
   * @param {string} username - salt
   * @param {string} passphrase - key
   * @promise { publicKey: Uint8Array - Public encryption key, secretKey: Uint8Array - Secret encryption key }
   */
  api.getKeyPair = function (username, passphrase) {
    return new Promise(function (resolve) {
      var keyHash = new BLAKE2s(keySize);
      keyHash.update(nacl.util.decodeUTF8(passphrase));
      username = nacl.util.decodeUTF8(username);

      // Generates 32 bytes of key material in a Uint8Array with scrypt
      scrypt(keyHash.digest(), username, scryptResourceCost, scryptBlockSize, keySize, scryptStepDuration, resolve);

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
   * @return {string} decryptedToken
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

    encryptBlob(
      new Blob([nacl.util.decodeUTF8(JSON.stringify(message))]),
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
        var reader = new FileReader();
        reader.onload = function (readerEvent) {
          var encryptedBuffer = new Uint8Array(readerEvent.target.result);
          var headerLength = byteArrayToNumber(encryptedBuffer.subarray(signatureSize, headerStart));
          header = JSON.parse(header);
          var body = nacl.util.encodeBase64(
            encryptedBuffer.subarray(headerStart + headerLength)
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
  api.encryptFile = function (file, recipients, sender, fileNameCallback, callback) {
    var validatedRecipients = validateRecipients(recipients, sender);

    var blob = file.slice();
    blob.name = file.name;
    encryptBlob(
      blob,
      validatedRecipients.publicKeys,
      sender,
      fileNameCallback,
      function (encryptedChunks, header) {
        if (encryptedChunks) {
          encryptedChunks.splice(0, numberSize);
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
      signature,
      numberToByteArray(header.length),
      header,
      nacl.util.decodeBase64(messageObject.body)
    ]);

    decryptBlob(messageBlob, user,
      function (decryptedBlob, senderID) {
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
    var peerioBlob = new Blob([
      signature,
      numberToByteArray(headerStringLength),
      headerString,
      numberToByteArray(fileNameSize),
      nacl.util.decodeBase64(id),
      blob
    ]);

    decryptBlob(peerioBlob, user,
      function (decryptedBlob, senderID) {
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

  //-- INTERNALS -------------------------------------------------------------------------------------------------------

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
      else if (recipient != sender.username)
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

    if (!hasProp(header, 'ephemeral') || !validateKey(header.ephemeral))
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
  function readBlob(blob, start, end, callback, errorCallback) {
    var reader = new FileReader();

    reader.onload = function (readerEvent) {
      callback({
        name: blob.name,
        size: blob.size,
        data: new Uint8Array(readerEvent.target.result)
      });
    };

    reader.onerror = function () {
      if (typeof(errorCallback) === 'function')
        errorCallback();

    };

    reader.readAsArrayBuffer(blob.slice(start, end));
  }

  /**
   * Encrypts blob
   * @param {{name: string, size: Number, data: ArrayBuffer}} blob
   * @param {string[]} publicKeys
   * @param {User} user
   * @param {Function} fileNameCallback - A callback with the encrypted fileName.
   * @param {Function} callback - Callback function to which encrypted result is passed.
   */
  function encryptBlob(blob, publicKeys, user, fileNameCallback, callback) {
    var blobKey = nacl.randomBytes(keySize);
    var blobNonce = nacl.randomBytes(blobNonceSize);
    var streamEncryptor = nacl.stream.createEncryptor(
      blobKey,
      blobNonce,
      api.chunkSize
    );

    var paddedFileName = new Uint8Array(256);
    var fileNameBytes = nacl.util.decodeUTF8(blob.name);
    if (fileNameBytes.length > paddedFileName.length) {
      //blob name is too long
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

    encryptNextChunk({blob: blob, streamEncryptor: streamEncryptor, hashObject: hashObject,
                      encryptedChunks: encryptedChunks, dataPosition: 0, fileKey: blobKey, fileNonce: blobNonce,
                      publicKeys: publicKeys, user: user, callbackOnComplete: callback});
  }

  /**
   * Decrypts blob
   * @param {{name: string, size: Number, data: ArrayBuffer}}blob
   * @param {User} user - decrypting user
   * @param {Function} callback - function to which decrypted result is passed.
   */
  function decryptBlob(blob, user, callback) {
    readBlob(blob, 8, 12, function (headerLength) {
      headerLength = byteArrayToNumber(headerLength.data);

      readBlob(blob, 12, headerLength + 12, function (header) {
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
          callback(false, blob.name, false);
          return false;
        }

        // Begin actual ciphertext decryption
        var dataPosition = headerStart + headerLength;
        var streamDecryptor = nacl.stream.createDecryptor(
          nacl.util.decodeBase64(actualDecryptInfo.fileInfo.fileKey),
          nacl.util.decodeBase64(actualDecryptInfo.fileInfo.fileNonce),
          api.chunkSize
        );
        var hashObject = new BLAKE2s(keySize);
        decryptNextChunk({
          firstChunk: true,
          blob: blob,
          fileName: '',
          streamDecryptor: streamDecryptor,
          hashObject: hashObject,
          decryptedChunks: [],
          dataPosition: dataPosition,
          fileInfo: actualDecryptInfo.fileInfo,
          senderPublicKey: actualDecryptInfo.senderID,
          headerLength: headerLength,
          callbackOnComplete: callback
        });
      });
    });
  }

  /**
   * Encrypts next chunk of data
   * @param {object} e - encrypt data object
   * @param {{name: string, size: Number, data: ArrayBuffer}} e.blob
   * @param {object} e.streamEncryptor - nacl stream encryptor instance
   * @param {object} e.hashObject - blake2 hash object instance
   * @param {Uint8Array[]} e.encryptedChunks
   * @param {Number} e.dataPosition
   * @param {Uint8Array} e.fileKey
   * @param {Uint8Array} e.fileNonce
   * @param {string[]} e.publicKeys
   * @param {User} e.user
   * @param {Function} e.callbackOnComplete {file, header, senderID}
   */
  function encryptNextChunk(e) {
    readBlob(
      e.blob,
      e.dataPosition,
      e.dataPosition + api.chunkSize,
      function (chunk) {
        chunk = chunk.data;
        var isLast = e.dataPosition >= (e.blob.size - api.chunkSize);

        var encryptedChunk = e.streamEncryptor.encryptChunk(chunk, isLast);
        if (!encryptedChunk) {
          e.callbackOnComplete(false);
          return false;
        }

        e.hashObject.update(encryptedChunk);
        e.encryptedChunks.push(encryptedChunk);

        if (isLast) {
          e.streamEncryptor.clean();
          var header = createHeader(e.publicKeys, e.user, e.fileKey, e.fileNonce, e.hashObject.digest());
          header = JSON.stringify(header);
          e.encryptedChunks.unshift(signature, numberToByteArray(header.length), header);

          return e.callbackOnComplete(e.encryptedChunks, header, e.user.publicKey);
        }

        e.dataPosition += api.chunkSize;

        return encryptNextChunk(e);
      }
    );
  }

  /**
   * Decrypts next chunk of data
   * @param {object} d - decrypt data object
   * @param {boolean} d.firstChunk - does position point to the first chunk or not
   * @param {{name: string, size: Number, data: ArrayBuffer}} d.blob
   * @param {string} d.fileName
   * @param {object} d.streamDecryptor - nacl stream decryptor instance
   * @param {object} d.hashObject - blake2 hash object instance
   * @param {Uint8Array[]} d.decryptedChunks
   * @param {Number} d.dataPosition
   * @param {object} d.fileInfo
   * @param {string} d.senderPublicKey
   * @param {Number} d.headerLength
   * @param {Function} d.callbackOnComplete {file, senderID}
   */
  function decryptNextChunk(d) {
    readBlob(
      d.blob,
      d.dataPosition,
      d.dataPosition + numberSize + blobNonceSize + api.chunkSize,
      function (chunk) {
        chunk = chunk.data;
        var chunkLength = byteArrayToNumber(chunk.subarray(0, numberSize));

        if (chunkLength > chunk.length) {
          d.callbackOnComplete(false);
          throw new Error('Invalid chunk length read while decrypting.');
        }

        chunk = chunk.subarray(0, chunkLength + numberSize + blobNonceSize);

        var decryptedChunk;
        var isLast = d.dataPosition >= ((d.blob.size) - (numberSize + blobNonceSize + chunkLength));

        if (d.firstChunk) {
          d.firstChunk = false;

          decryptedChunk = d.streamDecryptor.decryptChunk(chunk, isLast);
          if (!decryptedChunk) {
            d.callbackOnComplete(false);
            return false;
          }

          var fileName = nacl.util.encodeUTF8(decryptedChunk.subarray(0, fileNameSize));
          var trimStart = fileName.indexOf('\0');
          d.fileName = trimStart >= 0 ? fileName.slice(trimStart) : fileName;

          d.hashObject.update(chunk.subarray(0, fileNameSize + numberSize + blobNonceSize));
        } else { // if not first chunk
          decryptedChunk = d.streamDecryptor.decryptChunk(chunk, isLast);

          if (!decryptedChunk) {
            d.callbackOnComplete(false);
            throw new Error('Failed to decrypt chunk');
          }

          d.decryptedChunks.push(decryptedChunk);
          d.hashObject.update(chunk);
        }

        d.dataPosition += chunk.length;
        if (!isLast) return decryptNextChunk(d);

        if (!nacl.verify(new Uint8Array(d.hashObject.digest()), nacl.util.decodeBase64(d.fileInfo.fileHash))) {
          d.callbackOnComplete(false);
          throw new Error('Failed to verify decrypted data hash');
        }

        d.streamDecryptor.clean();
        d.callbackOnComplete(new Blob(d.decryptedChunks), d.senderPublicKey);

      }
    );
  }


};
var Base58 = {};

(function () {

  var BASE = 58;
  var BITS_PER_DIGIT = Math.log(BASE) / Math.log(2);
  var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  var ALPHABET_MAP = {};

  for (var i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i;
  }

  function decodedLen(n) {
    return Math.floor(n * BITS_PER_DIGIT / 8);
  }

  function maxEncodedLen(n) {
    return Math.ceil(n / BITS_PER_DIGIT);
  }

  Base58.encode = function (buffer) {
    if (buffer.length === 0) return '';

    var i, j, digits = [0];
    for (i = 0; i < buffer.length; i++) {
      for (j = 0; j < digits.length; j++) digits[j] <<= 8;

      digits[0] += buffer[i];

      var carry = 0;
      for (j = 0; j < digits.length; ++j) {
        digits[j] += carry;
        carry = (digits[j] / BASE) | 0;
        digits[j] %= BASE;
      }

      while (carry) {
        digits.push(carry % BASE);
        carry = (carry / BASE) | 0;
      }
    }

    var zeros = maxEncodedLen(buffer.length * 8) - digits.length-1;
    // deal with leading zeros
    for (i = 0; i < zeros; i++) digits.push(0);

    return digits.reverse().map(function (digit) { return ALPHABET[digit]; }).join('');
  };

  Base58.decode = function (string) {
    if (string.length === 0) return [];

    var i, j, bytes = [0];
    for (i = 0; i < string.length; i++) {
      var c = string[i];
      if (!(c in ALPHABET_MAP)) throw new Error('Non-base58 character');

      for (j = 0; j < bytes.length; j++) bytes[j] *= BASE;
      bytes[0] += ALPHABET_MAP[c];

      var carry = 0;
      for (j = 0; j < bytes.length; ++j) {
        bytes[j] += carry;

        carry = bytes[j] >> 8;
        bytes[j] &= 0xff;
      }

      while (carry) {
        bytes.push(carry & 0xff);

        carry >>= 8;
      }
    }

    var zeros = decodedLen(string.length) - bytes.length;

    // deal with leading zeros
    for (i = 0; i < zeros; i++) bytes.push(0);

    return new Uint8Array(bytes.reverse());
  };
})();
var BLAKE2s = (function() {

	var MAX_DIGEST_LENGTH = 32;
	var BLOCK_LENGTH = 64;
	var MAX_KEY_LENGTH = 32;

	var IV = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
	]);

	function BLAKE2s(digestLength, key) {
		if (typeof digestLength === 'undefined')
			digestLength = MAX_DIGEST_LENGTH;

		if (digestLength <= 0 || digestLength > MAX_DIGEST_LENGTH)
			throw new Error('bad digestLength');

		this.digestLength = digestLength;

		if (typeof key === 'string')
			throw new TypeError('key must be a Uint8Array or an Array of bytes');

		var keyLength = key ? key.length : 0;
		if (keyLength > MAX_KEY_LENGTH) throw new Error('key is too long');

		this.isFinished = false;

		// Hash state.
		this.h = new Uint32Array(IV);

		// XOR part of parameter block.
		var param = [digestLength & 0xff, keyLength, 1, 1];
		this.h[0] ^= param[0] & 0xff | (param[1] & 0xff) << 8 | (param[2] & 0xff) << 16 | (param[3] & 0xff) << 24;

		// Buffer for data.
		this.x = new Uint8Array(BLOCK_LENGTH);
		this.nx = 0;

		// Byte counter.
		this.t0 = 0;
		this.t1 = 0;

		// Flags.
		this.f0 = 0;
		this.f1 = 0;

		// Fill buffer with key, if present.
		if (keyLength > 0) {
			for (var i = 0; i < keyLength; i++) this.x[i] = key[i];
			for (i = keyLength; i < BLOCK_LENGTH; i++) this.x[i] = 0;
			this.nx = BLOCK_LENGTH;
		}
	}

	BLAKE2s.prototype.processBlock = function(length) {
		this.t0 += length;
		if (this.t0 != this.t0 >>> 0) {
			this.t0 = 0;
			this.t1++;
		}

		var v0  = this.h[0],
			v1  = this.h[1],
			v2  = this.h[2],
			v3  = this.h[3],
			v4  = this.h[4],
			v5  = this.h[5],
			v6  = this.h[6],
			v7  = this.h[7],
			v8  = IV[0],
			v9  = IV[1],
			v10 = IV[2],
			v11 = IV[3],
			v12 = IV[4] ^ this.t0,
			v13 = IV[5] ^ this.t1,
			v14 = IV[6] ^ this.f0,
			v15 = IV[7] ^ this.f1;

		var x = this.x;
		var m0  = x[ 0] & 0xff | (x[ 1] & 0xff) << 8 | (x[ 2] & 0xff) << 16 | (x[ 3] & 0xff) << 24,
			m1  = x[ 4] & 0xff | (x[ 5] & 0xff) << 8 | (x[ 6] & 0xff) << 16 | (x[ 7] & 0xff) << 24,
			m2  = x[ 8] & 0xff | (x[ 9] & 0xff) << 8 | (x[10] & 0xff) << 16 | (x[11] & 0xff) << 24,
			m3  = x[12] & 0xff | (x[13] & 0xff) << 8 | (x[14] & 0xff) << 16 | (x[15] & 0xff) << 24,
			m4  = x[16] & 0xff | (x[17] & 0xff) << 8 | (x[18] & 0xff) << 16 | (x[19] & 0xff) << 24,
			m5  = x[20] & 0xff | (x[21] & 0xff) << 8 | (x[22] & 0xff) << 16 | (x[23] & 0xff) << 24,
			m6  = x[24] & 0xff | (x[25] & 0xff) << 8 | (x[26] & 0xff) << 16 | (x[27] & 0xff) << 24,
			m7  = x[28] & 0xff | (x[29] & 0xff) << 8 | (x[30] & 0xff) << 16 | (x[31] & 0xff) << 24,
			m8  = x[32] & 0xff | (x[33] & 0xff) << 8 | (x[34] & 0xff) << 16 | (x[35] & 0xff) << 24,
			m9  = x[36] & 0xff | (x[37] & 0xff) << 8 | (x[38] & 0xff) << 16 | (x[39] & 0xff) << 24,
			m10 = x[40] & 0xff | (x[41] & 0xff) << 8 | (x[42] & 0xff) << 16 | (x[43] & 0xff) << 24,
			m11 = x[44] & 0xff | (x[45] & 0xff) << 8 | (x[46] & 0xff) << 16 | (x[47] & 0xff) << 24,
			m12 = x[48] & 0xff | (x[49] & 0xff) << 8 | (x[50] & 0xff) << 16 | (x[51] & 0xff) << 24,
			m13 = x[52] & 0xff | (x[53] & 0xff) << 8 | (x[54] & 0xff) << 16 | (x[55] & 0xff) << 24,
			m14 = x[56] & 0xff | (x[57] & 0xff) << 8 | (x[58] & 0xff) << 16 | (x[59] & 0xff) << 24,
			m15 = x[60] & 0xff | (x[61] & 0xff) << 8 | (x[62] & 0xff) << 16 | (x[63] & 0xff) << 24;

		// Round 1.
		v0 += m0;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v1 += m2;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v2 += m4;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v3 += m6;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v2 += m5;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v3 += m7;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v1 += m3;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 7) | v5 >>> 7;
		v0 += m1;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v0 += m8;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v1 += m10;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v2 += m12;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v3 += m14;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v2 += m13;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v3 += m15;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v1 += m11;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v0 += m9;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 7) | v5 >>> 7;

		// Round 2.
		v0 += m14;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v1 += m4;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v2 += m9;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v3 += m13;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v2 += m15;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v3 += m6;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v1 += m8;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 7) | v5 >>> 7;
		v0 += m10;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v0 += m1;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v1 += m0;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v2 += m11;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v3 += m5;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v2 += m7;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v3 += m3;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v1 += m2;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v0 += m12;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 7) | v5 >>> 7;

		// Round 3.
		v0 += m11;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v1 += m12;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v2 += m5;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v3 += m15;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v2 += m2;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v3 += m13;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v1 += m0;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 7) | v5 >>> 7;
		v0 += m8;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v0 += m10;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v1 += m3;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v2 += m7;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v3 += m9;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v2 += m1;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v3 += m4;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v1 += m6;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v0 += m14;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 7) | v5 >>> 7;

		// Round 4.
		v0 += m7;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v1 += m3;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v2 += m13;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v3 += m11;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v2 += m12;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v3 += m14;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v1 += m1;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 7) | v5 >>> 7;
		v0 += m9;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v0 += m2;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v1 += m5;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v2 += m4;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v3 += m15;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v2 += m0;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v3 += m8;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v1 += m10;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v0 += m6;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 7) | v5 >>> 7;

		// Round 5.
		v0 += m9;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v1 += m5;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v2 += m2;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v3 += m10;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v2 += m4;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v3 += m15;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v1 += m7;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 7) | v5 >>> 7;
		v0 += m0;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v0 += m14;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v1 += m11;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v2 += m6;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v3 += m3;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v2 += m8;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v3 += m13;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v1 += m12;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v0 += m1;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 7) | v5 >>> 7;

		// Round 6.
		v0 += m2;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v1 += m6;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v2 += m0;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v3 += m8;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v2 += m11;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v3 += m3;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v1 += m10;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 7) | v5 >>> 7;
		v0 += m12;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v0 += m4;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v1 += m7;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v2 += m15;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v3 += m1;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v2 += m14;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v3 += m9;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v1 += m5;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v0 += m13;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 7) | v5 >>> 7;

		// Round 7.
		v0 += m12;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v1 += m1;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v2 += m14;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v3 += m4;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v2 += m13;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v3 += m10;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v1 += m15;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 7) | v5 >>> 7;
		v0 += m5;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v0 += m0;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v1 += m6;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v2 += m9;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v3 += m8;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v2 += m2;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v3 += m11;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v1 += m3;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v0 += m7;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 7) | v5 >>> 7;

		// Round 8.
		v0 += m13;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v1 += m7;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v2 += m12;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v3 += m3;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v2 += m1;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v3 += m9;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v1 += m14;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 7) | v5 >>> 7;
		v0 += m11;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v0 += m5;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v1 += m15;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v2 += m8;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v3 += m2;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v2 += m6;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v3 += m10;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v1 += m4;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v0 += m0;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 7) | v5 >>> 7;

		// Round 9.
		v0 += m6;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v1 += m14;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v2 += m11;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v3 += m0;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v2 += m3;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v3 += m8;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v1 += m9;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 7) | v5 >>> 7;
		v0 += m15;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v0 += m12;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v1 += m13;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v2 += m1;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v3 += m10;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v2 += m4;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v3 += m5;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v1 += m7;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v0 += m2;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 7) | v5 >>> 7;

		// Round 10.
		v0 += m10;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v1 += m8;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v2 += m7;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v3 += m1;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v2 += m6;
		v2 += v6;
		v14 ^= v2;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v10 += v14;
		v6 ^= v10;
		v6 = v6 << (32 - 7) | v6 >>> 7;
		v3 += m5;
		v3 += v7;
		v15 ^= v3;
		v15 = v15 << (32 - 8) | v15 >>> 8;
		v11 += v15;
		v7 ^= v11;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v1 += m4;
		v1 += v5;
		v13 ^= v1;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v9 += v13;
		v5 ^= v9;
		v5 = v5 << (32 - 7) | v5 >>> 7;
		v0 += m2;
		v0 += v4;
		v12 ^= v0;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v8 += v12;
		v4 ^= v8;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v0 += m15;
		v0 += v5;
		v15 ^= v0;
		v15 = v15 << (32 - 16) | v15 >>> 16;
		v10 += v15;
		v5 ^= v10;
		v5 = v5 << (32 - 12) | v5 >>> 12;
		v1 += m9;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 16) | v12 >>> 16;
		v11 += v12;
		v6 ^= v11;
		v6 = v6 << (32 - 12) | v6 >>> 12;
		v2 += m3;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 16) | v13 >>> 16;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 12) | v7 >>> 12;
		v3 += m13;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 16) | v14 >>> 16;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 12) | v4 >>> 12;
		v2 += m12;
		v2 += v7;
		v13 ^= v2;
		v13 = v13 << (32 - 8) | v13 >>> 8;
		v8 += v13;
		v7 ^= v8;
		v7 = v7 << (32 - 7) | v7 >>> 7;
		v3 += m0;
		v3 += v4;
		v14 ^= v3;
		v14 = v14 << (32 - 8) | v14 >>> 8;
		v9 += v14;
		v4 ^= v9;
		v4 = v4 << (32 - 7) | v4 >>> 7;
		v1 += m14;
		v1 += v6;
		v12 ^= v1;
		v12 = v12 << (32 - 8) | v12 >>> 8;
		v11 += v12;
		v6 ^= v11;
		v6 = (v6 << (32 - 7)) | (v6 >>> 7);
		v0 += m11;
		v0 += v5;
		v15 ^= v0;
		v15 = (v15 << (32 - 8)) | (v15 >>> 8);
		v10 += v15;
		v5 ^= v10;
		v5 = (v5 << (32 - 7)) | (v5 >>> 7);

		this.h[0] ^= v0 ^ v8;
		this.h[1] ^= v1 ^ v9;
		this.h[2] ^= v2 ^ v10;
		this.h[3] ^= v3 ^ v11;
		this.h[4] ^= v4 ^ v12;
		this.h[5] ^= v5 ^ v13;
		this.h[6] ^= v6 ^ v14;
		this.h[7] ^= v7 ^ v15;
	};

	BLAKE2s.prototype.update = function(p, offset, length) {
		if (typeof p === 'string')
			throw new TypeError('update() accepts Uint8Array or an Array of bytes');
		if (this.isFinished)
			throw new Error('update() after calling digest()');

		if (typeof offset === 'undefined') { offset = 0; }
		if (typeof length === 'undefined') { length = p.length - offset; }

		if (length === 0) return;


		var i, left = 64 - this.nx;

		// Finish buffer.
		if (length > left) {
			for (i = 0; i < left; i++) {
				this.x[this.nx + i] = p[offset + i];
			}
			this.processBlock(64);
			offset += left;
			length -= left;
			this.nx = 0;
		}

		// Process message blocks.
		while (length > 64) {
			for (i = 0; i < 64; i++) {
				this.x[i] = p[offset + i];
			}
			this.processBlock(64);
			offset += 64;
			length -= 64;
			this.nx = 0;
		}

		// Copy leftovers to buffer.
		for (i = 0; i < length; i++) {
			this.x[this.nx + i] = p[offset + i];
		}
		this.nx += length;
	};

	BLAKE2s.prototype.digest = function() {
		var i;

		if (this.isFinished) return this.result;

		for (i = this.nx; i < 64; i++) this.x[i] = 0;

		// Set last block flag.
		this.f0 = 0xffffffff;

		//TODO in tree mode, set f1 to 0xffffffff.
		this.processBlock(this.nx);

		var d = new Uint8Array(32);
		for (i = 0; i < 8; i++) {
			var h = this.h[i];
			d[i * 4 + 0] = (h >>> 0) & 0xff;
			d[i * 4 + 1] = (h >>> 8) & 0xff;
			d[i * 4 + 2] = (h >>> 16) & 0xff;
			d[i * 4 + 3] = (h >>> 24) & 0xff;
		}
		this.result = new Uint8Array(d.subarray(0, this.digestLength));
		this.isFinished = true;
		return this.result;
	};

	BLAKE2s.prototype.hexDigest = function() {
		var hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
		var out = [];
		var d = this.digest();
		for (var i = 0; i < d.length; i++) {
			out.push(hex[(d[i] >> 4) & 0xf]);
			out.push(hex[d[i] & 0xf]);
		}
		return out.join('');
	};

	BLAKE2s.digestLength = MAX_DIGEST_LENGTH;
	BLAKE2s.blockLength = BLOCK_LENGTH;
	BLAKE2s.keyLength = MAX_KEY_LENGTH;

	return BLAKE2s;

})();

(function(nacl) {
  'use strict';

// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
//
// Implementation derived from TweetNaCl version 20140427.
// See for details: http://tweetnacl.cr.yp.to/

  /* jshint newcap: false */

  var u64 = function (h, l) { this.hi = h|0 >>> 0; this.lo = l|0 >>> 0; };
  var gf = function(init) {
    var i, r = new Float64Array(16);
    if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
    return r;
  };

//  Pluggable, initialized in high-level API below.
  var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };

  var _0 = new Uint8Array(16);
  var _9 = new Uint8Array(32); _9[0] = 9;

  var gf0 = gf(),
    gf1 = gf([1]),
    _121665 = gf([0xdb41, 1]),
    D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
    D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
    X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
    Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
    I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

  function L32(x, c) { return (x << c) | (x >>> (32 - c)); }

  function ld32(x, i) {
    var u = x[i+3] & 0xff;
    u = (u<<8)|(x[i+2] & 0xff);
    u = (u<<8)|(x[i+1] & 0xff);
    return (u<<8)|(x[i+0] & 0xff);
  }

  function dl64(x, i) {
    var h = (x[i] << 24) | (x[i+1] << 16) | (x[i+2] << 8) | x[i+3];
    var l = (x[i+4] << 24) | (x[i+5] << 16) | (x[i+6] << 8) | x[i+7];
    return new u64(h, l);
  }

  function st32(x, j, u) {
    var i;
    for (i = 0; i < 4; i++) { x[j+i] = u & 255; u >>>= 8; }
  }

  function ts64(x, i, u) {
    x[i]   = (u.hi >> 24) & 0xff;
    x[i+1] = (u.hi >> 16) & 0xff;
    x[i+2] = (u.hi >>  8) & 0xff;
    x[i+3] = u.hi & 0xff;
    x[i+4] = (u.lo >> 24)  & 0xff;
    x[i+5] = (u.lo >> 16)  & 0xff;
    x[i+6] = (u.lo >>  8)  & 0xff;
    x[i+7] = u.lo & 0xff;
  }

  function vn(x, xi, y, yi, n) {
    var i,d = 0;
    for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
    return (1 & ((d - 1) >>> 8)) - 1;
  }

  function crypto_verify_16(x, xi, y, yi) {
    return vn(x,xi,y,yi,16);
  }

  function crypto_verify_32(x, xi, y, yi) {
    return vn(x,xi,y,yi,32);
  }

  function core(out,inp,k,c,h) {
    var w = new Uint32Array(16), x = new Uint32Array(16),
      y = new Uint32Array(16), t = new Uint32Array(4);
    var i, j, m;

    for (i = 0; i < 4; i++) {
      x[5*i] = ld32(c, 4*i);
      x[1+i] = ld32(k, 4*i);
      x[6+i] = ld32(inp, 4*i);
      x[11+i] = ld32(k, 16+4*i);
    }

    for (i = 0; i < 16; i++) y[i] = x[i];

    for (i = 0; i < 20; i++) {
      for (j = 0; j < 4; j++) {
        for (m = 0; m < 4; m++) t[m] = x[(5*j+4*m)%16];
        t[1] ^= L32((t[0]+t[3])|0, 7);
        t[2] ^= L32((t[1]+t[0])|0, 9);
        t[3] ^= L32((t[2]+t[1])|0,13);
        t[0] ^= L32((t[3]+t[2])|0,18);
        for (m = 0; m < 4; m++) w[4*j+(j+m)%4] = t[m];
      }
      for (m = 0; m < 16; m++) x[m] = w[m];
    }

    if (h) {
      for (i = 0; i < 16; i++) x[i] = (x[i] + y[i]) | 0;
      for (i = 0; i < 4; i++) {
        x[5*i] = (x[5*i] - ld32(c, 4*i)) | 0;
        x[6+i] = (x[6+i] - ld32(inp, 4*i)) | 0;
      }
      for (i = 0; i < 4; i++) {
        st32(out,4*i,x[5*i]);
        st32(out,16+4*i,x[6+i]);
      }
    } else {
      for (i = 0; i < 16; i++) st32(out, 4 * i, (x[i] + y[i]) | 0);
    }
  }

  function crypto_core_salsa20(out,inp,k,c) {
    core(out,inp,k,c,false);
    return 0;
  }

  function crypto_core_hsalsa20(out,inp,k,c) {
    core(out,inp,k,c,true);
    return 0;
  }

  var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
  // "expand 32-byte k"

  function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
    var z = new Uint8Array(16), x = new Uint8Array(64);
    var u, i;
    if (!b) return 0;
    for (i = 0; i < 16; i++) z[i] = 0;
    for (i = 0; i < 8; i++) z[i] = n[i];
    while (b >= 64) {
      crypto_core_salsa20(x,z,k,sigma);
      for (i = 0; i < 64; i++) c[cpos+i] = (m?m[mpos+i]:0) ^ x[i];
      u = 1;
      for (i = 8; i < 16; i++) {
        u = u + (z[i] & 0xff) | 0;
        z[i] = u & 0xff;
        u >>>= 8;
      }
      b -= 64;
      cpos += 64;
      if (m) mpos += 64;
    }
    if (b > 0) {
      crypto_core_salsa20(x,z,k,sigma);
      for (i = 0; i < b; i++) c[cpos+i] = (m?m[mpos+i]:0) ^ x[i];
    }
    return 0;
  }

  function crypto_stream_salsa20(c,cpos,d,n,k) {
    return crypto_stream_salsa20_xor(c,cpos,null,0,d,n,k);
  }

  function crypto_stream(c,cpos,d,n,k) {
    var s = new Uint8Array(32);
    crypto_core_hsalsa20(s,n,k,sigma);
    return crypto_stream_salsa20(c,cpos,d,n.subarray(16),s);
  }

  function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
    var s = new Uint8Array(32);
    crypto_core_hsalsa20(s,n,k,sigma);
    return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,n.subarray(16),s);
  }

  function add1305(h, c) {
    var j, u = 0;
    for (j = 0; j < 17; j++) {
      u = (u + ((h[j] + c[j]) | 0)) | 0;
      h[j] = u & 255;
      u >>>= 8;
    }
  }

  var minusp = new Uint32Array([
    5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 252
  ]);

  function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
    var s, i, j, u;
    var x = new Uint32Array(17), r = new Uint32Array(17),
      h = new Uint32Array(17), c = new Uint32Array(17),
      g = new Uint32Array(17);
    for (j = 0; j < 17; j++) r[j]=h[j]=0;
    for (j = 0; j < 16; j++) r[j]=k[j];
    r[3]&=15;
    r[4]&=252;
    r[7]&=15;
    r[8]&=252;
    r[11]&=15;
    r[12]&=252;
    r[15]&=15;

    while (n > 0) {
      for (j = 0; j < 17; j++) c[j] = 0;
      for (j = 0;(j < 16) && (j < n);++j) c[j] = m[mpos+j];
      c[j] = 1;
      mpos += j; n -= j;
      add1305(h,c);
      for (i = 0; i < 17; i++) {
        x[i] = 0;
        for (j = 0; j < 17; j++) x[i] = (x[i] + (h[j] * ((j <= i) ? r[i - j] : ((320 * r[i + 17 - j])|0))) | 0) | 0;
      }
      for (i = 0; i < 17; i++) h[i] = x[i];
      u = 0;
      for (j = 0; j < 16; j++) {
        u = (u + h[j]) | 0;
        h[j] = u & 255;
        u >>>= 8;
      }
      u = (u + h[16]) | 0; h[16] = u & 3;
      u = (5 * (u >>> 2)) | 0;
      for (j = 0; j < 16; j++) {
        u = (u + h[j]) | 0;
        h[j] = u & 255;
        u >>>= 8;
      }
      u = (u + h[16]) | 0; h[16] = u;
    }

    for (j = 0; j < 17; j++) g[j] = h[j];
    add1305(h,minusp);
    s = (-(h[16] >>> 7) | 0);
    for (j = 0; j < 17; j++) h[j] ^= s & (g[j] ^ h[j]);

    for (j = 0; j < 16; j++) c[j] = k[j + 16];
    c[16] = 0;
    add1305(h,c);
    for (j = 0; j < 16; j++) out[outpos+j] = h[j];
    return 0;
  }

  function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
    var x = new Uint8Array(16);
    crypto_onetimeauth(x,0,m,mpos,n,k);
    return crypto_verify_16(h,hpos,x,0);
  }

  function crypto_secretbox(c,m,d,n,k) {
    var i;
    if (d < 32) return -1;
    crypto_stream_xor(c,0,m,0,d,n,k);
    crypto_onetimeauth(c, 16, c, 32, d - 32, c);
    for (i = 0; i < 16; i++) c[i] = 0;
    return 0;
  }

  function crypto_secretbox_open(m,c,d,n,k) {
    var i;
    var x = new Uint8Array(32);
    if (d < 32) return -1;
    crypto_stream(x,0,32,n,k);
    if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
    crypto_stream_xor(m,0,c,0,d,n,k);
    for (i = 0; i < 32; i++) m[i] = 0;
    return 0;
  }

  function set25519(r, a) {
    var i;
    for (i = 0; i < 16; i++) r[i] = a[i]|0;
  }

  function car25519(o) {
    var c;
    var i;
    for (i = 0; i < 16; i++) {
      o[i] += 65536;
      c = Math.floor(o[i] / 65536);
      o[(i+1)*(i<15?1:0)] += c - 1 + 37 * (c-1) * (i===15?1:0);
      o[i] -= (c * 65536);
    }
  }

  function sel25519(p, q, b) {
    var t, c = ~(b-1);
    for (var i = 0; i < 16; i++) {
      t = c & (p[i] ^ q[i]);
      p[i] ^= t;
      q[i] ^= t;
    }
  }

  function pack25519(o, n) {
    var i, j, b;
    var m = gf(), t = gf();
    for (i = 0; i < 16; i++) t[i] = n[i];
    car25519(t);
    car25519(t);
    car25519(t);
    for (j = 0; j < 2; j++) {
      m[0] = t[0] - 0xffed;
      for (i = 1; i < 15; i++) {
        m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
        m[i-1] &= 0xffff;
      }
      m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
      b = (m[15]>>16) & 1;
      m[14] &= 0xffff;
      sel25519(t, m, 1-b);
    }
    for (i = 0; i < 16; i++) {
      o[2*i] = t[i] & 0xff;
      o[2*i+1] = t[i]>>8;
    }
  }

  function neq25519(a, b) {
    var c = new Uint8Array(32), d = new Uint8Array(32);
    pack25519(c, a);
    pack25519(d, b);
    return crypto_verify_32(c, 0, d, 0);
  }

  function par25519(a) {
    var d = new Uint8Array(32);
    pack25519(d, a);
    return d[0] & 1;
  }

  function unpack25519(o, n) {
    var i;
    for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
    o[15] &= 0x7fff;
  }

  function A(o, a, b) {
    var i;
    for (i = 0; i < 16; i++) o[i] = (a[i] + b[i])|0;
  }

  function Z(o, a, b) {
    var i;
    for (i = 0; i < 16; i++) o[i] = (a[i] - b[i])|0;
  }

  function M(o, a, b) {
    var i, j, t = new Float64Array(31);
    for (i = 0; i < 31; i++) t[i] = 0;
    for (i = 0; i < 16; i++) {
      for (j = 0; j < 16; j++) {
        t[i+j] += a[i] * b[j];
      }
    }
    for (i = 0; i < 15; i++) {
      t[i] += 38 * t[i+16];
    }
    for (i = 0; i < 16; i++) o[i] = t[i];
    car25519(o);
    car25519(o);
  }

  function S(o, a) {
    M(o, a, a);
  }

  function inv25519(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; a++) c[a] = i[a];
    for (a = 253; a >= 0; a--) {
      S(c, c);
      if(a !== 2 && a !== 4) M(c, c, i);
    }
    for (a = 0; a < 16; a++) o[a] = c[a];
  }

  function pow2523(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; a++) c[a] = i[a];
    for (a = 250; a >= 0; a--) {
      S(c, c);
      if(a !== 1) M(c, c, i);
    }
    for (a = 0; a < 16; a++) o[a] = c[a];
  }

  function crypto_scalarmult(q, n, p) {
    var z = new Uint8Array(32);
    var x = new Float64Array(80), r, i;
    var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf();
    for (i = 0; i < 31; i++) z[i] = n[i];
    z[31]=(n[31]&127)|64;
    z[0]&=248;
    unpack25519(x,p);
    for (i = 0; i < 16; i++) {
      b[i]=x[i];
      d[i]=a[i]=c[i]=0;
    }
    a[0]=d[0]=1;
    for (i=254;i>=0;--i) {
      r=(z[i>>>3]>>>(i&7))&1;
      sel25519(a,b,r);
      sel25519(c,d,r);
      A(e,a,c);
      Z(a,a,c);
      A(c,b,d);
      Z(b,b,d);
      S(d,e);
      S(f,a);
      M(a,c,a);
      M(c,b,e);
      A(e,a,c);
      Z(a,a,c);
      S(b,a);
      Z(c,d,f);
      M(a,c,_121665);
      A(a,a,d);
      M(c,c,a);
      M(a,d,f);
      M(d,b,x);
      S(b,e);
      sel25519(a,b,r);
      sel25519(c,d,r);
    }
    for (i = 0; i < 16; i++) {
      x[i+16]=a[i];
      x[i+32]=c[i];
      x[i+48]=b[i];
      x[i+64]=d[i];
    }
    var x32 = x.subarray(32);
    var x16 = x.subarray(16);
    inv25519(x32,x32);
    M(x16,x16,x32);
    pack25519(q,x16);
    return 0;
  }

  function crypto_scalarmult_base(q, n) {
    return crypto_scalarmult(q, n, _9);
  }

  function crypto_box_keypair(y, x) {
    randombytes(x, 32);
    return crypto_scalarmult_base(y, x);
  }

  function crypto_box_beforenm(k, y, x) {
    var s = new Uint8Array(32);
    crypto_scalarmult(s, x, y);
    return crypto_core_hsalsa20(k, _0, s, sigma);
  }

  var crypto_box_afternm = crypto_secretbox;
  var crypto_box_open_afternm = crypto_secretbox_open;

  function crypto_box(c, m, d, n, y, x) {
    var k = new Uint8Array(32);
    crypto_box_beforenm(k, y, x);
    return crypto_box_afternm(c, m, d, n, k);
  }

  function crypto_box_open(m, c, d, n, y, x) {
    var k = new Uint8Array(32);
    crypto_box_beforenm(k, y, x);
    return crypto_box_open_afternm(m, c, d, n, k);
  }

  function add64() {
    var a = 0, b = 0, c = 0, d = 0, m16 = 65535, l, h, i;
    for (i = 0; i < arguments.length; i++) {
      l = arguments[i].lo;
      h = arguments[i].hi;
      a += (l & m16); b += (l >>> 16);
      c += (h & m16); d += (h >>> 16);
    }

    b += (a >>> 16);
    c += (b >>> 16);
    d += (c >>> 16);

    return new u64((c & m16) | (d << 16), (a & m16) | (b << 16));
  }

  function shr64(x, c) {
    return new u64((x.hi >>> c), (x.lo >>> c) | (x.hi << (32 - c)));
  }

  function xor64() {
    var l = 0, h = 0, i;
    for (i = 0; i < arguments.length; i++) {
      l ^= arguments[i].lo;
      h ^= arguments[i].hi;
    }
    return new u64(h, l);
  }

  function R(x, c) {
    var h, l, c1 = 32 - c;
    if (c < 32) {
      h = (x.hi >>> c) | (x.lo << c1);
      l = (x.lo >>> c) | (x.hi << c1);
    } else if (c < 64) {
      h = (x.lo >>> c) | (x.hi << c1);
      l = (x.hi >>> c) | (x.lo << c1);
    }
    return new u64(h, l);
  }

  function Ch(x, y, z) {
    var h = (x.hi & y.hi) ^ (~x.hi & z.hi),
      l = (x.lo & y.lo) ^ (~x.lo & z.lo);
    return new u64(h, l);
  }

  function Maj(x, y, z) {
    var h = (x.hi & y.hi) ^ (x.hi & z.hi) ^ (y.hi & z.hi),
      l = (x.lo & y.lo) ^ (x.lo & z.lo) ^ (y.lo & z.lo);
    return new u64(h, l);
  }

  function Sigma0(x) { return xor64(R(x,28), R(x,34), R(x,39)); }
  function Sigma1(x) { return xor64(R(x,14), R(x,18), R(x,41)); }
  function sigma0(x) { return xor64(R(x, 1), R(x, 8), shr64(x,7)); }
  function sigma1(x) { return xor64(R(x,19), R(x,61), shr64(x,6)); }

  var K = [
    new u64(0x428a2f98, 0xd728ae22), new u64(0x71374491, 0x23ef65cd),
    new u64(0xb5c0fbcf, 0xec4d3b2f), new u64(0xe9b5dba5, 0x8189dbbc),
    new u64(0x3956c25b, 0xf348b538), new u64(0x59f111f1, 0xb605d019),
    new u64(0x923f82a4, 0xaf194f9b), new u64(0xab1c5ed5, 0xda6d8118),
    new u64(0xd807aa98, 0xa3030242), new u64(0x12835b01, 0x45706fbe),
    new u64(0x243185be, 0x4ee4b28c), new u64(0x550c7dc3, 0xd5ffb4e2),
    new u64(0x72be5d74, 0xf27b896f), new u64(0x80deb1fe, 0x3b1696b1),
    new u64(0x9bdc06a7, 0x25c71235), new u64(0xc19bf174, 0xcf692694),
    new u64(0xe49b69c1, 0x9ef14ad2), new u64(0xefbe4786, 0x384f25e3),
    new u64(0x0fc19dc6, 0x8b8cd5b5), new u64(0x240ca1cc, 0x77ac9c65),
    new u64(0x2de92c6f, 0x592b0275), new u64(0x4a7484aa, 0x6ea6e483),
    new u64(0x5cb0a9dc, 0xbd41fbd4), new u64(0x76f988da, 0x831153b5),
    new u64(0x983e5152, 0xee66dfab), new u64(0xa831c66d, 0x2db43210),
    new u64(0xb00327c8, 0x98fb213f), new u64(0xbf597fc7, 0xbeef0ee4),
    new u64(0xc6e00bf3, 0x3da88fc2), new u64(0xd5a79147, 0x930aa725),
    new u64(0x06ca6351, 0xe003826f), new u64(0x14292967, 0x0a0e6e70),
    new u64(0x27b70a85, 0x46d22ffc), new u64(0x2e1b2138, 0x5c26c926),
    new u64(0x4d2c6dfc, 0x5ac42aed), new u64(0x53380d13, 0x9d95b3df),
    new u64(0x650a7354, 0x8baf63de), new u64(0x766a0abb, 0x3c77b2a8),
    new u64(0x81c2c92e, 0x47edaee6), new u64(0x92722c85, 0x1482353b),
    new u64(0xa2bfe8a1, 0x4cf10364), new u64(0xa81a664b, 0xbc423001),
    new u64(0xc24b8b70, 0xd0f89791), new u64(0xc76c51a3, 0x0654be30),
    new u64(0xd192e819, 0xd6ef5218), new u64(0xd6990624, 0x5565a910),
    new u64(0xf40e3585, 0x5771202a), new u64(0x106aa070, 0x32bbd1b8),
    new u64(0x19a4c116, 0xb8d2d0c8), new u64(0x1e376c08, 0x5141ab53),
    new u64(0x2748774c, 0xdf8eeb99), new u64(0x34b0bcb5, 0xe19b48a8),
    new u64(0x391c0cb3, 0xc5c95a63), new u64(0x4ed8aa4a, 0xe3418acb),
    new u64(0x5b9cca4f, 0x7763e373), new u64(0x682e6ff3, 0xd6b2b8a3),
    new u64(0x748f82ee, 0x5defb2fc), new u64(0x78a5636f, 0x43172f60),
    new u64(0x84c87814, 0xa1f0ab72), new u64(0x8cc70208, 0x1a6439ec),
    new u64(0x90befffa, 0x23631e28), new u64(0xa4506ceb, 0xde82bde9),
    new u64(0xbef9a3f7, 0xb2c67915), new u64(0xc67178f2, 0xe372532b),
    new u64(0xca273ece, 0xea26619c), new u64(0xd186b8c7, 0x21c0c207),
    new u64(0xeada7dd6, 0xcde0eb1e), new u64(0xf57d4f7f, 0xee6ed178),
    new u64(0x06f067aa, 0x72176fba), new u64(0x0a637dc5, 0xa2c898a6),
    new u64(0x113f9804, 0xbef90dae), new u64(0x1b710b35, 0x131c471b),
    new u64(0x28db77f5, 0x23047d84), new u64(0x32caab7b, 0x40c72493),
    new u64(0x3c9ebe0a, 0x15c9bebc), new u64(0x431d67c4, 0x9c100d4c),
    new u64(0x4cc5d4be, 0xcb3e42b6), new u64(0x597f299c, 0xfc657e2a),
    new u64(0x5fcb6fab, 0x3ad6faec), new u64(0x6c44198c, 0x4a475817)
  ];

  function crypto_hashblocks(x, m, n) {
    var z = [], b = [], a = [], w = [], t, i, j;

    for (i = 0; i < 8; i++) z[i] = a[i] = dl64(x, 8*i);

    var pos = 0;
    while (n >= 128) {
      for (i = 0; i < 16; i++) w[i] = dl64(m, 8*i+pos);
      for (i = 0; i < 80; i++) {
        for (j = 0; j < 8; j++) b[j] = a[j];
        t = add64(a[7], Sigma1(a[4]), Ch(a[4], a[5], a[6]), K[i], w[i%16]);
        b[7] = add64(t, Sigma0(a[0]), Maj(a[0], a[1], a[2]));
        b[3] = add64(b[3], t);
        for (j = 0; j < 8; j++) a[(j+1)%8] = b[j];
        if (i%16 === 15) {
          for (j = 0; j < 16; j++) {
            w[j] = add64(w[j], w[(j+9)%16], sigma0(w[(j+1)%16]), sigma1(w[(j+14)%16]));
          }
        }
      }

      for (i = 0; i < 8; i++) {
        a[i] = add64(a[i], z[i]);
        z[i] = a[i];
      }

      pos += 128;
      n -= 128;
    }

    for (i = 0; i < 8; i++) ts64(x, 8*i, z[i]);
    return n;
  }

  var iv = new Uint8Array([
    0x6a,0x09,0xe6,0x67,0xf3,0xbc,0xc9,0x08,
    0xbb,0x67,0xae,0x85,0x84,0xca,0xa7,0x3b,
    0x3c,0x6e,0xf3,0x72,0xfe,0x94,0xf8,0x2b,
    0xa5,0x4f,0xf5,0x3a,0x5f,0x1d,0x36,0xf1,
    0x51,0x0e,0x52,0x7f,0xad,0xe6,0x82,0xd1,
    0x9b,0x05,0x68,0x8c,0x2b,0x3e,0x6c,0x1f,
    0x1f,0x83,0xd9,0xab,0xfb,0x41,0xbd,0x6b,
    0x5b,0xe0,0xcd,0x19,0x13,0x7e,0x21,0x79
  ]);

  function crypto_hash(out, m, n) {
    var h = new Uint8Array(64), x = new Uint8Array(256);
    var i, b = n;

    for (i = 0; i < 64; i++) h[i] = iv[i];

    crypto_hashblocks(h, m, n);
    n %= 128;

    for (i = 0; i < 256; i++) x[i] = 0;
    for (i = 0; i < n; i++) x[i] = m[b-n+i];
    x[n] = 128;

    n = 256-128*(n<112?1:0);
    x[n-9] = 0;
    ts64(x, n-8, new u64((b / 0x20000000) | 0, b << 3));
    crypto_hashblocks(h, x, n);

    for (i = 0; i < 64; i++) out[i] = h[i];

    return 0;
  }

  function add(p, q) {
    var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf(),
      g = gf(), h = gf(), t = gf();

    Z(a, p[1], p[0]);
    Z(t, q[1], q[0]);
    M(a, a, t);
    A(b, p[0], p[1]);
    A(t, q[0], q[1]);
    M(b, b, t);
    M(c, p[3], q[3]);
    M(c, c, D2);
    M(d, p[2], q[2]);
    A(d, d, d);
    Z(e, b, a);
    Z(f, d, c);
    A(g, d, c);
    A(h, b, a);

    M(p[0], e, f);
    M(p[1], h, g);
    M(p[2], g, f);
    M(p[3], e, h);
  }

  function cswap(p, q, b) {
    var i;
    for (i = 0; i < 4; i++) {
      sel25519(p[i], q[i], b);
    }
  }

  function pack(r, p) {
    var tx = gf(), ty = gf(), zi = gf();
    inv25519(zi, p[2]);
    M(tx, p[0], zi);
    M(ty, p[1], zi);
    pack25519(r, ty);
    r[31] ^= par25519(tx) << 7;
  }

  function scalarmult(p, q, s) {
    var b, i;
    set25519(p[0], gf0);
    set25519(p[1], gf1);
    set25519(p[2], gf1);
    set25519(p[3], gf0);
    for (i = 255; i >= 0; --i) {
      b = (s[(i/8)|0] >> (i&7)) & 1;
      cswap(p, q, b);
      add(q, p);
      add(p, p);
      cswap(p, q, b);
    }
  }

  function scalarbase(p, s) {
    var q = [gf(), gf(), gf(), gf()];
    set25519(q[0], X);
    set25519(q[1], Y);
    set25519(q[2], gf1);
    M(q[3], X, Y);
    scalarmult(p, q, s);
  }

  function crypto_sign_keypair_from_seed(seed, pk, sk) {
    var d = new Uint8Array(64);
    var p = [gf(), gf(), gf(), gf()];
    var i;

    crypto_hash(d, seed, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;

    scalarbase(p, d);
    pack(pk, p);

    for (i = 0; i < 32; i++) sk[i] = seed[i];
    for (i = 0; i < 32; i++) sk[i+32] = pk[i];
    return 0;
  }

  function crypto_sign_keypair(pk, sk) {
    var seed = new Uint8Array(crypto_sign_SEEDBYTES)
    randombytes(seed, crypto_sign_SEEDBYTES)

    return crypto_sign_keypair_from_seed(seed, pk, sk);
  }

  var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

  function modL(r, x) {
    var carry, i, j, k;
    for (i = 63; i >= 32; --i) {
      carry = 0;
      for (j = i - 32, k = i - 12; j < k; ++j) {
        x[j] += carry - 16 * x[i] * L[j - (i - 32)];
        carry = (x[j] + 128) >> 8;
        x[j] -= carry * 256;
      }
      x[j] += carry;
      x[i] = 0;
    }
    carry = 0;
    for (j = 0; j < 32; j++) {
      x[j] += carry - (x[31] >> 4) * L[j];
      carry = x[j] >> 8;
      x[j] &= 255;
    }
    for (j = 0; j < 32; j++) x[j] -= carry * L[j];
    for (i = 0; i < 32; i++) {
      x[i+1] += x[i] >> 8;
      r[i] = x[i] & 255;
    }
  }

  function reduce(r) {
    var x = new Float64Array(64), i;
    for (i = 0; i < 64; i++) x[i] = r[i];
    for (i = 0; i < 64; i++) r[i] = 0;
    modL(r, x);
  }

// Note: difference from C - smlen returned, not passed as argument.
  function crypto_sign(sm, m, n, sk) {
    var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
    var i, j, x = new Float64Array(64);
    var p = [gf(), gf(), gf(), gf()];

    crypto_hash(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;

    var smlen = n + 64;
    for (i = 0; i < n; i++) sm[64 + i] = m[i];
    for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

    crypto_hash(r, sm.subarray(32), n+32);
    reduce(r);
    scalarbase(p, r);
    pack(sm, p);

    for (i = 32; i < 64; i++) sm[i] = sk[i];
    crypto_hash(h, sm, n + 64);
    reduce(h);

    for (i = 0; i < 64; i++) x[i] = 0;
    for (i = 0; i < 32; i++) x[i] = r[i];
    for (i = 0; i < 32; i++) {
      for (j = 0; j < 32; j++) {
        x[i+j] += h[i] * d[j];
      }
    }

    modL(sm.subarray(32), x);
    return smlen;
  }

  function unpackneg(r, p) {
    var t = gf(), chk = gf(), num = gf(),
      den = gf(), den2 = gf(), den4 = gf(),
      den6 = gf();

    set25519(r[2], gf1);
    unpack25519(r[1], p);
    S(num, r[1]);
    M(den, num, D);
    Z(num, num, r[2]);
    A(den, r[2], den);

    S(den2, den);
    S(den4, den2);
    M(den6, den4, den2);
    M(t, den6, num);
    M(t, t, den);

    pow2523(t, t);
    M(t, t, num);
    M(t, t, den);
    M(t, t, den);
    M(r[0], t, den);

    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num)) M(r[0], r[0], I);

    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num)) return -1;

    if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

    M(r[3], r[0], r[1]);
    return 0;
  }

  function crypto_sign_open(m, sm, n, pk) {
    var i, mlen;
    var t = new Uint8Array(32), h = new Uint8Array(64);
    var p = [gf(), gf(), gf(), gf()],
      q = [gf(), gf(), gf(), gf()];

    mlen = -1;
    if (n < 64) return -1;

    if (unpackneg(q, pk)) return -1;

    for (i = 0; i < n; i++) m[i] = sm[i];
    for (i = 0; i < 32; i++) m[i+32] = pk[i];
    crypto_hash(h, m, n);
    reduce(h);
    scalarmult(p, q, h);

    scalarbase(q, sm.subarray(32));
    add(p, q);
    pack(t, p);

    n -= 64;
    if (crypto_verify_32(sm, 0, t, 0)) {
      for (i = 0; i < n; i++) m[i] = 0;
      return -1;
    }

    for (i = 0; i < n; i++) m[i] = sm[i + 64];
    mlen = n;
    return mlen;
  }

  var crypto_secretbox_KEYBYTES = 32,
    crypto_secretbox_NONCEBYTES = 24,
    crypto_secretbox_ZEROBYTES = 32,
    crypto_secretbox_BOXZEROBYTES = 16,
    crypto_scalarmult_BYTES = 32,
    crypto_scalarmult_SCALARBYTES = 32,
    crypto_box_PUBLICKEYBYTES = 32,
    crypto_box_SECRETKEYBYTES = 32,
    crypto_box_BEFORENMBYTES = 32,
    crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
    crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
    crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
    crypto_sign_BYTES = 64,
    crypto_sign_SEEDBYTES = 32,
    crypto_sign_PUBLICKEYBYTES = 32,
    crypto_sign_SECRETKEYBYTES = 64,
    crypto_hash_BYTES = 64;

  nacl.lowlevel = {
    crypto_stream_xor : crypto_stream_xor,
    crypto_stream : crypto_stream,
    crypto_stream_salsa20_xor : crypto_stream_salsa20_xor,
    crypto_stream_salsa20 : crypto_stream_salsa20,
    crypto_onetimeauth : crypto_onetimeauth,
    crypto_onetimeauth_verify : crypto_onetimeauth_verify,
    crypto_verify_16 : crypto_verify_16,
    crypto_verify_32 : crypto_verify_32,
    crypto_secretbox : crypto_secretbox,
    crypto_secretbox_open : crypto_secretbox_open,
    crypto_scalarmult : crypto_scalarmult,
    crypto_scalarmult_base : crypto_scalarmult_base,
    crypto_box_beforenm : crypto_box_beforenm,
    crypto_box_afternm : crypto_box_afternm,
    crypto_box : crypto_box,
    crypto_box_open : crypto_box_open,
    crypto_box_keypair : crypto_box_keypair,
    crypto_hash : crypto_hash,
    crypto_hashblocks : crypto_hashblocks, // for testing
    crypto_sign : crypto_sign,
    crypto_sign_keypair : crypto_sign_keypair,
    crypto_sign_open : crypto_sign_open,

    crypto_secretbox_KEYBYTES : crypto_secretbox_KEYBYTES,
    crypto_secretbox_NONCEBYTES : crypto_secretbox_NONCEBYTES,
    crypto_secretbox_ZEROBYTES : crypto_secretbox_ZEROBYTES,
    crypto_secretbox_BOXZEROBYTES : crypto_secretbox_BOXZEROBYTES,
    crypto_scalarmult_BYTES : crypto_scalarmult_BYTES,
    crypto_scalarmult_SCALARBYTES : crypto_scalarmult_SCALARBYTES,
    crypto_box_PUBLICKEYBYTES : crypto_box_PUBLICKEYBYTES,
    crypto_box_SECRETKEYBYTES : crypto_box_SECRETKEYBYTES,
    crypto_box_BEFORENMBYTES : crypto_box_BEFORENMBYTES,
    crypto_box_NONCEBYTES : crypto_box_NONCEBYTES,
    crypto_box_ZEROBYTES : crypto_box_ZEROBYTES,
    crypto_box_BOXZEROBYTES : crypto_box_BOXZEROBYTES,
    crypto_sign_BYTES : crypto_sign_BYTES,
    crypto_sign_SEEDBYTES : crypto_sign_SEEDBYTES,
    crypto_sign_PUBLICKEYBYTES : crypto_sign_PUBLICKEYBYTES,
    crypto_sign_SECRETKEYBYTES : crypto_sign_SECRETKEYBYTES,
    crypto_hash_BYTES : crypto_hash_BYTES
  };

  /* High-level API */

  function checkLengths(k, n) {
    if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
    if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
  }

  function checkBoxLengths(pk, sk) {
    if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
    if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
  }

  function checkArrayTypes() {
    var type = {}.toString, t;
    for (var i = 0; i < arguments.length; i++) {
      if ((t = type.call(arguments[i])) !== '[object Uint8Array]')
        throw new TypeError('unexpected type ' + t + ', use Uint8Array');
    }
  }

  nacl.util = {};

  nacl.util.decodeUTF8 = function(s) {
    var i, d = unescape(encodeURIComponent(s)), b = new Uint8Array(d.length);
    for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
    return b;
  };

  nacl.util.encodeUTF8 = function(arr) {
    var i, s = [];
    for (i = 0; i < arr.length; i++) s.push(String.fromCharCode(arr[i]));
    return decodeURIComponent(escape(s.join('')));
  };

  nacl.util.encodeBase64 = function(arr) {
    if (typeof btoa === 'undefined') {
      return (new Buffer(arr)).toString('base64');
    } else {
      var i, s = [], len = arr.length;
      for (i = 0; i < len; i++) s.push(String.fromCharCode(arr[i]));
      return btoa(s.join(''));
    }
  };

  nacl.util.decodeBase64 = function(s) {
    if (typeof atob === 'undefined') {
      return new Uint8Array(Array.prototype.slice.call(new Buffer(s, 'base64'), 0));
    } else {
      var i, d = atob(s), b = new Uint8Array(d.length);
      for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
      return b;
    }
  };

  nacl.randomBytes = function(n) {
    var b = new Uint8Array(n);
    randombytes(b, n);
    return b;
  };

  nacl.secretbox = function(msg, nonce, key) {
    checkArrayTypes(msg, nonce, key);
    checkLengths(key, nonce);
    var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
    var c = new Uint8Array(m.length);
    for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
    crypto_secretbox(c, m, m.length, nonce, key);
    return c.subarray(crypto_secretbox_BOXZEROBYTES);
  };

  nacl.secretbox.open = function(box, nonce, key) {
    checkArrayTypes(box, nonce, key);
    checkLengths(key, nonce);
    var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
    var m = new Uint8Array(c.length);
    for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
    if (c.length < 32) return false;
    if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return false;
    return m.subarray(crypto_secretbox_ZEROBYTES);
  };

  nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
  nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
  nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

  nacl.scalarMult = function(n, p) {
    checkArrayTypes(n, p);
    if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
    if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
    var q = new Uint8Array(crypto_scalarmult_BYTES);
    crypto_scalarmult(q, n, p);
    return q;
  };

  nacl.scalarMult.base = function(n) {
    checkArrayTypes(n);
    if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
    var q = new Uint8Array(crypto_scalarmult_BYTES);
    crypto_scalarmult_base(q, n);
    return q;
  };

  nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
  nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

  nacl.box = function(msg, nonce, publicKey, secretKey) {
    var k = nacl.box.before(publicKey, secretKey);
    return nacl.secretbox(msg, nonce, k);
  };

  nacl.box.before = function(publicKey, secretKey) {
    checkArrayTypes(publicKey, secretKey);
    checkBoxLengths(publicKey, secretKey);
    var k = new Uint8Array(crypto_box_BEFORENMBYTES);
    crypto_box_beforenm(k, publicKey, secretKey);
    return k;
  };

  nacl.box.after = nacl.secretbox;

  nacl.box.open = function(msg, nonce, publicKey, secretKey) {
    var k = nacl.box.before(publicKey, secretKey);
    return nacl.secretbox.open(msg, nonce, k);
  };

  nacl.box.open.after = nacl.secretbox.open;

  nacl.box.keyPair = function() {
    var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
    var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
    crypto_box_keypair(pk, sk);
    return {publicKey: pk, secretKey: sk};
  };

  nacl.box.keyPair.fromSecretKey = function(secretKey) {
    checkArrayTypes(secretKey);
    if (secretKey.length !== crypto_box_SECRETKEYBYTES)
      throw new Error('bad secret key size');
    var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
    crypto_scalarmult_base(pk, secretKey);
    return {publicKey: pk, secretKey: secretKey};
  };

  nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
  nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
  nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
  nacl.box.nonceLength = crypto_box_NONCEBYTES;
  nacl.box.overheadLength = nacl.secretbox.overheadLength;

  nacl.sign = function(msg, secretKey) {
    checkArrayTypes(msg, secretKey);
    if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
      throw new Error('bad secret key size');
    var sm = new Uint8Array(crypto_sign_BYTES+msg.length);
    crypto_sign(sm, msg, msg.length, secretKey);
    var sig = new Uint8Array(crypto_sign_BYTES);
    for (var i = 0; i < sig.length; i++) sig[i] = sm[i];
    return sig;
  };

  nacl.sign.open = function(msg, sig, publicKey) {
    checkArrayTypes(msg, sig, publicKey);
    if (sig.length !== crypto_sign_BYTES)
      throw new Error('bad signature size');
    if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
      throw new Error('bad public key size');
    var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
    var m = new Uint8Array(crypto_sign_BYTES + msg.length);
    var i;
    for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
    for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
    var mlen = crypto_sign_open(m, sm, sm.length, publicKey);
    if (mlen < 0) return false;
    return m.subarray(0, mlen);
  };

  nacl.sign.keyPair = function() {
    var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
    var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
    crypto_sign_keypair(pk, sk);
    return {publicKey: pk, secretKey: sk};
  };

  nacl.sign.keyPair.fromSecretKey = function(secretKey) {
    checkArrayTypes(secretKey);
    if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
      throw new Error('bad secret key size');
    var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
    var i;
    for (i = 0; i < 32; i++) pk[i] = secretKey[32+i];
    return {publicKey: pk, secretKey: secretKey};
  };

  nacl.sign.keyPair.fromSeed = function(seed) {
    checkArrayTypes(seed);
    if (seed.length !== crypto_sign_SEEDBYTES)
      throw new Error('bad seed size');
    var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
    var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
    crypto_sign_keypair_from_seed(seed, pk, sk);
    return {publicKey: pk, secretKey: sk};
  };

  nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
  nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
  nacl.sign.signatureLength = crypto_sign_BYTES;

  nacl.hash = function(msg) {
    checkArrayTypes(msg);
    var h = new Uint8Array(crypto_hash_BYTES);
    crypto_hash(h, msg, msg.length);
    return h;
  };

  nacl.hash.hashLength = crypto_hash_BYTES;

  nacl.verify = function(x, y) {
    checkArrayTypes(x, y);
    // Zero length arguments are considered not equal.
    if (x.length === 0 || y.length === 0) return false;
    if (x.length !== y.length) return false;
    return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
  };

  nacl.setPRNG = function(fn) {
    randombytes = fn;
  };

  (function() {
    // Initialize PRNG if environment provides CSPRNG.
    // If not, methods calling randombytes will throw.
    var crypto;
    if (typeof window !== 'undefined') {
      // Browser.
      if (window.crypto && window.crypto.getRandomValues) {
        crypto = window.crypto; // Standard
      } else if (window.msCrypto && window.msCrypto.getRandomValues) {
        crypto = window.msCrypto; // Internet Explorer 11+
      }
      if (crypto) {
        nacl.setPRNG(function(x, n) {
          var i, v = new Uint8Array(n);
          crypto.getRandomValues(v);
          for (i = 0; i < n; i++) x[i] = v[i];
        });
      }
    } else if (typeof require !== 'undefined') {
      // Node.js.
      crypto = require('crypto');
      if (crypto) {
        nacl.setPRNG(function(x, n) {
          var i, v = crypto.randomBytes(n);
          for (i = 0; i < n; i++) x[i] = v[i];
        });
      }
    }
  })();

})(typeof module !== 'undefined' && module.exports ? module.exports : (window.nacl = window.nacl || {}));
/*
 * nacl-stream: streaming encryption based on TweetNaCl.js
 * Written by Dmitry Chestnykh in 2014. Public domain.
 * <https://github.com/dchest/nacl-stream-js>
 */
(function(root, f) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) module.exports.stream = f(require('tweetnacl/nacl-fast'));
  else root.nacl.stream = f(root.nacl);

}(this, function(nacl) {
  'use strict';

  if (!nacl) throw new Error('tweetnacl not loaded');

  var DEFAULT_MAX_CHUNK = 65535;

  var ZEROBYTES = nacl.lowlevel.crypto_secretbox_ZEROBYTES;
  var BOXZEROBYTES = nacl.lowlevel.crypto_secretbox_BOXZEROBYTES;
  var crypto_secretbox = nacl.lowlevel.crypto_secretbox;
  var crypto_secretbox_open = nacl.lowlevel.crypto_secretbox_open;

  function incrementChunkCounter(fullNonce) {
    for (var i = 16; i < 24; i++) {
      fullNonce[i]++;
      if (fullNonce[i]) break;
    }
  }

  function setLastChunkFlag(fullNonce) {
    fullNonce[23] |= 0x80;
  }

  function clean() {
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      for (var j = 0; j < arg.length; j++) arg[j] = 0;
    }
  }

  function readChunkLength(data, offset) {
    offset |= 0;
    if (data.length < offset + 4) return -1;
    return data[offset] | data[offset+1] << 8 |
           data[offset+2] << 16 | data[offset+3] << 24;
  };


  function checkArgs(key, nonce, maxChunkLength) {
    if (key.length !== 32) throw new Error('bad key length, must be 32 bytes');
    if (nonce.length !== 16) throw new Error('bad nonce length, must be 16 bytes');
    if (maxChunkLength >= 0xffffffff) throw new Error('max chunk length is too large');
    if (maxChunkLength < 16) throw new Error('max chunk length is too small');
  }

  function StreamEncryptor(key, nonce, maxChunkLength) {
    checkArgs(key, nonce, maxChunkLength);
    this._key = key;
    this._fullNonce = new Uint8Array(24);
    this._fullNonce.set(nonce);
    this._maxChunkLength = maxChunkLength || DEFAULT_MAX_CHUNK;
    this._in = new Uint8Array(ZEROBYTES + this._maxChunkLength);
    this._out = new Uint8Array(ZEROBYTES + this._maxChunkLength);
    this._done = false;
  }

  StreamEncryptor.prototype.encryptChunk = function(chunk, isLast) {
    if (this._done) throw new Error('called encryptChunk after last chunk');
    var chunkLen = chunk.length;
    if (chunkLen > this._maxChunkLength)
      throw new Error('chunk is too large: ' + chunkLen + ' / ' + this._maxChunkLength);
    for (var i = 0; i < ZEROBYTES; i++) this._in[i] = 0;
    this._in.set(chunk, ZEROBYTES);
    if (isLast) {
      setLastChunkFlag(this._fullNonce);
      this._done = true;
    }
    crypto_secretbox(this._out, this._in, chunkLen + ZEROBYTES, this._fullNonce, this._key);
    incrementChunkCounter(this._fullNonce);
    var encryptedChunk = this._out.subarray(BOXZEROBYTES-4, BOXZEROBYTES-4 + chunkLen+16+4);
    encryptedChunk[0] = (chunkLen >>>  0) & 0xff;
    encryptedChunk[1] = (chunkLen >>>  8) & 0xff;
    encryptedChunk[2] = (chunkLen >>> 16) & 0xff;
    encryptedChunk[3] = (chunkLen >>> 24) & 0xff;
    return new Uint8Array(encryptedChunk);
  };

  StreamEncryptor.prototype.clean = function() {
    clean(this._fullNonce, this._in, this._out);
  };

  function StreamDecryptor(key, nonce, maxChunkLength) {
    checkArgs(key, nonce, maxChunkLength);
    this._key = key;
    this._fullNonce = new Uint8Array(24);
    this._fullNonce.set(nonce);
    this._maxChunkLength = maxChunkLength || DEFAULT_MAX_CHUNK;
    this._in = new Uint8Array(ZEROBYTES + this._maxChunkLength);
    this._out = new Uint8Array(ZEROBYTES + this._maxChunkLength);
    this._failed = false;
    this._done = false;
  }

  StreamDecryptor.prototype._fail = function() {
    this._failed = true;
    this.clean();
    return null;
  };

  StreamDecryptor.prototype.decryptChunk = function(encryptedChunk, isLast) {
    if (this._failed) return null;
    if (this._done) throw new Error('called decryptChunk after last chunk');
    var encryptedChunkLen = encryptedChunk.length;
    if (encryptedChunkLen < 4 + BOXZEROBYTES) return this._fail();
    var chunkLen = readChunkLength(encryptedChunk);
    if (chunkLen < 0 || chunkLen > this._maxChunkLength) return this._fail();
    if (chunkLen + 4 + BOXZEROBYTES !== encryptedChunkLen) return this._fail();
    for (var i = 0; i < BOXZEROBYTES; i++) this._in[i] = 0;
    for (i = 0; i < encryptedChunkLen-4; i++) this._in[BOXZEROBYTES+i] = encryptedChunk[i+4];
    if (isLast) {
      setLastChunkFlag(this._fullNonce);
      this._done = true;
    }
    if (crypto_secretbox_open(this._out, this._in, encryptedChunkLen+BOXZEROBYTES-4,
                this._fullNonce, this._key) !== 0) return this._fail();
    incrementChunkCounter(this._fullNonce);
    return new Uint8Array(this._out.subarray(ZEROBYTES, ZEROBYTES + chunkLen));
  };

  StreamDecryptor.prototype.clean = function() {
    clean(this._fullNonce, this._in, this._out);
  };

  return {
    createEncryptor: function(k, n, c) { return new StreamEncryptor(k, n, c); },
    createDecryptor: function(k, n, c) { return new StreamDecryptor(k, n, c); },
    readChunkLength: readChunkLength
  };

}));

/*!
 * Fast "async" scrypt implementation in JavaScript.
 * Copyright (c) 2013-2015 Dmitry Chestnykh | BSD License
 * https://github.com/dchest/scrypt-async-js
 */

/*
 * Limitation: doesn't support parallelization parameter greater than 1.
 */

/**
 * scrypt(password, salt, logN, r, dkLen, [interruptStep], callback, [encoding])
 *
 * Derives a key from password and salt and calls callback
 * with derived key as the only argument.
 *
 * Calculations are interrupted with zero setTimeout at the given
 * interruptSteps to avoid freezing the browser. If interruptStep is not given,
 * it defaults to 1000. If it's zero, the callback is called immediately after
 * calculation, avoiding setTimeout.
 *
 * @param {string|Array.<number>} password Password.
 * @param {string|Array.<number>} salt Salt.
 * @param {number}  logN  CPU/memory cost parameter (1 to 31).
 * @param {number}  r     Block size parameter.
 * @param {number}  dkLen Length of derived key.
 * @param {number?} interruptStep (optional) Steps to split calculation with timeouts (default 1000).
 * @param {function(string|Array.<number>)} callback Callback function.
 * @param {string?} encoding (optional) Result encoding ("base64", "hex", or null).
 *
 */
function scrypt(password, salt, logN, r, dkLen, interruptStep, callback, encoding) {
  'use strict';

  function SHA256(m) {
    /** @const */ var K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
      0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
      0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
      0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
      0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
      0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
      0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
      0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
      0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
      0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
      0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
      h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19,
      w = new Array(64);

    function blocks(p) {
      var off = 0, len = p.length;
      while (len >= 64) {
        var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7,
          u, i, j, t1, t2;

        for (i = 0; i < 16; i++) {
          j = off + i*4;
          w[i] = ((p[j] & 0xff)<<24) | ((p[j+1] & 0xff)<<16) |
            ((p[j+2] & 0xff)<<8) | (p[j+3] & 0xff);
        }

        for (i = 16; i < 64; i++) {
          u = w[i-2];
          t1 = ((u>>>17) | (u<<(32-17))) ^ ((u>>>19) | (u<<(32-19))) ^ (u>>>10);

          u = w[i-15];
          t2 = ((u>>>7) | (u<<(32-7))) ^ ((u>>>18) | (u<<(32-18))) ^ (u>>>3);

          w[i] = (((t1 + w[i-7]) | 0) + ((t2 + w[i-16]) | 0)) | 0;
        }

        for (i = 0; i < 64; i++) {
          t1 = ((((((e>>>6) | (e<<(32-6))) ^ ((e>>>11) | (e<<(32-11))) ^
            ((e>>>25) | (e<<(32-25)))) + ((e & f) ^ (~e & g))) | 0) +
            ((h + ((K[i] + w[i]) | 0)) | 0)) | 0;

          t2 = ((((a>>>2) | (a<<(32-2))) ^ ((a>>>13) | (a<<(32-13))) ^
            ((a>>>22) | (a<<(32-22)))) + ((a & b) ^ (a & c) ^ (b & c))) | 0;

          h = g;
          g = f;
          f = e;
          e = (d + t1) | 0;
          d = c;
          c = b;
          b = a;
          a = (t1 + t2) | 0;
        }

        h0 = (h0 + a) | 0;
        h1 = (h1 + b) | 0;
        h2 = (h2 + c) | 0;
        h3 = (h3 + d) | 0;
        h4 = (h4 + e) | 0;
        h5 = (h5 + f) | 0;
        h6 = (h6 + g) | 0;
        h7 = (h7 + h) | 0;

        off += 64;
        len -= 64;
      }
    }

    blocks(m);

    var i, bytesLeft = m.length % 64,
      bitLenHi = (m.length / 0x20000000) | 0,
      bitLenLo = m.length << 3,
      numZeros = (bytesLeft < 56) ? 56 : 120,
      p = m.slice(m.length - bytesLeft, m.length);

    p.push(0x80);
    for (i = bytesLeft + 1; i < numZeros; i++) p.push(0);
    p.push((bitLenHi>>>24) & 0xff);
    p.push((bitLenHi>>>16) & 0xff);
    p.push((bitLenHi>>>8)  & 0xff);
    p.push((bitLenHi>>>0)  & 0xff);
    p.push((bitLenLo>>>24) & 0xff);
    p.push((bitLenLo>>>16) & 0xff);
    p.push((bitLenLo>>>8)  & 0xff);
    p.push((bitLenLo>>>0)  & 0xff);

    blocks(p);

    return [
      (h0>>>24) & 0xff, (h0>>>16) & 0xff, (h0>>>8) & 0xff, (h0>>>0) & 0xff,
      (h1>>>24) & 0xff, (h1>>>16) & 0xff, (h1>>>8) & 0xff, (h1>>>0) & 0xff,
      (h2>>>24) & 0xff, (h2>>>16) & 0xff, (h2>>>8) & 0xff, (h2>>>0) & 0xff,
      (h3>>>24) & 0xff, (h3>>>16) & 0xff, (h3>>>8) & 0xff, (h3>>>0) & 0xff,
      (h4>>>24) & 0xff, (h4>>>16) & 0xff, (h4>>>8) & 0xff, (h4>>>0) & 0xff,
      (h5>>>24) & 0xff, (h5>>>16) & 0xff, (h5>>>8) & 0xff, (h5>>>0) & 0xff,
      (h6>>>24) & 0xff, (h6>>>16) & 0xff, (h6>>>8) & 0xff, (h6>>>0) & 0xff,
      (h7>>>24) & 0xff, (h7>>>16) & 0xff, (h7>>>8) & 0xff, (h7>>>0) & 0xff
    ];
  }

  function PBKDF2_HMAC_SHA256_OneIter(password, salt, dkLen) {
    // compress password if it's longer than hash block length
    password = password.length <= 64 ? password : SHA256(password);

    var i, innerLen = 64 + salt.length + 4,
      inner = new Array(innerLen),
      outerKey = new Array(64),
      dk = [];

    // inner = (password ^ ipad) || salt || counter
    for (i = 0; i < 64; i++) inner[i] = 0x36;
    for (i = 0; i < password.length; i++) inner[i] ^= password[i];
    for (i = 0; i < salt.length; i++) inner[64+i] = salt[i];
    for (i = innerLen - 4; i < innerLen; i++) inner[i] = 0;

    // outerKey = password ^ opad
    for (i = 0; i < 64; i++) outerKey[i] = 0x5c;
    for (i = 0; i < password.length; i++) outerKey[i] ^= password[i];

    // increments counter inside inner
    function incrementCounter() {
      for (var i = innerLen-1; i >= innerLen-4; i--) {
        inner[i]++;
        if (inner[i] <= 0xff) return;
        inner[i] = 0;
      }
    }

    // output blocks = SHA256(outerKey || SHA256(inner)) ...
    while (dkLen >= 32) {
      incrementCounter();
      dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))));
      dkLen -= 32;
    }
    if (dkLen > 0) {
      incrementCounter();
      dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))).slice(0, dkLen));
    }
    return dk;
  }

  function salsaXOR(tmp, B, bin, bout) {
    var j0  = tmp[0]  ^ B[bin++],
      j1  = tmp[1]  ^ B[bin++],
      j2  = tmp[2]  ^ B[bin++],
      j3  = tmp[3]  ^ B[bin++],
      j4  = tmp[4]  ^ B[bin++],
      j5  = tmp[5]  ^ B[bin++],
      j6  = tmp[6]  ^ B[bin++],
      j7  = tmp[7]  ^ B[bin++],
      j8  = tmp[8]  ^ B[bin++],
      j9  = tmp[9]  ^ B[bin++],
      j10 = tmp[10] ^ B[bin++],
      j11 = tmp[11] ^ B[bin++],
      j12 = tmp[12] ^ B[bin++],
      j13 = tmp[13] ^ B[bin++],
      j14 = tmp[14] ^ B[bin++],
      j15 = tmp[15] ^ B[bin++],
      u, i;

    var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15;

    for (i = 0; i < 8; i += 2) {
      u =  x0 + x12;   x4 ^= u<<7  | u>>>(32-7);
      u =  x4 +  x0;   x8 ^= u<<9  | u>>>(32-9);
      u =  x8 +  x4;  x12 ^= u<<13 | u>>>(32-13);
      u = x12 +  x8;   x0 ^= u<<18 | u>>>(32-18);

      u =  x5 +  x1;   x9 ^= u<<7  | u>>>(32-7);
      u =  x9 +  x5;  x13 ^= u<<9  | u>>>(32-9);
      u = x13 +  x9;   x1 ^= u<<13 | u>>>(32-13);
      u =  x1 + x13;   x5 ^= u<<18 | u>>>(32-18);

      u = x10 +  x6;  x14 ^= u<<7  | u>>>(32-7);
      u = x14 + x10;   x2 ^= u<<9  | u>>>(32-9);
      u =  x2 + x14;   x6 ^= u<<13 | u>>>(32-13);
      u =  x6 +  x2;  x10 ^= u<<18 | u>>>(32-18);

      u = x15 + x11;   x3 ^= u<<7  | u>>>(32-7);
      u =  x3 + x15;   x7 ^= u<<9  | u>>>(32-9);
      u =  x7 +  x3;  x11 ^= u<<13 | u>>>(32-13);
      u = x11 +  x7;  x15 ^= u<<18 | u>>>(32-18);

      u =  x0 +  x3;   x1 ^= u<<7  | u>>>(32-7);
      u =  x1 +  x0;   x2 ^= u<<9  | u>>>(32-9);
      u =  x2 +  x1;   x3 ^= u<<13 | u>>>(32-13);
      u =  x3 +  x2;   x0 ^= u<<18 | u>>>(32-18);

      u =  x5 +  x4;   x6 ^= u<<7  | u>>>(32-7);
      u =  x6 +  x5;   x7 ^= u<<9  | u>>>(32-9);
      u =  x7 +  x6;   x4 ^= u<<13 | u>>>(32-13);
      u =  x4 +  x7;   x5 ^= u<<18 | u>>>(32-18);

      u = x10 +  x9;  x11 ^= u<<7  | u>>>(32-7);
      u = x11 + x10;   x8 ^= u<<9  | u>>>(32-9);
      u =  x8 + x11;   x9 ^= u<<13 | u>>>(32-13);
      u =  x9 +  x8;  x10 ^= u<<18 | u>>>(32-18);

      u = x15 + x14;  x12 ^= u<<7  | u>>>(32-7);
      u = x12 + x15;  x13 ^= u<<9  | u>>>(32-9);
      u = x13 + x12;  x14 ^= u<<13 | u>>>(32-13);
      u = x14 + x13;  x15 ^= u<<18 | u>>>(32-18);
    }

    B[bout++] = tmp[0]  = (x0  + j0)  | 0;
    B[bout++] = tmp[1]  = (x1  + j1)  | 0;
    B[bout++] = tmp[2]  = (x2  + j2)  | 0;
    B[bout++] = tmp[3]  = (x3  + j3)  | 0;
    B[bout++] = tmp[4]  = (x4  + j4)  | 0;
    B[bout++] = tmp[5]  = (x5  + j5)  | 0;
    B[bout++] = tmp[6]  = (x6  + j6)  | 0;
    B[bout++] = tmp[7]  = (x7  + j7)  | 0;
    B[bout++] = tmp[8]  = (x8  + j8)  | 0;
    B[bout++] = tmp[9]  = (x9  + j9)  | 0;
    B[bout++] = tmp[10] = (x10 + j10) | 0;
    B[bout++] = tmp[11] = (x11 + j11) | 0;
    B[bout++] = tmp[12] = (x12 + j12) | 0;
    B[bout++] = tmp[13] = (x13 + j13) | 0;
    B[bout++] = tmp[14] = (x14 + j14) | 0;
    B[bout++] = tmp[15] = (x15 + j15) | 0;
  }

  function blockCopy(dst, di, src, si, len) {
    while (len--) dst[di++] = src[si++];
  }

  function blockXOR(dst, di, src, si, len) {
    while (len--) dst[di++] ^= src[si++];
  }

  function blockMix(tmp, B, bin, bout, r) {
    blockCopy(tmp, 0, B, bin + (2*r-1)*16, 16);
    for (var i = 0; i < 2*r; i += 2) {
      salsaXOR(tmp, B, bin + i*16,      bout + i*8);
      salsaXOR(tmp, B, bin + i*16 + 16, bout + i*8 + r*16);
    }
  }

  function integerify(B, bi, r) {
    return B[bi+(2*r-1)*16];
  }

  function stringToUTF8Bytes(s) {
    var arr = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 128) {
        arr.push(c);
      } else if (c > 127 && c < 2048) {
        arr.push((c>>6) | 192);
        arr.push((c & 63) | 128);
      } else {
        arr.push((c>>12) | 224);
        arr.push(((c>>6) & 63) | 128);
        arr.push((c & 63) | 128);
      }
    }
    return arr;
  }

  function bytesToHex(p) {
    /** @const */
    var enc = '0123456789abcdef'.split('');

    var len = p.length,
      arr = [],
      i = 0;

    for (; i < len; i++) {
      arr.push(enc[(p[i]>>>4) & 15]);
      arr.push(enc[(p[i]>>>0) & 15]);
    }
    return arr.join('');
  }

  function bytesToBase64(p) {
    /** @const */
    var enc = ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
    '0123456789+/').split('');

    var len = p.length,
      arr = [],
      i = 0,
      a, b, c, t;

    while (i < len) {
      a = i < len ? p[i++] : 0;
      b = i < len ? p[i++] : 0;
      c = i < len ? p[i++] : 0;
      t = (a << 16) + (b << 8) + c;
      arr.push(enc[(t >>> 3 * 6) & 63]);
      arr.push(enc[(t >>> 2 * 6) & 63]);
      arr.push(enc[(t >>> 1 * 6) & 63]);
      arr.push(enc[(t >>> 0 * 6) & 63]);
    }
    if (len % 3 > 0) {
      arr[arr.length-1] = '=';
      if (len % 3 === 1) arr[arr.length-2] = '=';
    }
    return arr.join('');
  }


  // Generate key.

  // Set parallelization parameter to 1.
  var p = 1;

  if (logN < 1 || logN > 31)
    throw new Error('scrypt: logN not be between 1 and 31');

  var MAX_INT = (1<<31)>>>0,
    N = (1<<logN)>>>0,
    XY, V, B, tmp;

  if (r*p >= 1<<30 || r > MAX_INT/128/p || r > MAX_INT/256 || N > MAX_INT/128/r)
    throw new Error('scrypt: parameters are too large');

  // Decode strings.
  if (typeof password === 'string')
    password = stringToUTF8Bytes(password);
  if (typeof salt === 'string')
    salt = stringToUTF8Bytes(salt);

  if (typeof Int32Array !== 'undefined') {
    //XXX We can use Uint32Array, but Int32Array is faster in Safari.
    XY = new Int32Array(64*r);
    V = new Int32Array(32*N*r);
    tmp = new Int32Array(16);
  } else {
    XY = [];
    V = [];
    tmp = new Array(16);
  }
  B = PBKDF2_HMAC_SHA256_OneIter(password, salt, p*128*r);

  var xi = 0, yi = 32 * r;

  function smixStart() {
    for (var i = 0; i < 32*r; i++) {
      var j = i*4;
      XY[xi+i] = ((B[j+3] & 0xff)<<24) | ((B[j+2] & 0xff)<<16) |
        ((B[j+1] & 0xff)<<8)  | ((B[j+0] & 0xff)<<0);
    }
  }

  function smixStep1(start, end) {
    for (var i = start; i < end; i += 2) {
      blockCopy(V, i*(32*r), XY, xi, 32*r);
      blockMix(tmp, XY, xi, yi, r);

      blockCopy(V, (i+1)*(32*r), XY, yi, 32*r);
      blockMix(tmp, XY, yi, xi, r);
    }
  }

  function smixStep2(start, end) {
    for (var i = start; i < end; i += 2) {
      var j = integerify(XY, xi, r) & (N-1);
      blockXOR(XY, xi, V, j*(32*r), 32*r);
      blockMix(tmp, XY, xi, yi, r);

      j = integerify(XY, yi, r) & (N-1);
      blockXOR(XY, yi, V, j*(32*r), 32*r);
      blockMix(tmp, XY, yi, xi, r);
    }
  }

  function smixFinish() {
    for (var i = 0; i < 32*r; i++) {
      var j = XY[xi+i];
      B[i*4+0] = (j>>>0)  & 0xff;
      B[i*4+1] = (j>>>8)  & 0xff;
      B[i*4+2] = (j>>>16) & 0xff;
      B[i*4+3] = (j>>>24) & 0xff;
    }
  }

  function interruptedFor(start, end, step, fn, donefn) {
    (function performStep() {
      setTimeout(function() {
        fn(start, start + step < end ? start + step : end);
        start += step;
        if (start < end)
          performStep();
        else
          donefn();
      }, 0);
    })();
  }

  function getResult(enc) {
    var result = PBKDF2_HMAC_SHA256_OneIter(password, B, dkLen);
    if (enc === 'base64')
      return bytesToBase64(result);
    else if (enc === 'hex')
      return bytesToHex(result);
    else
      return result;
  }

  if (typeof interruptStep === 'function') {
    // Called as: scrypt(...,      callback, [encoding])
    //  shifting: scrypt(..., interruptStep,  callback, [encoding])
    encoding = callback;
    callback = interruptStep;
    interruptStep = 1000;
  }

  if (interruptStep <= 0) {
    //
    // Blocking async variant, calls callback.
    //
    smixStart();
    smixStep1(0, N);
    smixStep2(0, N);
    smixFinish();
    callback(getResult(encoding));

  } else {
    //
    // Async variant with interruptions, calls callback.
    //
    smixStart();
    interruptedFor(0, N, interruptStep*2, smixStep1, function() {
      interruptedFor(0, N, interruptStep*2, smixStep2, function () {
        smixFinish();
        callback(getResult(encoding));
      });
    });
  }
}

if (typeof module !== 'undefined') module.exports = scrypt;