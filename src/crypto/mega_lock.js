(function () {
  'use strict';
  window.Peerio = window.Peerio || {};
  var ML = window.miniLock = window.Peerio.MegaLock = {};

  var base58Match = new RegExp('^[1-9ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$');
  var base64Match = new RegExp('^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$');

  ML.settings = {};

  // Minimum entropy for user key
  ML.settings.minKeyEntropy = 100;

  // This is where session variables are stored
  ML.session = {
    keys: {},
    keyPairReady: false
  };

  ML.util = {};

  /**
   * Validates MegaLockID
   * @param {string} id
   * @returns {boolean} - true for valid MegaLockID
   */
  ML.util.validateID = function (id) {
    if (id.length > 55 || id.length < 40)
      return false;

    if (!base58Match.test(id))
      return false;

    var bytes = Base58.decode(id);
    if (bytes.length !== 33)
      return false;

    var hash = new BLAKE2s(1);
    hash.update(bytes.subarray(0, 32));
    if (hash.digest()[0] !== bytes[32])
      return false;

    return true;
  };

  /**
   * Validates nonce
   * @param {string} nonce - Base64 encoded nonce
   * @param {Number} expectedLength - expected nonce bytes length
   * @returns {boolean}
   */
  ML.util.validateNonce = function (nonce, expectedLength) {
    if (nonce.length > 40 || nonce.length < 10)
      return false;

    if (base64Match.test(nonce))
      return nacl.util.decodeBase64(nonce).length === expectedLength;

    return false;
  };

  /**
   * Validates symmetric key.
   * @param {string} key - Base64 encoded key
   * @returns {boolean} - true for valid key
   */
  ML.util.validateKey = function (key) {
    if (key.length > 50 || key.length < 40)
      return false;

    if (base64Match.test(key))
      return nacl.util.decodeBase64(key).length === 32;

    return false;
  };

  /**
   * Converts 4-byte little-endian byte array to number
   * @param {Uint8Array} byteArray
   * @returns {Number}
   */
  ML.util.byteArrayToNumber = function (byteArray) {
    var n = 0;
    for (var i = 3; i >= 0; i--) {
      n += byteArray[i];
      if (i > 0) {
        n = n << 8;
      }
    }
    return n;
  };

  /**
   * Converts number to 4-byte little-endian byte array
   * @param {Number} n
   * @returns {Uint8Array}
   */
  ML.util.numberToByteArray = function (n) {
    var byteArray = new Uint8Array(4);
    for (var i = 0; i < byteArray.length; i++) {
      byteArray[i] = n & 255;
      n = n >> 8;
    }
    return byteArray;
  };

  ML.crypto = {};

  ML.crypto.chunkSize = 1024 * 1024;

  /**
   * Generates 32 bytes of key material in a Uint8Array with scrypt,
   * @param {Uint8Array} key
   * @param {Uint8Array} salt
   * @param {Function} callback
   */
  ML.crypto.getScryptKey = function (key, salt, callback) {
    scrypt(key, salt, 14, 8, 32, 1000, function (keyBytes) {
      return callback(nacl.util.decodeBase64(keyBytes));
    }, 'base64');
  };

  /**
   * Generates keypair
   * { publicKey: Public encryption key (Uint8Array),
   *	 secretKey: Secret encryption key (Uint8Array) }
   * @param {string} key
   * @param {string} salt
   * @param callback
   */
  ML.crypto.getKeyPair = function (key, salt, callback) {
    var keyHash = new BLAKE2s(32);
    keyHash.update(nacl.util.decodeUTF8(key));
    salt = nacl.util.decodeUTF8(salt);

    ML.crypto.getScryptKey(keyHash.digest(), salt, function (keyBytes) {
      callback(nacl.box.keyPair.fromSecretKey(keyBytes));
    });
  };

  ML.crypto.getNonce = function () {
    return nacl.randomBytes(24);
  };

  ML.crypto.getFileKey = function () {
    return nacl.randomBytes(32);
  };

  /**
   * Generates Mega Lock ID
   * @param {Uint8Array} publicKey
   * @returns {string} Base58 encoded id
   */
  ML.crypto.getMiniLockID = function (publicKey) {
    if (publicKey.length !== 32) {
      throw new Error('ML.crypto.getMLID: invalid public key size');
    }
    var id = new Uint8Array(33);
    for (var i = 0; i < publicKey.length; i++)
      id[i] = publicKey[i];

    var hash = new BLAKE2s(1);
    hash.update(publicKey);
    id[32] = hash.digest()[0];
    return Base58.encode(id);
  };

// Input: Object:
//	{
//		name: File name,
//		size: File size,
//		data: File (ArrayBuffer),
//	}
// saveName: Name to use when saving resulting file. '.ML' extension will be added.
// MLIDs: Array of (Base58) public IDs to encrypt for
// myMLID: Sender's ML ID (String)
// mySecretKey: My secret key (Uint8Array)
// fileNameCallback: A callback with the encrypted fileName.
// callback: Name of the callback function to which encrypted result is passed.
// Result: Sends file to be encrypted, with the result picked up
//	 and sent to the specified callback.
  ML.crypto.encryptFile = function (file, saveName, MLIDs, myMLID, mySecretKey, fileNameCallback, callback) {
    saveName += '.ML';
    var fileKey = ML.crypto.getFileKey();
    var fileNonce = ML.crypto.getNonce().subarray(0, 16);
    var streamEncryptor = nacl.stream.createEncryptor(
      fileKey,
      fileNonce,
      ML.crypto.chunkSize
    );

    var paddedFileName = new Uint8Array(256);
    var fileNameBytes = nacl.util.decodeUTF8(file.name);
    if (fileNameBytes.length > paddedFileName.length) {
      //file name is too long
      callback(false);
      return false;
    }
    paddedFileName.set(fileNameBytes);

    var hashObject = new BLAKE2s(32);
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

    ML.crypto.encryptNextChunk(file, streamEncryptor, hashObject, encryptedChunks, 0,
      saveName, fileKey, fileNonce, MLIDs, myMLID, mySecretKey, callback);

  };

//	Input:
//		Entire file object,
//	    Stream encryptor object,
//      Hash object,
//      Encrypted chunks,
//		data position on which to start decryption (number),
//		Name to use when saving the file (String),
//		fileKey (Uint8Array),
//		fileNonce (Uint8Array),
//		ML IDs for which to encrypt (Array),
//		sender ID (Base58 string),
//		sender long-term secret key (Uint8Array)
//		Callback to execute when last chunk has been decrypted.
//	Result: Will recursively encrypt until the last chunk,
//		at which point callbackOnComplete() is called.
//		Callback is passed these parameters:
//			file: Decrypted file object (Array of Uint8ArrayChunks),
//			saveName: File name for saving the file (String),
//			senderID: Sender's ML ID (Base58 string)
  ML.crypto.encryptNextChunk = function (file, streamEncryptor, hashObject, encryptedChunks, dataPosition,
                                         saveName, fileKey, fileNonce, MLIDs, myMLID, mySecretKey, callbackOnComplete) {
    ML.file.read(
      file,
      dataPosition,
      dataPosition + ML.crypto.chunkSize,
      function (chunk) {
        chunk = chunk.data;
        var isLast = dataPosition >= (file.size - ML.crypto.chunkSize);

        var encryptedChunk = streamEncryptor.encryptChunk(chunk, isLast);
        if (!encryptedChunk) {
          callbackOnComplete(false);
          return false;
        }

        hashObject.update(encryptedChunk);
        encryptedChunks.push(encryptedChunk);

        if (isLast) {
          streamEncryptor.clean();
          var header = ML.crypto.createHeader(MLIDs, myMLID, mySecretKey, fileKey, fileNonce, hashObject.digest());
          header = JSON.stringify(header);
          // todo changing the string here requires change in the code that depends on that string length when reading blob
          encryptedChunks.unshift('miniLock', ML.util.numberToByteArray(header.length), header);

          return callbackOnComplete(encryptedChunks, header, saveName, myMLID);
        }

        dataPosition += ML.crypto.chunkSize;
        return ML.crypto.encryptNextChunk(file, streamEncryptor, hashObject, encryptedChunks, dataPosition,
          saveName, fileKey, fileNonce, MLIDs, myMLID, mySecretKey, callbackOnComplete);

      }
    );
  };

// Input:
//		ML IDs (Array),
//		Sender's ML ID (String),
//		Sender's secret key (Uint8Array),
//		fileKey (Uint8Array),
//		fileNonce (Uint8Array),
//		fileHash (Uint8Array)
// Result: Returns a header ready for use by a ML file.
  ML.crypto.createHeader = function (MLIDs, myMLID, mySecretKey, fileKey, fileNonce, fileHash) {
    var ephemeral = nacl.box.keyPair();

    var header = {
      version: 1,
      ephemeral: nacl.util.encodeBase64(ephemeral.publicKey),
      decryptInfo: {}
    };

    var decryptInfoNonces = [];
    for (var u = 0; u < MLIDs.length; u++) {
      decryptInfoNonces.push(ML.crypto.getNonce());
    }

    for (var i = 0; i < MLIDs.length; i++) {
      var decryptInfo = {
        senderID: myMLID,
        recipientID: MLIDs[i],
        fileInfo: {
          fileKey: nacl.util.encodeBase64(fileKey),
          fileNonce: nacl.util.encodeBase64(fileNonce),
          fileHash: nacl.util.encodeBase64(fileHash)
        }
      };

      decryptInfo.fileInfo = nacl.util.encodeBase64(nacl.box(
        nacl.util.decodeUTF8(JSON.stringify(decryptInfo.fileInfo)),
        decryptInfoNonces[i],
        Base58.decode(MLIDs[i]).subarray(0, 32),
        mySecretKey
      ));

      decryptInfo = nacl.util.encodeBase64(nacl.box(
        nacl.util.decodeUTF8(JSON.stringify(decryptInfo)),
        decryptInfoNonces[i],
        Base58.decode(MLIDs[i]).subarray(0, 32),
        ephemeral.secretKey
      ));

      header.decryptInfo[nacl.util.encodeBase64(decryptInfoNonces[i])] = decryptInfo;
    }
    return header;
  };

// Input: ML header (JSON Object)
// Result: Returns decrypted decryptInfo object containing decrypted fileInfo object.
  ML.crypto.decryptHeader = function (header, mySecretKey, myMLID) {
    if (!header.hasOwnProperty('version') || header.version !== 1)
      return false;

    if (!header.hasOwnProperty('ephemeral') || !ML.util.validateKey(header.ephemeral))
      return false;

    // Attempt decryptInfo decryptions until one succeeds
    var actualDecryptInfo = null;
    var actualDecryptInfoNonce = null;
    var actualFileInfo = null;
    for (var i in header.decryptInfo) {
      if (({}).hasOwnProperty.call(header.decryptInfo, i) && ML.util.validateNonce(i, 24)) {
        actualDecryptInfo = nacl.box.open(
          nacl.util.decodeBase64(header.decryptInfo[i]),
          nacl.util.decodeBase64(i),
          nacl.util.decodeBase64(header.ephemeral),
          mySecretKey
        );

        if (actualDecryptInfo) {
          actualDecryptInfo = JSON.parse(nacl.util.encodeUTF8(actualDecryptInfo));
          actualDecryptInfoNonce = nacl.util.decodeBase64(i);
          break;
        }
      }
    }

    if (!actualDecryptInfo || !({}).hasOwnProperty.call(actualDecryptInfo, 'recipientID')
      || actualDecryptInfo.recipientID !== myMLID)
      return false;

    if (!({}).hasOwnProperty.call(actualDecryptInfo, 'fileInfo') || !({}).hasOwnProperty.call(actualDecryptInfo, 'senderID')
      || !ML.util.validateID(actualDecryptInfo.senderID))
      return false;

    try {
      actualFileInfo = nacl.box.open(
        nacl.util.decodeBase64(actualDecryptInfo.fileInfo),
        actualDecryptInfoNonce,
        Base58.decode(actualDecryptInfo.senderID).subarray(0, 32),
        mySecretKey
      );
      actualFileInfo = JSON.parse(nacl.util.encodeUTF8(actualFileInfo));
    }
    catch (err) {
      return false;
    }
    actualDecryptInfo.fileInfo = actualFileInfo;
    return actualDecryptInfo;

  };
// Input: Object:
//	{
//		name: File name,
//		size: File size,
//		data: Encrypted file (ArrayBuffer),
//	}
// myMLID: Sender's ML ID (String)
// mySecretKey: Sender's secret key (Uint8Array)
// callback: Name of the callback function to which decrypted result is passed.
// Result: Sends file to be decrypted, with the result picked up
//	and sent to the specified callback.
  ML.crypto.decryptFile = function (file, myMLID, mySecretKey, callback) {
    ML.file.read(file, 8, 12, function (headerLength) {
      headerLength = ML.util.byteArrayToNumber(headerLength.data);

      ML.file.read(file, 12, headerLength + 12, function (header) {
        try {
          header = nacl.util.encodeUTF8(header.data);
          header = JSON.parse(header);
        }
        catch (error) {
          callback(false);
          return false;
        }
        var actualDecryptInfo = ML.crypto.decryptHeader(header, mySecretKey, myMLID);
        if (!actualDecryptInfo) {
          callback(false, file.name, false);
          return false;
        }

        // Begin actual ciphertext decryption
        var dataPosition = 12 + headerLength;
        var streamDecryptor = nacl.stream.createDecryptor(
          nacl.util.decodeBase64(actualDecryptInfo.fileInfo.fileKey),
          nacl.util.decodeBase64(actualDecryptInfo.fileInfo.fileNonce),
          ML.crypto.chunkSize
        );
        var hashObject = new BLAKE2s(32);
        ML.crypto.decryptNextChunk(file, streamDecryptor, hashObject, [], dataPosition,
          actualDecryptInfo.fileInfo, actualDecryptInfo.senderID, headerLength, callback);
      });
    });
  };

//	Input:
//		Entire file object,
//	    Stream decryptor,
//      Hash object,
//      Decrypted chunks,
//		data position on which to start decryption (number),
//		fileInfo object (From header),
//		sender ID (Base58 string),
//		header length (in bytes) (number),
//		Callback to execute when last chunk has been decrypted.
//	Result: Will recursively decrypt until the last chunk,
//		at which point callbackOnComplete() is called.
//		Callback is passed these parameters:
//			file: Decrypted file object (blob),
//			saveName: File name for saving the file (String),
//			senderID: Sender's ML ID (Base58 string)
  ML.crypto.decryptNextChunk = function (file, streamDecryptor, hashObject, decryptedChunks, dataPosition,
                                         fileInfo, senderID, headerLength, callbackOnComplete) {
    ML.file.read(
      file,
      dataPosition,
      dataPosition + 4 + 16 + ML.crypto.chunkSize,
      function (chunk) {
        var fileName = '';
        chunk = chunk.data;
        var actualChunkLength = ML.util.byteArrayToNumber(chunk.subarray(0, 4));

        if (actualChunkLength > chunk.length) {
          callbackOnComplete(false);
          return false;
        }

        chunk = chunk.subarray(0, actualChunkLength + 4 + 16);

        var decryptedChunk;
        var isLast = dataPosition >= ((file.size) - (4 + 16 + actualChunkLength));

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

          hashObject.update(chunk.subarray(0, 256 + 4 + 16));
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
            //throw new Error('ML: Decryption failed - could not validate file contents after decryption')
            callbackOnComplete(false);
            return false;
          } else {
            streamDecryptor.clean();
            return callbackOnComplete(new Blob(decryptedChunks), fileName, senderID);
          }
        }
        else {
          return ML.crypto.decryptNextChunk(file, streamDecryptor, hashObject, decryptedChunks, dataPosition,
            fileInfo, senderID, headerLength, callbackOnComplete);
        }
      }
    );
  };

// -----------------------
// File Processing
// -----------------------

  ML.file = {};

// Input: File object, bounds within which to read, and callbacks
// Output: Callback function executed with object:
//	{
//		name: File name,
//		size: File size (bytes),
//		data: File data within specified bounds (Uint8Array)
//	}
// Error callback which is called in case of error (no parameters)
  ML.file.read = function (file, start, end, callback, errorCallback) {
    var reader = new FileReader();

    reader.onload = function (readerEvent) {
      return callback({
        name: file.name,
        size: file.size,
        data: new Uint8Array(readerEvent.target.result)
      });
    };

    reader.onerror = function () {
      if (typeof(errorCallback) === 'function')
        return errorCallback();

      throw new Error('ML: File read error');
    };

    reader.readAsArrayBuffer(file.slice(start, end));
  };

})();