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

        user.reSync = function () {
            return user.loadSettings()
                .then(user.loadContacts)
                .then(() => Peerio.ContactsEventHandler.resume())
                .then(user.loadFiles)
                .then(() => Peerio.FilesEventHandler.resume())
                .then(() => {
                    // a bit ugly but we need app to be usable while messages are syncing,
                    // so reSync promise needs to be resolved before messages are done syncing
                    //window.setTimeout(()=> {
                    //    Peerio.Sync.syncMessages()
                    //        .then(() => Peerio.MessagesEventHandler.resume());
                    //}, 0);
                });
        }.bind(user);

        user.stopAllServerEvents = function () {
            Peerio.Sync.interrupt();
            Peerio.MessagesEventHandler.pause();
            Peerio.FilesEventHandler.pause();
            Peerio.ContactsEventHandler.pause();
        }.bind(user);


        return user;
    };

})();
