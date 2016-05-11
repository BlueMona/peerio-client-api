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
            Peerio.Action.serverWarning(warning);
        });

        user.clearWarning = function (warning) {
            Peerio.Net.clearWarning(warning.token);
        };
    };
})();
