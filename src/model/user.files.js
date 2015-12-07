/**
 * Files module for User object.
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';
    Peerio.User = Peerio.User || {};

    Peerio.User.addFilesModule = function (user) {

        user.loadFiles = function () {
            //todo model
            return Peerio.Net.getCollectionsVersion()
                .then(response => {
                    // files are up to date
                    if (user.filesVersion === response.versions.files)
                        return;

                    return Peerio.Files.getAllFiles().then(() => user.filesVersion = response.versions.files);
                });

        }.bind(user);


    }
})();
