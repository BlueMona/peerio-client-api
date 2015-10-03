/**
 * Peerio App Logic: files
 */

var Peerio = this.Peerio || {};
Peerio.Files = {};

Peerio.Files.init = function () {
  'use strict';

  var api = Peerio.Files;
  delete Peerio.Files.init;
  var net = Peerio.Net;

  // Array, but contains same objects accessible both by index and by id
  api.cache = null;
  // uploads in progress
  api.uploads = [];

  api.DL_STATE = {DOWNLOADING: 0, DECRYPTING: 1, SAVING: 2};
  var DLStateNames = {0: 'Downloading', 1: 'Decrypting', 2: 'Saving'};

  api.UL_STATE = {READING: 0, ENCRYPTING: 1, UPLOADING_META: 2, UPLOADING_CHUNKS: 3};
  var ULStateNames = {0: 'Reading', 1: 'Encrypting', 2: 'Uploading metadata', 3: 'Uploading chunks'};

  var getAllFilesPromise = null;

  /**
   * Loads file list.
   * Resolves once everything is loaded and decrypted.
   * @promise
   */
  api.getAllFiles = function () {
    if (getAllFilesPromise) return getAllFilesPromise;

    if (api.cache)
      return Promise.resolve(api.cache);

    var decrypted = [];
    api.cache = [];
    return getAllFilesPromise = net.getFiles()
      .then(function (response) {
        var files = response.files;
        var keys = Object.keys(files);

        return Promise.map(keys, function (fileId) {
          var file = files[fileId];
          return Peerio.Crypto.decryptFileName(fileId, file.header)
            .then(function (name) {
              file.name = name;
              file.shortId = Peerio.Util.sha256(fileId);
              decrypted.push(file);
              decrypted[file.shortId] = file;
            });
        }, Peerio.Crypto.recommendedConcurrency)
          .return(decrypted);
      })
      .then(addFilesToCache)
      .then(function () {
        return Peerio.FileSystem.getCachedFileNames()
          .catch(function (err) {
            alert('Failed to read cached files folder. ' + err);
          });
      })
      .then(function (cachedNames) {
        console.log('cached names', cachedNames);
        if (!cachedNames) return;
        cachedNames.forEach(function (name) {
          var file = api.cache[Peerio.Util.getFileName(name)];
          if (!file) return; // todo: remove file?
          file.cached = true;
          console.log('Found cached: ', file, name);
        });
      })
      .then(function () {
        Peerio.Action.filesUpdated();
        return api.cache;
      });
  };
  api.deleteFromCache = function (shortId) {
    var file = api.cache[shortId];
    if (!file) return;
    Peerio.FileSystem.removeCachedFile(file);
    file.cached = false;
    Peerio.Action.filesUpdated();
  };

  api.delete = function (shortId) {
    var file = api.cache[shortId];
    if (!file) return;
    Peerio.FileSystem.removeCachedFile(file);
    net.removeFile(file.id);
  };

  api.nuke = function (shortId) {
    var file = api.cache[shortId];
    if (!file) return;
    Peerio.FileSystem.removeCachedFile(file);
    net.nukeFile(file.id);
  };

  api.download = function (file) {

    setDownloadState(file, api.DL_STATE.DOWNLOADING);

    // getting url
    return net.downloadFile(file.id)
      .then(function (data) {
        return data && data.url || Promise.reject('Failed to get file url.');
      })
      // downloading blob
      .then(function (url) {
        return download(file, url);
      })
      // decrypting blob
      .then(function (blob) {
        setDownloadState(file, api.DL_STATE.DECRYPTING);
        return Peerio.Crypto.decryptFile(file.id, blob, file);
      })
      // saving blob
      .then(function (decrypted) {
        setDownloadState(file, api.DL_STATE.SAVING);
        return Peerio.FileSystem.cacheCloudFile(file, decrypted);
      })
      .then(function () {
        file.cached = true;
        setDownloadState(file, null);
      })
      .catch(function (reason) {
        setDownloadState(file, null);
        alert('failed to download file. ' + reason);
      });
  };

  api.upload = function (fileUrl) {
    var encrypted;
    // temporary file id for current upload, helps identifying chunks
    var clientFileID = Base58.encode(nacl.randomBytes(32));
    addUploadState(clientFileID, fileUrl);

    return Peerio.FileSystem.plugin.getByURL(fileUrl)
      .then(Peerio.FileSystem.plugin.readFile)
      .then(function (file) {
        changeUploadState(clientFileID, api.UL_STATE.ENCRYPTING);
        return Peerio.Crypto.encryptFile(file.data, file.file.name);
      })
      .then(function (data) {
        changeUploadState(clientFileID, api.UL_STATE.UPLOADING_META);
        // todo: failed recipients
        encrypted = data;
        return net.uploadFile({
          ciphertext: encrypted.chunks[0].buffer,
          totalChunks: encrypted.chunks.length - 1, // first chunk is for file name
          clientFileID: clientFileID // todo: this is redundant, we have an id already
        });
      })
      .then(function (data) {
        //todo: server sends data.id which is === fileID, do we need to check if that's true?
        //todo: or should server stop sending it?
        //todo: or should crypto not return it and wait for server?
        console.log('file info uploaded, ids match:', data.id === encrypted.fileName);
      })
      .then(function () {
        changeUploadState(clientFileID, api.UL_STATE.UPLOADING_CHUNKS, 1, encrypted.chunks.length - 1);
        return Promise.each(encrypted.chunks, function (chunk, index) {
          // skipping file name
          if (index === 0) return;

          changeUploadState(clientFileID, api.UL_STATE.UPLOADING_CHUNKS, index);

          var dto = {
            ciphertext: chunk.buffer,
            chunkNumber: index - 1,//we skip first chunk (file name)
            clientFileID: clientFileID
          };
          //attaching header to first chunk
          if (index === 1) dto.header = encrypted.header;
          return net.uploadFileChunk(dto);
        });

      })
      .finally(function(){
        changeUploadState(clientFileID,null);
      });

  };

  function addUploadState(id, name) {
    api.uploads[id] = {
      fileName: name,
      state: api.UL_STATE.READING,
      stateName: ULStateNames[api.UL_STATE.READING]
    };
    api.uploads.push(api.uploads[id]);
    Peerio.Action.filesUpdated();
  }

  function changeUploadState(id, state, currentChunk, totalChunks) {
    if (state === null) {
      var ind = api.uploads.indexOf(api.uploads[id]);
      api.uploads.splice(ind, 1);
      delete api.uploads[id];
    } else {
      var u = api.uploads[id];
      u.state = state;
      u.stateName = ULStateNames[state];
      u.currentChunk = currentChunk || u.currentChunk;
      u.totalChunks = totalChunks || u.totalChunks;
    }
    Peerio.Action.filesUpdated();
  }

// updates file object properties related to download progress indication
// notifies on file change
  function setDownloadState(file, state, progress, total) {
    if (state === null) {
      delete file.downloadState;
    } else {
      file.downloadState = file.downloadState || {};
      file.downloadState.state = state;
      file.downloadState.stateName = DLStateNames[state];
      file.downloadState.progress = progress;
      file.downloadState.total = total;
      file.downloadState.percent = progress == null ? ''
        : Math.min(100, Math.ceil(progress / (total / 100))) + '%';
    }

    Peerio.Action.filesUpdated();
  }

  function download(file, url) {
    return new Promise(function (resolve, reject) {

      var xhr = new XMLHttpRequest();

      xhr.onprogress = function (progress) {
        setDownloadState(file, api.DL_STATE.DOWNLOADING, progress.loaded, progress.total);
      };

      xhr.onreadystatechange = function () {
        console.log('readystate ' + this.readyState + ' status ' + this.status);
        if (this.readyState !== 4) return;

        //todo: not all success results might have status 200
        if (this.status !== 200)
          reject(this);
        else
          resolve(this.response);
      };

      xhr.open('GET', url);
      xhr.responseType = 'blob';
      xhr.send();
    });

  }

  /**
   * adds file to cache with duplicate checks
   * and re-sorts the cache array by lastTimestamp
   * @param files
   */
  function addFilesToCache(files) {
    files.forEach(function (item) {
      if (api.cache[item.id]) return;
      api.cache.push(item);
      api.cache[item.id] = item;
      api.cache[item.shortId] = item;
    });

    Peerio.Util.sortDesc(api.cache, 'timestamp');
  }

  net.injectPeerioEventHandler('fileAdded', addFile);
  net.injectPeerioEventHandler('fileRemoved', removeFile);

  function removeFile(data) {
    var i = _.findIndex(api.cache, function (c) { return c.id === data.id;});
    if (i < 0) return;
    var file = api.cache.splice(i, 1)[0];
    delete api.cache[file.shortId];
    delete api.cache[file.id];
    Peerio.Action.filesUpdated();
  }

  function addFile(file) {
    if (api.cache[file.id]) return;

    return Peerio.Crypto.decryptFileName(file.id, file.header)
      .then(function (name) {
        if (api.cache[file.id]) return;
        file.name = name;
        file.shortId = Peerio.Util.sha256(file.id);
        api.cache[file.shortId] = file;
        api.cache[file.id] = file;
        api.cache.push(file);
        Peerio.Util.sortDesc(api.cache, 'timestamp');
        Peerio.Action.filesUpdated();
      });
  }

};