/**
 * File list logic
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    Peerio.Files = {
        getFiles: getFiles
    };
    //--------------------------------------------------------------------------------------------------------------------

    function createFilesFromServerData(data) {
        var files = Collection('id', 'shortID', 'timestamp', false);
        var keys = Object.keys(data);
        var counter = 0, max = keys.length;
        return Promise.map(keys, function (fileID) {
                Peerio.Action.syncProgress(counter++, max, 'synchronizing files');
                return Peerio.File.fromServerData(data[fileID])
                    .then(file => files.add(file, true))
                    .catch(function (e) {
                        L.error('Failed to create file from server data {0}. {1}', fileID, e);
                    });
            }, Peerio.Crypto.recommendedConcurrency)
            .then(()=> {
                files.sort();
                return files;
            });
    }

    var loadingPromise = null;

    /**
     * Retrieves and build file list from server
     * @return {Promise<Collection<File>>}
     */
    function getFiles() {
        if (loadingPromise) return loadingPromise;
        var ret;
        loadingPromise = Peerio.Net.getFiles()
            .then(function (response) {
                return createFilesFromServerData(response.files);
            })
            .then(function (files) {
                L.info('Mapping file list to cached files.');
                ret = files;

                return Peerio.FileSystem.getCachedFileNames()
                    .catch(function (e) {
                        L.error('Failed reading cached files. {0}', e);
                        return Promise.resolve([]);
                    });
            })
            .then(function (cachedNames) {
                cachedNames.forEach(function (name) {
                    L.verbose('Mapping cached file {0}', name);
                    var file = ret[Peerio.Util.getFileName(name)];
                    if (!file) {
                        // todo: remove file?
                        L.error('Match for locally cached file {0} not found.', name);
                        return;
                    }
                    file.cached = true;
                });

                return ret;
            })
            .catch(function (e) {
                L.error('Failed loading files. {0}', e);
                return Promise.reject();
            })
            .finally(function () {
                loadingPromise = null;
            });
        return loadingPromise;
    }

})();