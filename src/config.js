/**
 * NOTE: This particular file is not included in distribution.
 *       Use config_template.js to make your own config.js
 *
 * Peerio client API configuration.
 * Has to be loaded before other API code.
 *
 * todo: environment-specific configuration?
 */

var Peerio = this.Peerio || {};
Peerio.Config = {};

Peerio.Config.init = function () {
  'use strict';

  var cfg = Peerio.Config = {};

  cfg.webSocketServer = 'wss://treetrunks.peerio.com:443';

  // ios does not support navigator.hardwareConcurrency atm, use cpu info plugin
  cfg.cpuCount = navigator.hardwareConcurrency || 1;
  // if client will not receive pings for pingTimeout, connection will be considered broken
  cfg.pingTimeout = 20000;
};