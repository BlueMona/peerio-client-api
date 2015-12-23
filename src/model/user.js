/**
 * Peerio User object holds authenticated user data
 * and orchestrates application on the top level
 *
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';

    // Module pattern without cached functions is optimal for User class

    Peerio.User = Peerio.User || {};

    /**
     * @param {string} username
     * @returns {object}
     */
    Peerio.User.create = function (username) {

        var user = {
            username: username,
            PINIsSet: false
        };

        Peerio.User.addAuthModule(user);
        Peerio.User.addSettingsModule(user);
        Peerio.User.addContactsModule(user);
        Peerio.User.addFilesModule(user);
        Peerio.User.addMessagesModule(user);


        user.buildProperties = Peerio.Contact.buildProperties.bind(user);
        user.buildIdenticon = Peerio.Contact.buildIdenticon.bind(user);

        // indicator that sync is currently running
        var running = false;
        var runningPromise = null;
        // if another call to sync will be made while one is still running - this will be true
        var resyncRequested = false;

        user.reSync = function () {
            L.info('Sync started');
            if (running) {
                resyncRequested = true;
                return runningPromise;
            }
            running = true;
            Peerio.Action.syncStarted();

            runningPromise = user.loadSettings()
                .then(user.buildProperties)
                .then(user.buildIdenticon)
                .then(user.loadContacts)
                .then(Peerio.ContactsEventHandler.resume)
                .then(user.loadFiles)
                .then(Peerio.FilesEventHandler.resume)
                .then(Peerio.Sync.syncMessages)
                .finally(()=> {
                    Peerio.Action.syncEnded();
                    running = false;
                    runningPromise = null;
                    if (resyncRequested) {
                        resyncRequested = false;
                        user.reSync();
                    }
                });

            return runningPromise;
        }.bind(user);

        Peerio.Net.subscribe('seqIdUpdated', Peerio.Sync.syncMessages);

        user.stopAllServerEvents = function () {
            Peerio.Sync.interrupt();
            Peerio.FilesEventHandler.pause();
            Peerio.ContactsEventHandler.pause();
        }.bind(user);

        // Unread statistics
        user.unreadState = {conversations: false, files: false, contacts: false};

        user.setConversationsUnreadState = function (state) {
            user.unreadState.conversations = state;
            Peerio.Action.unreadStateChanged();
        };
        user.setFilesUnreadState = function (state) {
            user.unreadState.files = state;
            Peerio.Action.unreadStateChanged();
        };
        user.setContactsUnreadState = function (state) {
            user.unreadState.contacts = state;
            Peerio.Action.unreadStateChanged();
        };


        return user;
    };

})();
