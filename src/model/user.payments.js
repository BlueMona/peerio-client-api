/**
 * Settings module for User object.
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';
    Peerio.User = Peerio.User || {};

    Peerio.User.addPaymentsModule = function (user) {
        user.getActiveSubscriptions = function() {
            return user.subscriptions.filter( s => s.status === 'active' );
        };

        user.getCanceledSubscriptions = function () {
            return user.subscriptions.filter( s => s.status === 'canceled' );
        };
    };
})();
