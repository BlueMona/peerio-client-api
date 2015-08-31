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
            });
        }, Peerio.Crypto.recommendedPromiseConcurrency)
          .return(decrypted);
      })
      .then(addFilesToCache)
      .return(api.cache);
  };

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

};