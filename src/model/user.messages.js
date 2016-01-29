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

        user.removeConversation = function (id) {
            return Peerio.Net.removeConversation([id])
            .then( (resp) => {
                if( resp.success.indexOf(id) != -1 ) return true;
                return Promise.reject('Could not delete conversation');
            });
        }.bind(user);
    };
})();
