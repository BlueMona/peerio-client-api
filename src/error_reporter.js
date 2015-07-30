/**
 * Starts Error interceptor and reporter.
 *
 * This script should ideally use vanilla js only,
 * so it won't fail in case of errors in some lib it uses.
 *
 * It also tries to minimize performance impact and be unobtrusive,
 * not reporting the same errors more then once and not caching too much while offline.
 *
 */

var Peerio = this.Peerio || {};
Peerio.ErrorReporter = {};

Peerio.ErrorReporter.init = function () {
  'use strict';

  // Cache of reported errors.
  var reported = {};
  // How many reports are awaiting transmission.
  var queueLength = 0;
  // How many reports are allowed to await transmission.
  var maxQueueLength = 100;
  // in case there is already a handler, we'll save it here
  var oldHandler;

  /**
   * Allows error reporting
   */
  Peerio.ErrorReporter.enable = function () {
    oldHandler = window.onerror;
    window.onerror = errorHandler;
  };

  /**
   * Disables error reporting
   */
  Peerio.ErrorReporter.disable = function () {
    window.onerror = oldHandler;
  };

  function errorHandler(aMessage, aUrl, aRow, aCol, aError) {
    if (oldHandler) oldHandler(aMessage, aUrl, aRow, aCol, aError);

    if (queueLength >= maxQueueLength) return false;
    // check if this error was already reported
    var known = reported[aUrl];
    if (known && known.row === aRow && known.col === aCol) return false;

    // cache this report to prevent reporting it again
    reported[aUrl] = {row: aRow, col: aCol};

    var report = {
      ts: Math.floor(getUTCTimeStamp() / 1000),
      url: aUrl,
      row: aRow,
      col: aCol,
      msg: aMessage,
      version: Peerio.Config.appVersion
    };

    if (aError != null) {
      report.msg = aError.message;
      report.errType = aError.name;
      report.stack = aError.stack;
    }
    queueLength++;
    sendWhenOnline(JSON.stringify(report));
    return false;
  }

  // Forever delays report for 5 minutes while device is offline.
  // Attempts sending the report when device is online.
  function sendWhenOnline(msg) {
    if (navigator.onLine === false) {
      window.setTimeout(sendWhenOnline.bind(window, msg), 5 * 60 * 1000);
      return;
    }
    queueLength--;
    var request = new XMLHttpRequest();
    request.open('POST', Peerio.Config.errorReportServer);
    request.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    request.send(msg);
  }

  function getUTCTimeStamp() {
    var now = new Date();
    return now.valueOf() + now.getTimezoneOffset() * 60000;
  }


};