/**
 * Files module for User object.
 */

var Peerio = this.Peerio || {};

Peerio.User = Peerio.User || {};

Peerio.User.addFilesModule = function (user) {
    'use strict';

    var queue = Queue();
    var net = Peerio.Net;

    user.uploads = [];

    // todo from base
    user.filesVersion = -1;

    user.pauseFileEvents = function () {
        queue.pause();
    }.bind(user);

    user.resumeFileEvents = function () {
        queue.resume();
    }.bind(user);

    //subscribing to server events
    net.subscribe('fileAdded', queue.add.bind(queue, onFileAdded));
    net.subscribe('fileShared', queue.add.bind(queue, onFileShared));
    net.subscribe('fileRemoved', queue.add.bind(queue, onFileRemoved));

    function updateCollectionVersion(version) {
        if (user.filesVersion != -1 && user.filesVersion < version) {
            Peerio.user.setFilesUnreadState(true);
        }

        user.filesVersion = Math.max(user.filesVersion, version);
        Peerio.TinyDB.saveItem('filesVersion', user.filesVersion, user.username, user.keyPair.secretKey)
        Peerio.Action.filesUpdated();
    }

    function onFileShared(data) {
        return onFileAdded(data);
    }

    function onFileAdded(data) {
        return Peerio.File.fromServerData(data)
            .then(file => {
                file.save();
                var existing  = user.files[file.shortId];
                file.cached = existing && existing.cached;
                user.files.addOrReplace(file);
                updateCollectionVersion(data.collectionVersion);
                return file;
            })
            .catch(err => {
                L.error('Failed to process fileAdded event. {0}', err);
            });
    }

    function onFileRemoved(data) {
        try {
            Peerio.SqlQueries.deleteFile(data.id);
            var existing = user.files.dict[data.id];
            if(existing) existing.deleteFromCache();
            user.files.removeByKey(data.id);
            updateCollectionVersion(data.collectionVersion);
        } catch (err) {
            L.error('Failed to process fileRemoved event. {0}', err);
        }
    }

    user.loadFilesCache = function () {
        return Peerio.Files.getFilesCache()
            .then(files => user.files = files)
            .then(() => Peerio.TinyDB.getItem('filesVersion', user.username, user.keyPair.secretKey))
            .then(filesVersion => user.filesVersion = filesVersion == null ? -1 : filesVersion);
    };
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
                        user.files = files;

                        Promise.each(files.arr, f => f.save())
                            .then(()=>removeDeletedFiles(files))
                            .then(()=>updateCollectionVersion(response.versions.files))
                            .return(user);
                    });
            }).finally(()=>Peerio.Action.syncProgress(1, 1, 'synchronizing files'));

    }.bind(user);

    function removeDeletedFiles(files) {
        return Peerio.SqlQueries.getAllFilesShortIDs()
            .then(IDs=> {
                var toDelete = [];
                IDs.forEach(id => {
                    if (files.dict[id]) return;
                    toDelete.push(id);
                });
                return Promise.each(toDelete, id => Peerio.SqlQueries.deleteFileByShortID(id));
            });
    }

    user.uploadFile = function (fileData) {
        var file = Peerio.File();
        Peerio.user.uploads.push(file);
        return file.upload(fileData.fileUrl, fileData.fileName)
            .finally(function () {
                _.pull(Peerio.user.uploads, file);
                Peerio.Action.filesUpdated();
            });
    }.bind(user);
};

