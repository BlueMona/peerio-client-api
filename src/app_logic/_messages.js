/**
 * Peerio App Logic: messages
 */

var Peerio = this.Peerio || {};
Peerio._Messages = {};

Peerio._Messages.init = function () {
    'use strict';

    var net = Peerio.Net;
    Peerio.ACK_MSG = Peerio.ACK_MSG || ':::peerioAck:::';


    api.markAsRead = function (conversation) {
        L.info('Peerio.Messages.markAsRead({0})', conversation.id);
        var toSend = [];
        Promise.map(conversation.messages, function (msg) {
            if (!msg.isModified) return;
            return Peerio.Crypto.encryptReceipt(msg.receipt.toString() + Date.now(), msg.sender)
                .then(function (receipt) {
                    toSend.push({id: msg.id, encryptedReturnReceipt: receipt});
                });
        }).then(function () {
            if (!toSend.length) return;
            return Peerio.Net.readMessages(toSend);
        }).then(function () {
            conversation.isModified = false;

        });
    };


    L.verbose('Peerio.Messages.init() stop');

};