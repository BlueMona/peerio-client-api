/**
 * Peerio crypto library.
 * ======================
 * Functions accessible via window.Peerio.Crypto object.
 * Depends on libraries:
 * - minilock.js
 * - nacl.js
 * - nacl_stream.js (via minilock)
 * - base58.js
 * - blake2s.js
 * - scrypt.js
 */

//
// todo: 1. probably replace "throw" with return values
// todo: 2. "contacts" dependency is not nice, is there a better way?
// todo: 3. maybe initialize crypto lib once instead of passing same user data ti most of the functions
// todo: 4. remove HTML5 File API usage

window.Peerio = window.Peerio || {};
Peerio.Crypto = {};

(function () {
  'use strict';

  // malicious server safe hasOwnProperty function; 
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);

  /**
   * Encrypts a plaintext using `nacl.secretbox` and returns the ciphertext and a random nonce.
   * @param {Uint8Array} plaintext
   * @param {Uint8Array} key
   * @return {object} ciphertext - Contains ciphertext and nonce in Uint8Array format.
   */
  Peerio.Crypto.secretBoxEncrypt = function (plaintext, key) {
    var nonce = nacl.randomBytes(24); //todo: magic number
    var ciphertext = nacl.secretbox(plaintext, nonce, key);
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
   * @return {Uint8Array} plaintext
   */
  Peerio.Crypto.secretBoxDecrypt = function (ciphertext, nonce, key) {
    return nacl.secretbox.open(ciphertext, nonce, key);
  };

  /**
   * Extracts a public key from a miniLock ID after verifying the ID.
   * @param {string} miniLockID
   * @return {Uint8Array} publicKey
   */
  Peerio.Crypto.getPublicKeyFromMiniLockID = function (miniLockID) {
    if (!miniLock.util.validateID(miniLockID))
      throw new Error('Peerio.util.getPublicKeyFromMiniLockID: Invalid ID.');

    return Base58.decode(miniLockID).subarray(0, 32);
  };

  /**
   * Derive actual encryption key from a PIN using scrypt and BLAKE2s.
   * Key is used to encrypt long-term passphrase locally.
   * @param {string} PIN
   * @param {string} username
   * @param {function} callback with object containing key (Uint8Array)
   */
  Peerio.Crypto.getKeyFromPIN = function (PIN, username, callback) {
    if (typeof(callback) !== 'function') throw new Error('Peerio.Crypto.getKeyFromPIN: provide callback function');

    var hash = new BLAKE2s(32); //todo: magic number
    hash.update(nacl.util.decodeUTF8(PIN));
    scrypt(
      hash.hexDigest(),
      nacl.util.decodeUTF8(username),
      14, 8, 32, 1000, //todo: magic numbers
      function (keyBytes) {
        callback(nacl.util.decodeBase64(keyBytes));
      },
      'base64'
    );
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
  Peerio.Crypto.decryptAccountCreationToken = function (data, username, keyPair) {
    if (!hasProp(data, 'username')
      || !hasProp(data, 'accountCreationToken')
      || !hasProp(data.accountCreationToken, 'token')
      || !hasProp(data.accountCreationToken, 'nonce')
      || !hasProp(data, 'ephemeralServerID')
    ) throw new Error('Peerio.Crypto.decryptAccountCreationToken: Invalid input.');

    if (data.username !== username)
      throw new Error('Peerio.Crypto.decryptAccountCreationToken: Usernames did not match.');

    var decryptedToken = nacl.box.open(
      nacl.util.decodeBase64(data.accountCreationToken.token),
      nacl.util.decodeBase64(data.accountCreationToken.nonce),
      Peerio.Crypto.getPublicKeyFromMiniLockID(data.ephemeralServerID),
      keyPair.secretKey
    );

    //todo: magic numbers
    if (decryptedToken && decryptedToken.length === 0x20 && decryptedToken[0] === 0x41
      && decryptedToken[1] === 0x43) return nacl.util.encodeBase64(decryptedToken);

    throw new Error('Peerio.Crypto.decryptAccountCreationToken: Decryption failed.');
  };

  /**
   * Decrypts a bunch of authTokens
   * @param {{ephemeralServerID:string,
   *          authTokens:[{token:string, nonce:string}]}} data - authToken data as received from server.
   * @param {object} keyPair
   * @returns {[object]} decrypted tokens
   */
  Peerio.Crypto.decryptAuthTokens = function (data, keyPair) {
    if (hasProp(data, 'error')) {
      //todo: throw error?
      console.error(data.error);
      return null;
    }
    var tokens = [];
    data.authTokens.forEach(function (token) {

      var decryptedToken = nacl.box.open(
        nacl.util.decodeBase64(token.token),
        nacl.util.decodeBase64(token.nonce),
        Peerio.Crypto.getPublicKeyFromMiniLockID(data.ephemeralServerID),
        keyPair.secretKey
      );
      //todo: magic numbers
      decryptedToken
      && decryptedToken.length === 0x20
      && decryptedToken[0] === 0x41
      && decryptedToken[1] === 0x54
      && tokens.push(nacl.util.encodeBase64(decryptedToken));

    });

    return tokens;
  };

  /**
   * Gets a user's avatar using their username and miniLock ID.
   * The avatar consists of two 256-bit BLAKE2 hashes spread across 4 identicons:
   * Identicon 1: First 128 bits of BLAKE2(username||miniLockID).
   * Identicon 2:  Last 128 bits of BLAKE2(username||miniLockID).
   * Identicon 3: First 128 bits of BLAKE2(miniLockID||username).
   * Identicon 4:  Last 128 bits of BLAKE2(miniLockID||username).
   * Note that the miniLock ID is hashed as its byte values, not as a string.
   * @param {string} username
   * @param {string} miniLockID
   * @return {Array} [hash1 (Hex string), hash2 (Hex string)]
   */
  Peerio.Crypto.getAvatar = function (username, miniLockID) {
    if (!username || !miniLockID) {
      return null;
    }
    var hash1 = new BLAKE2s(32);
    hash1.update(nacl.util.decodeUTF8(username));
    hash1.update(Base58.decode(miniLockID));
    var hash2 = new BLAKE2s(32);
    hash2.update(Base58.decode(miniLockID));
    hash2.update(nacl.util.decodeUTF8(username));
    return [hash1.hexDigest(), hash2.hexDigest()];
  };

  function processRecipients(recipients, username, miniLockIDs, contacts, failed) {
    recipients.forEach(function (recipient) {
      var contact = contacts[recipient];
      if (hasProp(contact, 'miniLockID') && miniLockIDs.indexOf(contact.miniLockID) < 0)
        miniLockIDs.push(contact.miniLockID);
      else if (recipient !== username)
        failed.push(recipient);
    });
  }

  /**
   * Encrypt a message to recipients, return header JSON and body.
   * @param {object} message - Plaintext message object.
   * @param {Array} recipients - Array of usernames of recipients.
   * @param {string} username
   * @param {string} miniLockID
   * @param {object} keyPair
   * @param {object} contacts - user's contacts map
   * @param {function} callback - With header, body parameters, and array of failed recipients.
   */
  Peerio.Crypto.encryptMessage = function (message, recipients, username, miniLockID, keyPair, contacts, callback) {
    var miniLockIDs = [miniLockID];
    var failed = [];

    processRecipients(recipients, username, miniLockIDs, contacts, failed);

    miniLock.crypto.encryptFile(
      new Blob([nacl.util.decodeUTF8(JSON.stringify(message))]),
      'message',
      miniLockIDs,
      miniLockID,
      keyPair.secretKey,
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
          var headerLength = miniLock.util.byteArrayToNumber(encryptedBuffer.subarray(8, 12));
          header = JSON.parse(header);
          var body = nacl.util.encodeBase64(
            encryptedBuffer.subarray(12 + headerLength)
          );
          callback(header, body, failed);
        };
        reader.readAsArrayBuffer(encryptedBlob);
      }
    );
  };

  /**
   * Encrypt a file to recipients, return UTF8 Blob and header (separate).
   * @param {object} file - File object to encrypt.
   * @param {Array} recipients - Array of usernames of recipients.
   * @param {string} username
   * @param {string} miniLockID
   * @param {object} keyPair
   * @param {object} contacts - user's contacts map
   * @param {function} fileNameCallback - Callback with encrypted fileName.
   * @param {function} callback - With header, body and failedRecipients parameters.
   */
  Peerio.Crypto.encryptFile = function (file, recipients, username, miniLockID, keyPair, contacts, fileNameCallback, callback) {
    var miniLockIDs = [miniLockID];
    var failed = [];
    processRecipients(recipients, username, miniLockIDs, contacts, failed);

    var blob = file.slice();
    blob.name = file.name;
    miniLock.crypto.encryptFile(
      blob,
      file.name,
      miniLockIDs,
      miniLockID,
      keyPair.secretKey,
      fileNameCallback,
      function (encryptedChunks, header) {
        if (encryptedChunks) {
          encryptedChunks.splice(0, 4);
          callback(JSON.parse(header), encryptedChunks, failed);
        } else
          callback(false);
      }
    );
  };

  /**
   * Decrypt a message.
   * @param {object} messageObject - As received from server.
   * @param {string} miniLockID
   * @param {object} keyPair
   * @param {object} contacts
   * @param {function} callback - with plaintext object.
   *
   */
  Peerio.Crypto.decryptMessage = function (messageObject, miniLockID, keyPair, contacts, callback) {
    var header = JSON.stringify(messageObject.header);

    var messageBlob = new Blob([
      'miniLock',
      miniLock.util.numberToByteArray(header.length),
      header,
      nacl.util.decodeBase64(messageObject.body)
    ]);

    miniLock.crypto.decryptFile(messageBlob, miniLockID, keyPair.secretKey,
      function (decryptedBlob, saveName, senderID) {
        if (!decryptedBlob) {
          callback(false);
          return false;
        }

        if (hasProp(contacts, messageObject.sender) && contacts[messageObject.sender].miniLockID !== senderID) {
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
   * @param {string} miniLockID
   * @param {object} keyPair
   * @param {object} contacts
   * @param {function} callback - with plaintext blob
   */
  Peerio.Crypto.decryptFile = function (id, blob, header, file, miniLockID, keyPair, contacts, callback) {
    var headerString = JSON.stringify(header);
    var headerStringLength = nacl.util.decodeUTF8(headerString).length;
    var miniLockBlob = new Blob([
      'miniLock',
      miniLock.util.numberToByteArray(headerStringLength),
      headerString,
      miniLock.util.numberToByteArray(256),
      nacl.util.decodeBase64(id),
      blob
    ]);

    miniLock.crypto.decryptFile(miniLockBlob, miniLockID, keyPair.secretKey,
      function (decryptedBlob, saveName, senderID) {
        if (!decryptedBlob) {
          callback(false);
          return false;
        }

        var claimedSender = hasProp(file, 'sender') ? file.sender : file.creator;
        // this looks strange that we call success callback when sender is not in contacts
        // but it can be the case and we skip public key (miniLockID) verification,
        // because we don't have sender's public key
        if (hasProp(contacts, claimedSender) && contacts[claimedSender].miniLockID !== senderID)
          callback(false);
        else
          callback(decryptedBlob);
      }
    );
  };

  /**
   * Decrypt a filename from a file's ID given by the Peerio server.
   * @param {string} id - File ID (Base64)
   * @param {object} header - miniLock header for file
   * @param {string} miniLockID
   * @param {object} keyPair
   * @return {string} fileName
   */
  Peerio.Crypto.decryptFileName = function (id, header, miniLockID, keyPair) {
    var fileInfo = miniLock.crypto.decryptHeader(
      header, keyPair.secretKey, miniLockID).fileInfo;

    fileInfo.fileNonce = nacl.util.decodeBase64(fileInfo.fileNonce);
    fileInfo.fileKey = nacl.util.decodeBase64(fileInfo.fileKey);

    var nonce = new Uint8Array(24);
    nonce.set(fileInfo.fileNonce);

    var decrypted = nacl.secretbox.open(nacl.util.decodeBase64(id), nonce, fileInfo.fileKey);
    decrypted = nacl.util.encodeUTF8(decrypted);

    while (decrypted[decrypted.length - 1] === '\0')
      decrypted = decrypted.slice(0, -1);

    return decrypted;
  };
})();