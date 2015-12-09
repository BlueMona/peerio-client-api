/**
 * Files module for User object.
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';
    Peerio.User = Peerio.User || {};

    Peerio.User.addFilesModule = function (user) {

        user.uploads = [];

        /**
         * Reloads and rebuilds file collection from server, unless already up to date
         * @returns Peerio.user
         */
        user.loadFiles = function () {
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
                });

        }.bind(user);


        user.uploadFile = function (fileUrl) {
            var file = Peerio.File();
            Peerio.user.uploads.push(file);
            return file.upload(fileUrl);
        }.bind(user);

    }
})();
