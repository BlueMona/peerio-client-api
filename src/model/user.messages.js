/**
 * Messages module for User object.
 */

var Peerio = this.Peerio || {};

(function () {
    'use strict';
    Peerio.User = Peerio.User || {};

    Peerio.User.addMessagesModule = function (user) {

        user.startConversation = function () {

        }.bind(user);

        user.sendMessage = function () {

        }.bind(user);

        user.deleteConversation = function () {
        }.bind(user);


    }
})();
