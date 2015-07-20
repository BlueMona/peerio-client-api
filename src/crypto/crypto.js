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
 *
 * All public functions return promises for consistency
 */

// todo: 1. probably replace "throw" with return values
// todo: 2. "contacts" dependency is not nice, is there a better way?
// todo: 3. using blobs forces us to use html5 file api, don't think it's optimal, see if can be changed
// todo: 4. encrypt/decrypt functions reduce nesting and promisify further


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
   * @promise {string} Base58 encoded key
   */
  api.getPublicKeyString = function (publicKeyBytes) {
    var key = new Uint8Array(keySize + 1);
    for (var i = 0; i < publicKeyBytes.length; i++)
      key[i] = publicKeyBytes[i];

    var hash = new BLAKE2s(1);
    hash.update(publicKeyBytes);
    key[keySize] = hash.digest()[0];

    return Promise.resolve(Base58.encode(key));
  };

  /**
   * Extracts byte array from public key string representation
   * @param {string} publicKey
   * @promise {Uint8Array} publicKeyBytes
   */
  api.getPublicKeyBytes = function (publicKey) {
    return Promise.resolve(
      Base58.decode(publicKey).subarray(0, keySize)
    );
  };

  /**
   * Encrypts a plaintext using `nacl.secretbox` and returns the ciphertext and a random nonce.
   * @param {string} plaintext
   * @param {Uint8Array} key
   * @promise {object} ciphertext - Contains ciphertext and nonce in Uint8Array format.
   */
  api.secretBoxEncrypt = function (plaintext, key) {
    var nonce = nacl.randomBytes(decryptInfoNonceSize);
    var ciphertext = nacl.secretbox(nacl.util.decodeUTF8(plaintext), nonce, key);
    return Promise.resolve({
      ciphertext: ciphertext,
      nonce: nonce
    });
  };

  /**
   * Decrypts a ciphertext using `nacl.secretbox` and returns the plaintext.
   * @param {Uint8Array} ciphertext
   * @param {Uint8Array} nonce
   * @param {Uint8Array} key
   * @promise {string} plaintext
   */
  api.secretBoxDecrypt = function (ciphertext, nonce, key) {
    return Promise.resolve(
      nacl.util.encodeUTF8(nacl.secretbox.open(ciphertext, nonce, key))
    );
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
   * @promise {string} decryptedToken
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

    return api.getPublicKeyBytes(data.ephemeralServerID)
      .then(function (serverKey) {
        var token = nacl.box.open(
          nacl.util.decodeBase64(data.accountCreationToken.token),
          nacl.util.decodeBase64(data.accountCreationToken.nonce),
          serverKey,
          keyPair.secretKey
        );

        //todo: explain magic numbers
        if (token && token.length === 0x20 && token[0] === 0x41 && token[1] === 0x43)
          return Promise.resolve(nacl.util.encodeBase64(token));

        console.log('Decryption of account creation token failed.');
        return Promise.reject();
      });
  };

  /**
   * Decrypts authToken
   * @param {{ephemeralServerID:string, token:string, nonce:string}} data - authToken data as received from server.
   * @param {object} keyPair
   * @promise {object} decrypted token
   */
  api.decryptAuthToken = function (data, keyPair) {
    if (hasProp(data, 'error')) {
      console.error(data.error);
      return Promise.reject(data.error);
    }

    return api.getPublicKeyBytes(data.ephemeralServerID)
      .then(function(serverKey){
        var dToken = nacl.box.open(
          nacl.util.decodeBase64(data.token),
          nacl.util.decodeBase64(data.nonce),
          serverKey,
          keyPair.secretKey
        );
        //todo: explain magic numbers
        if (dToken && dToken.length === 0x20 && dToken[0] === 0x41 && dToken[1] === 0x54)
          return Promise.resolve(nacl.util.encodeBase64(dToken));

        return Promise.reject();
      });
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
   * @promise {Array|Boolean} [hash1 (Hex string), hash2 (Hex string)]
   */
  api.getAvatar = function (username, publicKey) {
    if (!username || !publicKey) {
      return Promise.reject();
    }

    var hash1 = new BLAKE2s(keySize);
    hash1.update(nacl.util.decodeUTF8(username));
    hash1.update(Base58.decode(publicKey));

    var hash2 = new BLAKE2s(keySize);
    hash2.update(Base58.decode(publicKey));
    hash2.update(nacl.util.decodeUTF8(username));

    return Promise.resolve([hash1.hexDigest(), hash2.hexDigest()]);
  };

  /**
   * Encrypt a message to recipients, return header JSON and body.
   * @param {object} message - message object.
   * @param {string[]} recipients - Array of usernames of recipients.
   * @param {User} sender
   * @promise {object}  With header, body parameters, and array of failed recipients.
   */
  api.encryptMessage = function (message, recipients, sender) {
    return new Promise(function (resolve, reject) {

      var validatedRecipients = validateRecipients(recipients, sender);

      encryptBlob(
        new Blob([nacl.util.decodeUTF8(JSON.stringify(message))]),
        validatedRecipients.publicKeys,
        sender,
        function (encryptedChunks, header) {
          if (!encryptedChunks) {
            reject();
            return;
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
            resolve({header: header, body: body, failed: validatedRecipients.failed});
          };
          reader.readAsArrayBuffer(encryptedBlob);
        }
      );
    });
  };

  /**
   * Encrypt a file to recipients, return UTF8 Blob and header (separate).
   * @param {object} file - File object to encrypt.
   * @param {string[]} recipients - Array of usernames of recipients.
   * @param {User} sender
   * @promise {object} fileName(base64 encoded), header, body and failedRecipients parameters.
   */
  api.encryptFile = function (file, recipients, sender) {
    return new Promise(function (resolve, reject) {
      var validatedRecipients = validateRecipients(recipients, sender);

      var blob = file.slice();
      blob.name = file.name;
      encryptBlob(
        blob,
        validatedRecipients.publicKeys,
        sender,
        function (encryptedChunks, header, fileName) {
          if (!encryptedChunks) {
            reject();
            return;
          }
          encryptedChunks.splice(0, numberSize);
          resolve({fileName: nacl.util.encodeBase64(fileName.subarray(4)), header: JSON.parse(header), chunks: encryptedChunks, failed: validatedRecipients.failed});
        }
      );
    });
  };

  /**
   * Decrypt a message.
   * @param {object} messageObject - As received from server.
   * @param {User} user - decrypting user
   * @promise {object} plaintext object.
   */
  api.decryptMessage = function (messageObject, user) {
    return new Promise(function (resolve, reject) {

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
            reject();
            return;
          }
          // validating sender public key
          if (hasProp(user.contacts, messageObject.sender)
            && user.contacts[messageObject.sender].publicKey !== senderID) {
            reject();
            return;
          }

          var decryptedBuffer;
          var reader = new FileReader();
          reader.onload = function (readerEvent) {
            decryptedBuffer = nacl.util.encodeUTF8(
              new Uint8Array(readerEvent.target.result)
            );

            var message = JSON.parse(decryptedBuffer);

            resolve(message);
          };

          reader.readAsArrayBuffer(decryptedBlob);
        }
      );
    });
  };

  /**
   * Decrypt a file.
   * @param {string} id - File ID in base64
   * @param {object} blob - File ciphertext as blob
   * @param {object} header
   * @param {object} file
   * @param {User} user - decrypting user
   * @promise {object} plaintext blob
   */
  api.decryptFile = function (id, blob, header, file, user) {
    return new Promise(function (resolve, reject) {

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
            reject();
            return;
          }

          var claimedSender = hasProp(file, 'sender') ? file.sender : file.creator;
          // this looks strange that we call success callback when sender is not in contacts
          // but it can be the case and we skip public key verification,
          // because we don't have sender's public key
          if (hasProp(user.contacts, claimedSender) && user.contacts[claimedSender].publicKey !== senderID)
            reject();
          else
            resolve(decryptedBlob);
        }
      );
    });
  };

  /**
   * Decrypt a filename from a file's ID given by the Peerio server.
   * @param {string} id - File ID (Base64)
   * @param {object} header - encryption header for file
   * @param {User} user
   * @promise {string} file name
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

    return Promise.resolve(decrypted);
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
  function encryptBlob(blob, publicKeys, user, callback) {
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

    var fileName = encryptedChunk;

    var encryptedChunks = [encryptedChunk];
    hashObject.update(encryptedChunk);

    encryptNextChunk({ fileName: fileName,
      blob: blob, streamEncryptor: streamEncryptor, hashObject: hashObject,
      encryptedChunks: encryptedChunks, dataPosition: 0, fileKey: blobKey, fileNonce: blobNonce,
      publicKeys: publicKeys, user: user, callbackOnComplete: callback
    });
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
   * @param {Function} e.callbackOnComplete {file, header, fileName, senderID}
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

          return e.callbackOnComplete(e.encryptedChunks, header, e.fileName, e.user.publicKey );
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