/**
 * Settings module for User object.
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';
    Peerio.User = Peerio.User || {};

    Peerio.User.addSettingsModule = function (user) {

        Peerio.Net.subscribe('settingsUpdated', (settings) => {
            L.info('settingsUpdated socket event received, {0}', settings);
            user.processSettings(settings);
        });

        user.processSettings = function (settings) {
            user.runtime = settings.runtime;
            user.settings = settings.settings;
            user.addresses = settings.addresses;
            user.firstName = settings.firstName;
            user.lastName = settings.lastName;
            user.paymentPlan = settings.paymentPlan;
            user.quota = settings.quota;
            user.paywall = settings.paywall;
            user.latestClientVersions = settings.latestClientVersions;
            user.subscriptions = settings.subscriptions || [];
            user.buildProperties();
            var thisUser = user.contacts && user.contacts.arr 
                && user.contacts.arr.filter(u => u.username == user.username);
            if(thisUser && thisUser.length) {
                thisUser = thisUser[0];
                thisUser.firstName = user.firstName;
                thisUser.lastName = user.lastName;
                thisUser.buildProperties();
            }
            return user.buildIdenticon().then(Peerio.Action.settingsUpdated);
        };


        user.loadSettingsCache = function () {
            L.info('Loading settings cache');
            return Peerio.TinyDB.getItem('settings', Peerio.user.username, Peerio.user.keyPair.secretKey)
                .then(settings => {
                    if (!settings) return Promise.reject('Failed to retrieve settings cache');
                    user.processSettings(settings);
                });
        }.bind(user);

        user.loadSettings = function () {
            return Peerio.Net.getSettings()
                .then(settings => {
                    L.info('get settings in');
                    L.info(settings);
                    return Promise.all([
                        user.processSettings(settings),
                        Peerio.TinyDB.saveItem('settings', settings, Peerio.user.username, Peerio.user.keyPair.secretKey)]);
                });
        }.bind(user);

        user.setName = function (firstName, lastName) {
            // only invoke updates if there are differences
            if (user.firstName === firstName && user.lastName === lastName) return Promise.resolve();

            user.firstName = firstName;
            user.lastName = lastName;
            return Peerio.Net.updateSettings({firstName: firstName, lastName: lastName});

        }.bind(user);

        user.validateAddress = function (address) {
            return Peerio.Net.validateAddress(address);
        }.bind(user);

        user.addAddress = function (address) {
            address = Peerio.Util.parseAddress(address);
            return Peerio.Net.addAddress({
                address: {type: address.type, value: address.value}});
        }.bind(user);

        user.confirmAddress = function (address, code) {
            return Peerio.Net.confirmAddress(address, code);
        }.bind(user);

        user.removeAddress = function (address) {
            return Peerio.Net.removeAddress(address);
        }.bind(user);

        user.setPrimaryAddress = function (address) {
            return Peerio.Net.setPrimaryAddress(address);
        }.bind(user);

        user.closeAccount = function () {
            return Peerio.Net.closeAccount();
        }.bind(user);

        user.setNotifications = function (receiveMessageNotifications, receiveContactNotifications, receiveContactRequestNotifications) {
            return Peerio.Net.updateSettings({
                receiveMessageNotifications: receiveMessageNotifications,
                receiveContactNotifications: receiveContactNotifications,
                receiveContactRequestNotifications: receiveContactRequestNotifications
            });
        };

        user.acceptTOS = function () {
            Peerio.Net.updateSettings({acceptedLatestTOS: true});
        };

        user.redeemCouponCode = function (code) {
            return Peerio.Net.redeemCouponCode(code);
        };

        user.getInviteCode = function () {
            return Peerio.Net.getInviteCode();
        };

        user.enableDataCollection = function (enable) {
            return Peerio.Net.updateSettings({
                dataCollectionOptIn: enable
            });
        };

        user.pinEntropyCheck = function (pin) {
            if (pin.match(/0{6}|1{6}|2{6}|3{6}|4{6}|5{6}|6{6}|7{6}|8{6}|9{6}/)
                || pin.match(/012345|123456|234567|345678|456789|543210|654321|765432|876543|98765/)) return false;
            return true;
        };

        user.setLocale = function (locale) {
            return Peerio.Net.updateSettings({
                localeCode: locale
            });
        };

        user.updateMobileClientVersion = function (version) {
            return Peerio.Net.updateClientVersion({mobile: version}).then(user.loadSettings);
        };
    };
})();
