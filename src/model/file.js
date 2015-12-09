/**
 * File model
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    /**
     * Fills/replaces current File object properties with data sent by server.
     * Decrypts file name.
     * @param data - file data in server format
     * @returns {Promise} resolves with 'this'
     */
    function loadServerData(data) {
        if (!data) {
            L.error('loadServerData: can\'t load from undefined object');
            return Promise.reject();
        }
        //-- copied properties
        this.id = data.id;
        this.creator = data.creator;
        this.sender = data.sender;
        this.size = data.size;
        this.timestamp = data.timestamp;
        // decrypting file name
        return Peerio.Crypto.decryptFileName(data.id, data.header)
            .then(name => {
                this.name = name;
                return this;
            });
    }

    /**
     * Builds computed properties
     */
    function buildProperties() {
        this.shortId = Peerio.Util.sha256(this.id);
        return this;
    }

    function remove() {
        // todo state
        Peerio.FileSystem.removeCachedFile(this);
        return net.removeFile(this.id);
    }

    function nuke() {
        // todo state
        Peerio.FileSystem.removeCachedFile(this);
        return net.nukeFile(this.id);
    }

    function deleteFromCache() {
        Peerio.FileSystem.removeCachedFile(this);
        this.cached = false;
        Peerio.Action.filesUpdated();
    }

    function download() {
        var setState = setDownloadState.bind(this);
        setState(DL_STATE.DOWNLOADING);

        // getting url
        return Peerio.Net.getDownloadUrl(this.id)
            .then(response => {
                L.info('Received URL: {0}', response);
                return response && response.url || Promise.reject('Failed to get file url.');
            })
            .then((url) => {
                return downloadBlob.call(this, url);
            })
            // decrypting blob
            .then(blob => {
                L.info('File downloaded. Size = {0}. Decrypting.', blob.size);
                setState(DL_STATE.DECRYPTING);
                return Peerio.Crypto.decryptFile(this.id, blob, this);
            })
            // saving blob
            .then(decrypted => {
                L.info('File decrypted. Size = {0}. Saving.', decrypted.size);
                setState(DL_STATE.SAVING);
                return Peerio.FileSystem.cacheCloudFile(this, decrypted);
            })
            .then(() => {
                this.cached = true;
            })
            .catch(reason => {
                L.error('Failed to download file. {0}', reason);
                return Promise.reject(reason);
            })
            .finally(() => {
                setState(null);
            });
    }


    function upload(fileUrl) {
        var setState = setUploadState.bind(this);
        var encrypted;
        // temporary file id for current upload, helps identifying chunks
        this.id = Base58.encode(nacl.randomBytes(32));
        this.name = fileUrl;
        setState(UL_STATE.READING);

        return Peerio.FileSystem.plugin.getByURL(fileUrl)
            .then(fileEntry => Peerio.FileSystem.plugin.readFile(fileEntry))
            .then(file => {
                this.name = file.file.name;
                setState(UL_STATE.ENCRYPTING);
                return Peerio.Crypto.encryptFile(file.data, this.name);
            })
            .then(data => {
                setState(UL_STATE.UPLOADING_META);
                // todo: failed recipients
                encrypted = data;
                return Peerio.Net.uploadFile({
                    ciphertext: encrypted.chunks[0].buffer,
                    totalChunks: encrypted.chunks.length - 1, // first chunk is for file name
                    clientFileID: this.id // todo: this is redundant, we have an id already
                });
            })
            .then(function (data) {
                //todo: server sends data.id which is === fileID, do we need to check if that's true?
                //todo: or should server stop sending it?
                //todo: or should crypto not return it and wait for server?
                L.info('File info uploaded, ids match: {0}', data.id === encrypted.fileName);
            })
            .then(()=> {
                setState(UL_STATE.UPLOADING_CHUNKS, 1, encrypted.chunks.length - 1);
                return Promise.each(encrypted.chunks, (chunk, index) => {
                    // skipping file name
                    if (index === 0) return;

                    setState(UL_STATE.UPLOADING_CHUNKS, index);
                    L.verbose('Uploading chunk {0}/{1}. Size: {2}', index, encrypted.chunks.length - 1, chunk.buffer.length);
                    var dto = {
                        ciphertext: chunk.buffer,
                        chunkNumber: index - 1,//we skip first chunk (file name)
                        clientFileID: this.id
                    };
                    //attaching header to first chunk
                    if (index === 1) dto.header = encrypted.header;
                    return Peerio.Net.uploadFileChunk(dto);
                });

            })
            .catch(function (e) {
                L.error('Upload failed. {0}', e);
                return Promise.reject();
            })
            .finally(() =>setState(null));

    }

    function setUploadState(state, currentChunk, totalChunks) {
        if (state === null) {
            delete this.uploadState;
        } else {
            this.uploadState = this.uploadState || {};
            this.uploadState.state = state;
            this.uploadState.stateName = ULStateNames[state];
            this.uploadState.currentChunk = currentChunk || this.uploadState.currentChunk;
            this.uploadState.totalChunks = totalChunks || this.uploadState.totalChunks;
        }
        Peerio.Action.filesUpdated();
    }

    // updates file object properties related to download progress indication
    // notifies on file change
    function setDownloadState(state, progress, total) {
        if (state === null) {
            delete this.downloadState;
        } else {
            this.downloadState = this.downloadState || {};
            this.downloadState.state = state;
            this.downloadState.stateName = DLStateNames[state];
            this.downloadState.progress = progress;
            this.downloadState.total = total;
            this.downloadState.percent = progress == null ? ''
                : Math.min(100, Math.ceil(progress / (total / 100))) + '%';
        }

        Peerio.Action.filesUpdated();
    }

    function downloadBlob(url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();

            xhr.onprogress = function (progress) {
                setDownloadState(DL_STATE.DOWNLOADING, progress.loaded, progress.total);
            };

            xhr.onreadystatechange = function () {
                if (this.readyState !== 4) return;
                L.info('Download {0} finished with {1}({2}). Response size: {3}', this.responseURL, this.statusText, this.status, this.response.size);
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


    var DL_STATE = {DOWNLOADING: 0, DECRYPTING: 1, SAVING: 2};
    var DLStateNames = {0: 'Downloading', 1: 'Decrypting', 2: 'Saving'};
    var UL_STATE = {READING: 0, ENCRYPTING: 1, UPLOADING_META: 2, UPLOADING_CHUNKS: 3};
    var ULStateNames = {0: 'Reading', 1: 'Encrypting', 2: 'Uploading encrypted metadata', 3: 'Uploading chunks'};
    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    /**
     * Call Peerio.File() to create empty file object
     * @returns {File}
     */
    Peerio.File = function () {
        var obj = {
            loadServerData: loadServerData,
            buildProperties: buildProperties,
            remove: remove,
            nuke: nuke,
            deleteFromCache: deleteFromCache,
            download: download,
            upload: upload
        };

        obj.self = obj;

        return obj;
    };

    Peerio.File.DL_STATE = DL_STATE;
    Peerio.File.UL_STATE = UL_STATE;
    /**
     * Call to create and fully build File instance from server data
     * @param {Object} data
     * @returns {Promise<File>}
     */
    Peerio.File.create = function (data) {
        return Peerio.File()
            .loadServerData(data)
            .then(file => file.buildProperties());
    };

})();