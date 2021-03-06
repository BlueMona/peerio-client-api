/**
 * NOTE: This particular file is not included in distribution.
 *       Use config_template.js to make your own config.js
 *
 * Peerio client API configuration.
 * Has to be loaded before other API code.
 *
 */

var Peerio = this.Peerio || {};
Peerio.Config = {};

Peerio.Config.init = function () {
    'use strict';

    return new Promise(function (resolve) {

        var cfg = Peerio.Config;
        Peerio.Config.init=undefined;

        cfg.defaultLocale = 'en';
        cfg.locales = [{code:'en', name:'English'}];

        cfg.webSocketServer = 'wss://app.peerio.com:443';

        cfg.dbPrefix = /\/\/(.*)\.peerio\.com/.exec(cfg.webSocketServer)[1];
        if (cfg.dbPrefix === 'app') cfg.dbPrefix = '';

        cfg.cpuCount = 1; //navigator.hardwareConcurrency || 1;
        // if client will not receive pings for pingTimeout, connection will be considered broken
        cfg.pingTimeout = 30000;
        cfg.serverResponseTimeout = 15000;

        // Set this dynamically to something related to device where app is currently running.
        // This secret key will be used for low-importance data encryption to store in on device.
        cfg.lowImportanceDeviceKey = '12345';

        // using cordova device plugin if available
        if (window.device && device.uuid) cfg.lowImportanceDeviceKey = device.uuid;

        // using cordova cpu info plugin if available
        if (!navigator.hardwareConcurrency && window.chrome && chrome.system && chrome.system.cpu && chrome.system.cpu.getInfo) {
            chrome.system.cpu.getInfo(function (info) {
                var cpuCount = info.numOfProcessors || info.processors.length || 0;
                if (cpuCount) cfg.cpuCount = cpuCount;
                resolve();
            });
        } else resolve();

    });

};
