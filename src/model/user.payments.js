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

        user.listPaidPlans = function () {
            return Peerio.Net.listPaidPlans();
        };

        user.registerMobilePurchaseApple = function (receipt) {
            return Peerio.Net.registerMobilePurchase({
                store: 'ios',
                receipt: receipt
            });
        };

        user.registerMobilePurchaseAndroid = function (receipt, purchaseToken, signature) {
            return Peerio.Net.registerMobilePurchase({
                store: 'google',
                receipt: {
                    type: 'android-playstore',
                    purchaseToken: purchaseToken,
                    receipt: receipt,
                    signature: signature
                }
            });
        };
    };
})();
