/**
 * File list logic
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    Peerio.Files = {
        getFiles: getFiles,
        getFilesCache: getFilesCache
    };
    //--------------------------------------------------------------------------------------------------------------------

    function createFilesCollection() {
        return Collection({
            indexPropName: 'id', 
            indexPropName2: 'shortID', 
            defaultSortProp: 'timestamp', 
            defaultSortAsc: false
        });
    }

    function createFilesFromServerData(data) {
        var files = createFilesCollection();
        var keys = Object.keys(data);
        var counter = 0, max = keys.length;
        return Promise.map(keys, function (fileID) {
                Peerio.Action.syncProgress(counter++, max,Peerio.Translator.t('sync_files'));
                var existingName = Peerio.user.files && Peerio.user.files.dict[fileID];
                existingName = existingName && existingName.name || false;
                return Peerio.File.fromServerData(data[fileID], existingName)
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

    function getFilesCache() {
        var files = createFilesCollection();
        return Peerio.SqlQueries.getFiles()
            .then(data=> data.forEach(
                f=>files.add(Peerio.File.fromLocalData(f), true)
            ))
            .then(()=> files.sort())
            .then(()=> mapDownloadedFiles(files));
    }

    // replace this with sql table column
    function mapDownloadedFiles(files) {
        L.info('Mapping file list to downloaded files.');

        return Peerio.FileSystem.getCachedFileNames()
            .catch(function (e) {
                L.error('Failed reading cached files. {0}', e);
                return Promise.resolve([]);
            })
            .then(function (cachedNames) {
                cachedNames.forEach(function (name) {
                    L.verbose('Mapping cached file {0}', name);
                    var file = files.dict[Peerio.Util.getFileName(name)];
                    if (!file) {
                        // todo: remove file?
                        L.error('Match for locally cached file {0} not found.', name);
                        return;
                    }
                    file.cached = true;
                });

                return files;
            });
    }

    /**
     * Retrieves and build file list from server
     * @return {Promise<Collection<File>>}
     */
    function getFiles() {
        if (loadingPromise) return loadingPromise;

        loadingPromise = Peerio.Net.getFiles()
            .then(function (response) {
                return createFilesFromServerData(response.files);
            })
            .then(mapDownloadedFiles)
            .catch(function (e) {
                L.error('Failed loading files. {0}', e);
                return Promise.reject();
            })
            .finally(() => loadingPromise = null);

        return loadingPromise;
    }

})();
