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
        .then(() => {
            delete Peerio.initAPI;
            Peerio.Config.apiFolder = Peerio.apiFolder;
            delete Peerio.apiFolder;

            Peerio.SqlDB.init();
        })
        .then( () => Peerio.SqlDB.openSystemDB() )
        .then( () => {
            Peerio.TinyDB.init();
            Peerio.Util.init();
            Peerio.Crypto.init();
            Peerio.PhraseGenerator.init();
            Peerio.Socket.init();
            Peerio.Net.init();
            Peerio.Dispatcher.init();
            Peerio.Action.init();
            Peerio.ActionOverrides.init();
            Peerio.AppState.init();
            Peerio.FileSystem.init();
            Peerio.ContactsEventHandler.init();
            Peerio.FilesEventHandler.init();

            Peerio.Socket.start();
        }).then(() => {
            // todo: find a bettter place for this code
            // Some users logs contain offline event followed by online event within 0-10 milliseconds.
            // Since it's out of our control, we choose to react on on/offline events only if offline state persists for a few seconds.
            var timer = null;

            window.addEventListener('offline', ()=> {
                timer = setTimeout(()=> {
                    if (timer === null) return;
                    timer = null;
                    Peerio.Action.offline();
                }, 3000);
            }, false);

            window.addEventListener('online', ()=> {
                if (timer === null) {
                    Peerio.Action.online();
                    return;
                }
                clearInterval(timer);
                timer = null;

            }, false);
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
