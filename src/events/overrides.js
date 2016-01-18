/**
 * Special cases for some of the standard action dispatching.
 * You can do the same for your custom actions,
 * just override Peerio.Action.actionName function.
 */


var Peerio = this.Peerio || {};
Peerio.ActionOverrides = {};

Peerio.ActionOverrides.init = function () {
  'use strict';

  Peerio.ActionOverrides.init=undefined;

  // Following overrides make sure that Loading action will be dispatched only once until LoadingDone will be called.
  // And LoadingDone will only be dispatched if it corresponds to the number of previously called Loading actions.
  // We need this because consumers are interested in knowing when the app is busy and not when individual tasks are starting and ending.
  (function () {
    var i = Peerio.Action.internal = {};
    i.loadingCounter = 0;
    Peerio.Action.loading = function () {
      if (++i.loadingCounter === 1) Peerio.Dispatcher.notify('Loading');
    };

    Peerio.Action.loadingDone = function () {
      if (--i.loadingCounter === 0) window.setTimeout(doneFn, 1000);
      i.loadingCounter = Math.max(i.loadingCounter, 0);
    };

    function doneFn() {
      if(i.loadingCounter !== 0) return;
      Peerio.Dispatcher.notify('LoadingDone');
    }
  }());

};
