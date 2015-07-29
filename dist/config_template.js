/**
 * Peerio client API configuration.
 * Has to be loaded before other API code.
 */

var Peerio = this.Peerio || {};
Peerio.Config = {};

Peerio.Config.init = function () {
  'use strict';

  var cfg = Peerio.Config = {};

  cfg.webSocketServer = 'wss://........peerio.com:443';

  // This parameter allows us to spawn an optimal number of crypto workers.
  // For any chromium-based host navigator.hardwareConcurrency should be enough.
  // For iOS (safari-based webview) apps, please use cordova-plugin-chrome-apps-system-cpu
  // and reconfigure this parameter based on plugin cpu report.
  cfg.cpuCount = navigator.hardwareConcurrency || 1;

  // if client will not receive pings for pingTimeout, connection will be considered broken
  // set to 0 to disable ping timeout
  cfg.pingTimeout = 20000;

};