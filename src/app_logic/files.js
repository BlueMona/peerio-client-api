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

  api.STATE = {DOWNLOADING: 0, DECRYPTING: 1, SAVING: 2};
  var stateNames = {0: 'Downloading', 1: 'Decrypting', 2: 'Saving'};

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
    Peerio.Net.removeFile(file.id);
  };

  api.nuke = function (shortId) {
    var file = api.cache[shortId];
    if (!file) return;
    Peerio.FileSystem.removeCachedFile(file);
    Peerio.Net.nukeFile(file.id);
  };

  api.download = function (file) {

    setDownloadState(file, api.STATE.DOWNLOADING);

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
        setDownloadState(file, api.STATE.DECRYPTING);
        return Peerio.Crypto.decryptFile(file.id, blob, file);
      })
      // saving blob
      .then(function (decrypted) {
        setDownloadState(file, api.STATE.SAVING);
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

  // updates file object properties related to download progress indication
  // notifies on file change
  function setDownloadState(file, state, progress, total) {
    if (state === null) {
      delete file.downloadState;
    } else {
      file.downloadState = file.downloadState || {};
      file.downloadState.state = state;
      file.downloadState.stateName = stateNames[state];
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
        setDownloadState(file, api.STATE.DOWNLOADING, progress.loaded, progress.total);
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
        Peerio.Action.filesUpdated();
      });
  }

};