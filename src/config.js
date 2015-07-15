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

  // absolute url to the folder where Peerio client api files are installed
  cfg.apiFolder = '/base/dist/';
  cfg.webSocketServer = 'wss://treetrunks.peerio.com:443';

  //---------- configuration validation/correction -------------
  if (cfg.apiFolder[cfg.apiFolder.length - 1] !== '/')
    cfg.apiFolder += '/';


};