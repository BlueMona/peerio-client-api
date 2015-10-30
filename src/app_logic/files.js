/**
 * Peerio App Logic: files
 */

var Peerio = this.Peerio || {};
Peerio.Files = {};

Peerio.Files.init = function () {
    'use strict';

    L.verbose('Peerio.Files.init() start');

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
    var ULStateNames = {0: 'Reading', 1: 'Encrypting', 2: 'Uploading encrypted metadata', 3: 'Uploading chunks'};

    var getAllFilesPromise = null;

    /**
     * Loads file list.
     * Resolves once everything is loaded and decrypted.
     * @promise
     */
    api.getAllFiles = function () {
        L.info('Peerio.Files.getAllFiles()');
        if (getAllFilesPromise) {
            L.verbose('returning existing getAllFilesPromise');
            return getAllFilesPromise;
        }

        if (api.cache) {
            L.info('getAllFiles: resolving with cache');
            return Promise.resolve(api.cache);
        }

        L.B.start('loading files', 'Files loading time');
        var decrypted = [];
        api.cache = [];
        L.info('Requesting file list from server.');
        return getAllFilesPromise = net.getFiles()
            .then(function (response) {
                var files = response.files;
                var keys = Object.keys(files);
                L.info('{0} files received. Decrypting and processing.', keys && keys.length);

                return Promise.map(keys, function (fileId) {
                        var file = files[fileId];
                        L.verbose('Decrypting file id {0}', fileId && (fileId.substring(0, 10) + '...'));
                        return Peerio.Crypto.decryptFileName(fileId, file.header)
                            .then(function (name) {
                                file.name = name;
                                file.shortId = Peerio.Util.sha256(fileId);
                                decrypted.push(file);
                                decrypted[file.shortId] = file;
                            })
                            .catch(function (e) {
                                L.error('Failed to decrypt and process {0}. {1}', fileId, e);
                            });
                    }, Peerio.Crypto.recommendedConcurrency)
                    .return(decrypted);
            })
            .then(addFilesToCache)
            .then(function () {
                L.info('Mapping file list to cached files.');
                return Peerio.FileSystem.getCachedFileNames()
                    .catch(function (e) {
                        L.error('Failed reading cached files. {0}', e);
                        return Promise.resolve(null);
                    });
            })
            .then(function (cachedNames) {
                if (!cachedNames) return;
                cachedNames.forEach(function (name) {
                    L.verbose('Mapping cached file {0}', name);
                    var file = api.cache[Peerio.Util.getFileName(name)];
                    if (!file) {
                        // todo: remove file?
                        L.error('Match for locally cached file {0} not found.', name);
                        return;
                    }
                    file.cached = true;
                });
            })
            .then(function () {
                Peerio.Action.filesUpdated();
                L.info('Files loaded.');
                return api.cache;
            })
            .catch(function (e) {
                L.error('Failed loading files. {0}', e);
                return Promise.reject();
            })
            .finally(function () {
                L.B.stop('loading files');
            });
    };
    api.deleteFromCache = function (shortId) {
        L.info('Peerio.Files.deleteFromCache({0})', shortId);
        var file = api.cache[shortId];
        if (!file) {
            L.error('File not found in cache. Can\'t delete.');
            return;
        }
        Peerio.FileSystem.removeCachedFile(file);
        file.cached = false;
        Peerio.Action.filesUpdated();
    };
    // todo request sent proof
    api.delete = function (shortId) {
        L.info('Peerio.Files.delete({0})', shortId);
        var file = api.cache[shortId];
        if (!file) {
            L.error('File not found in cache. Can\'t delete.');
            return;
        }
        Peerio.FileSystem.removeCachedFile(file);
        net.removeFile(file.id);
    };

    // todo request sent proof
    api.nuke = function (shortId) {
        L.info('Peerio.Files.nuke({0})', shortId);
        var file = api.cache[shortId];
        if (!file) {
            L.error('File not found in cache. Can\'t delete.');
            return;
        }
        Peerio.FileSystem.removeCachedFile(file);
        net.nukeFile(file.id);
    };

    api.download = function (file) {
        L.info('Peerio.Files.download() id:', file.id);
        setDownloadState(file, api.DL_STATE.DOWNLOADING);

        L.B.start('download ' + file.shortId);
        L.info('Requesting url');
        // getting url
        return net.downloadFile(file.id)
            .then(function (response) {
                L.info('Received URL: {0}', response);
                return response && response.url || Promise.reject('Failed to get file url.');
            })
            // downloading blob
            .then(function (url) {
                return download(file, url);
            })
            // decrypting blob
            .then(function (blob) {
                L.info('File downloaded. Size = {0}. Decrypting.', blob.size);
                setDownloadState(file, api.DL_STATE.DECRYPTING);
                return Peerio.Crypto.decryptFile(file.id, blob, file);
            })
            // saving blob
            .then(function (decrypted) {
                L.info('File decrypted. Size = {0}. Saving.', decrypted.size);
                setDownloadState(file, api.DL_STATE.SAVING);
                return Peerio.FileSystem.cacheCloudFile(file, decrypted);
            })
            .then(function () {
                file.cached = true;
            })
            .catch(function (reason) {
                L.error('Failed to download file. {0}', reason);
                return Promise.reject(reason);
            })
            .finally(function () {
                setDownloadState(file, null);
                L.B.stop('download ' + file.shortId);
            });
    };

    api.fetch = function (fileid) {
        L.info('Peerio.Files.fetch({0})', fileid);
        return net.getFile(fileid)
            .then(addFile)
            .catch(function (e) {
                L.error('Failed to fetch file', e);
                return Promise.reject();
            });
    };

    var uploadCounter = 0;
    api.upload = function (fileUrl) {
        var uploadNum = uploadCounter++;
        L.info('#{0} Peerio.Files.upload({1})', uploadNum, fileUrl);
        L.B.start('#{0} upload', uploadNum);
        var encrypted;
        // temporary file id for current upload, helps identifying chunks
        var clientFileID = Base58.encode(nacl.randomBytes(32));
        addUploadState(clientFileID, fileUrl);

        L.info('#{0} Opening file', uploadNum);
        return Peerio.FileSystem.plugin.getByURL(fileUrl)
            .then(function (fileEntry) {
                L.info('#{0} Reading file', uploadNum);
                return Peerio.FileSystem.plugin.readFile(fileEntry);
            })
            .then(function (file) {
                L.info('#{0} Encrypting file', uploadNum);
                changeUploadState(clientFileID, api.UL_STATE.ENCRYPTING);
                return Peerio.Crypto.encryptFile(file.data, file.file.name);
            })
            .then(function (data) {
                L.info('#{0} Uploading file', uploadNum);
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
                L.info('#{0} File info uploaded, ids match: {1}', uploadNum, data.id === encrypted.fileName);
            })
            .then(function () {
                L.info('#{0} Uploading chunks', uploadNum);
                changeUploadState(clientFileID, api.UL_STATE.UPLOADING_CHUNKS, 1, encrypted.chunks.length - 1);
                return Promise.each(encrypted.chunks, function (chunk, index) {
                    // skipping file name
                    if (index === 0) return;

                    changeUploadState(clientFileID, api.UL_STATE.UPLOADING_CHUNKS, index);
                    L.verbose('#{0} Uploading chunk {1}/{2}. Size: {3}', uploadNum, index, encrypted.chunks.length - 1, chunk.buffer.length);
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
            .catch(function (e) {
                L.error('#{0} Upload failed. {1}', uploadNum, e);
                return Promise.reject();
            })
            .finally(function () {
                changeUploadState(clientFileID, null);
                L.B.stop('#{0} upload', uploadNum);
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
                if (this.readyState !== 4) return;
                L.info('Download {0} finished with {1}({2}). Response size: {3}', this.responseURL, this.statusText, this.status, this.response.size);
                ;
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
        L.info('adding {0} files to cache', files.length);
        files.forEach(function (item) {
            if (api.cache[item.id]) return;
            api.cache.push(item);
            api.cache[item.id] = item;
            api.cache[item.shortId] = item;
        });

        Peerio.Util.sortDesc(api.cache, 'timestamp');
    }

    /////////// net.subscribe('fileAdded', addFile);
///////////  net.subscribe('fileRemoved', removeFile);

    function removeFile(data) {
        var i = _.findIndex(api.cache, function (c) {
            return c.id === data.id;
        });
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

    L.verbose('Peerio.Files.init() send');

};