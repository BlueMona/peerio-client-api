/**
 * Peerio client API configuration.
 * Has to be loaded before other API code.
 */

var Peerio = this.Peerio || {};
Peerio.Config = {};

Peerio.Config.init = function () {
  'use strict';

  var cfg = Peerio.Config = {};

  // absolute url to the folder where Peerio client api files are installed
  cfg.apiFolder = '/';
  cfg.webSocketServer = 'wss://........peerio.com:443';

  //---------- configuration validation/correction -------------
  if (cfg.apiFolder[cfg.apiFolder.length - 1] !== '/')
    cfg.apiFolder += '/';

};