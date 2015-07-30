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
  cfg.errorReportServer = 'https://debug.peerio.com/api/report';

  // ios does not support navigator.hardwareConcurrency atm, use cpu info plugin
  cfg.cpuCount = 1;//navigator.hardwareConcurrency || 1;
  // if client will not receive pings for pingTimeout, connection will be considered broken
  cfg.pingTimeout = 20000;

  cfg.appVersion = 'n/a';

    // todo: do the same for desktop
  document.addEventListener('deviceready', function () {
    // using cordova AppVersion plugin if available
    if (AppVersion && AppVersion.version) cfg.appVersion = AppVersion.version;
  }, false);

};