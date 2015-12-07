/**
 * Main library file, contains initialisation code
 */

var Peerio = this.Peerio || {};

window.hasProp = Function.call.bind(Object.prototype.hasOwnProperty);

/**
 * Initializes all API modules.
 * This should be called whenever DOM/Device is ready.
 * Init order matters.
 */
Peerio.initAPI = function () {

    Promise.config({
        warnings: false,
        longStackTraces: true,
        cancellation: false
    });

    return Peerio.Config.init()
        .then(function () {
            delete Peerio.initAPI;
            Peerio.Config.apiFolder = Peerio.apiFolder;
            delete Peerio.apiFolder;

            Peerio.TinyDB.init();
            Peerio.SqlDB.init();
            Peerio.Util.init();
            Peerio.Crypto.init();
            Peerio.PhraseGenerator.init();
            Peerio.Socket.init();
            Peerio.Net.init();
            Peerio.Dispatcher.init();
            Peerio.Action.init();
            Peerio.ActionOverrides.init();
            Peerio.AppState.init();
            Peerio.Messages.init();
            Peerio.FileSystem.init();
            Peerio.Files.init();
            Peerio.ContactsEventHandler.init();
            Peerio.FilesEventHandler.init();
            Peerio.MessagesEventHandler.init();

            Peerio.Socket.start();

            return Promise.resolve();
        });
};

// detecting api folder, this has to be done at script's first evaluation,
// and assumes there are no async scripts
(function () {
    'use strict';

    var path = document.currentScript && document.currentScript.getAttribute('src')
        || document.scripts[document.scripts.length - 1].getAttribute('src');
    // temporary saving api folder in root namespace until Config is initalized
    Peerio.apiFolder = path.substring(0, path.lastIndexOf('/')) + '/';
}());
