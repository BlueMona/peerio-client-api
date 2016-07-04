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

    Peerio.Translator = window.Translator;

    Promise.config({
        warnings: false,
        longStackTraces: true,
        cancellation: false
    });

    return Peerio.Config.init()
        .then(() => {
            Peerio.initAPI = undefined;
            Peerio.Config.apiFolder = window.peerioApiFolder;
            window.peerioApiFolder = undefined;
            Peerio.SqlDB.init();
        })
        .then(() => Peerio.SqlDB.closeAll())
        .then(() => Peerio.SqlDB.openSystemDB())
        .then(() => {
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
            Peerio.NetQueue.init();
            Peerio.Socket.start();
            Peerio.Ghost.init();

            return Peerio.AppMigrator.migrateApp();

        })
        .then(()=>{
            return Peerio.Translator
                .loadLocale(Peerio.Config.defaultLocale)
                .catch(err => L.error('Failed to load locale. {0}', err));
        })
        .then(() => {
            // todo: find a better place for this code
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
    window.peerioApiFolder = path.substring(0, path.lastIndexOf('/')) + '/';
}());
