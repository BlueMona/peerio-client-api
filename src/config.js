/**
 * Peerio client API configuration.
 * Has to be loaded before other API code.
 *
 * todo: environment-specific configuration
 * todo: this can't be in bower package because updates will overwrite user config
 */

var Peerio = this.Peerio || {};
Peerio.Config = {};

Peerio.Config.init = function () {
  'use strict';

  var cfg = Peerio.Config = {};

  // absolute path
  cfg.socketWorkerPath = '/base/src/network/socket_worker.js';
  // absolute path
  cfg.socketIOPath = '/base/bower_components/socket.io-client/socket.io.js';
  cfg.webSocketServer = 'wss://treetrunks.peerio.com:443';
  //cfg.webSocketServer = 'wss://app.peerio.com:443';
  cfg.phraseDictFolder = 'base/src/crypto/dict/';

};