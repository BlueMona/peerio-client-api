/**
 * Settings module for User object.
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';
    Peerio.User = Peerio.User || {};

    Peerio.User.subscriptions = [];

    Peerio.User.addSettingsModule = function (user) {

        if(Peerio.User.subscriptions) 
            Peerio.User.subscriptions = Peerio.Net.unsubscribe(Peerio.User.subscriptions);

        Peerio.User.subscriptions = [Peerio.Net.subscribe('settingsUpdated', (settings) => {
            L.info('incoming settings update');
            L.info(settings);
            user.processSettings(settings);
        })];

        user.processSettings = function(settings) {
            L.info('sending notification about settings across all who wants to listen!');
            user.settings = settings;
            Peerio.Action.settingsUpdated();
        };

        user.loadSettings = function () {
            //todo attempt cache first and then call for net update
            return Peerio.Net.getSettings()
                .then(settings => {
                    L.info('get settings in');
                    L.info(settings);
                    user.processSettings(settings);
                });
        }.bind(user);

        user.setName = function (firstName, lastName) {
            // only invoke updates if there are differences
            if (user.settings.firstName != firstName
                || user.settings.lastName != lastName) {
                user.settings.firstName = firstName;
                user.settings.lastName = lastName;
                return Peerio.Net.updateSettings({firstName: firstName, lastName: lastName});
            }

            return Promise.resolve();
        }.bind(user);

        user.validateAddress = function (address) {
            return Peerio.Net.validateAddress(address);
        }.bind(user);

        user.addAddress = function (address) {
            address = Peerio.Util.parseAddress(address);
            return Peerio.Net.addAddress(
                {
                    address: {type: address.type, value: address.value}
                }).then(user.loadSettings);
        }.bind(user);

        user.confirmAddress = function (address, code) {
            return Peerio.Net.confirmAddress(address, code)
                .then(user.loadSettings);
        }.bind(user);

        user.removeAddress = function (address) {
            return Peerio.Net.removeAddress(address)
                .then(user.loadSettings);

        }.bind(user);

        user.setPrimaryAddress = function (address) {
            return Peerio.Net.setPrimaryAddress(address)
                .then(user.loadSettings);
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
        }.bind(user);

    }
})();
