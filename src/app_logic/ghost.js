/**
 * Peerio Ghost
 * depends on - Peerio.Net, Peerio.Dispatcher, Peerio.AppState, Peerio.TinyDB
 */

var Peerio = this.Peerio || {};
Peerio.Ghost = {};

Peerio.Ghost.init = function () {
    'use strict';

    var api = Peerio.Ghost;

    api.create = function () {
        var g = {};
        g.id = Base58.encode(nacl.randomBytes(32));

        g.usePassphrase = function (passphrase) {
            g.passphrase = passphrase;

            return Peerio.Crypto.getKeyPair(g.id, g.passphrase)
                .then(keyPair => Peerio.Crypto.getPublicKeyString(keyPair.publicKey))
                .then(pk => {
                    g.publicKey = pk;
                    return g;
                });
        };

        g.uploadFile = function () {
        };

        return g;
    };

    api.formatGhost = function (g, encryptedMsg) {
        return {
            ghostID: g.id,
            publicKey: g.publicKey,
            lifeSpanInSeconds: 60*60*24*(g.days ? g.days : 1),
            recipients: [g.recipient],
            version: '1.0.0',
            files: [],
            header: encryptedMsg.header,
            body: encryptedMsg.body
        };
    };

    api.send = function (g) {
        var ghostMsg = {
            recipient: g.recipient,
            subject: g.subject,
            message: g.body,
            files: [],
            id: g.id,
            timestamp: Date.now(),
            passphrase: g.passphrase
        };

        return Peerio.Crypto.encryptMessage(ghostMsg, g.publicKey)
            .then(r => api.formatGhost(g, r))
            .then(Peerio.Net.createGhostMessage);
    };

    api.testGhost = function () {
        var g = api.create();
        g.subject = 'Test subject';
        g.recipient = 'peeriotest2@etcetera.ws';
        g.body = 'Some message body';
        g.usePassphrase('walking subtle iron')
            .then(() => api.send(g))
            .then(() => L.info('all good'))
            .catch(e => L.error(e));
    };
};
