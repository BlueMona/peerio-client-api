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

    }
})();
