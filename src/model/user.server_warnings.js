/**
 * Settings module for User object.
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';
    Peerio.User = Peerio.User || {};

    Peerio.User.addServerWarningsModule = function (user) {
        Peerio.Net.subscribe('serverWarning', (warning) => {
            L.info('server warning received {0}', warning);
            if(Peerio.Translator.has(warning.msg))
                Peerio.Action.serverWarning(warning);
            else {
                L.error('warning string locale not found');
                Peerio.Net.clearWarning(warning.token);
            }
        });

        user.clearWarning = function (warning) {
            Peerio.Net.clearWarning(warning.token);
        };
    };
})();
