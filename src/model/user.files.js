/**
 * Files module for User object.
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';
    Peerio.User = Peerio.User || {};

    Peerio.User.addFilesModule = function (user) {

        user.uploads = [];
        // todo from base
        user.filesVersion = -1;

        function updateCollectionVersion(version) {
            user.filesVersion = Math.max(user.filesVersion, version);
            Peerio.Action.filesUpdated();
        }

        /**
         * Adds/replaces a new file to local file list cache.
         * Normally as a result of server event.
         * @param {Peerio.file} file
         * @param {number} version - collection version associated with this update
         */
        user.onFileAdded = function (file, version) {
            user.files.addOrReplace(file);
            updateCollectionVersion(version);
        }.bind(user);

        /**
         * Removes a file from local file list cache.
         * Normally as a result of server event.
         * @param {string} id - removed file id
         * @param {number} version - collection version associated with this update
         */
        user.onFileRemoved = function (id, version) {
            user.files.removeByKey(id);
            updateCollectionVersion(version);
        }.bind(user);


        /**
         * Reloads and rebuilds file collection from server, unless already up to date
         * @returns Peerio.user
         */
        user.loadFiles = function () {
            Peerio.Action.syncProgress(0, 0, 'synchronizing files');

            return Peerio.Net.getCollectionsVersion()
                .then(response => {
                    // files are up to date
                    if (user.filesVersion === response.versions.files)
                        return user;

                    return Peerio.Files.getFiles()
                        .then(files => {
                            user.filesVersion = response.versions.files;
                            user.files = files;
                            return user;
                        });
                }).finally(()=>Peerio.Action.syncProgress(1, 1, 'synchronizing files'));

        }.bind(user);


        user.uploadFile = function (fileUrl) {
            var file = Peerio.File();
            Peerio.user.uploads.push(file);
            return file.upload(fileUrl)
                .finally(function () {
                    _.pull(Peerio.user.uploads, file);
                    Peerio.Action.filesUpdated();
                });
        }.bind(user);
    };
})();
