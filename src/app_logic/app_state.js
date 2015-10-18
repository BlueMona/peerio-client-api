/**
 * Centralized place to collect and provide global application state information.
 * This is useful for components which were instantiated too late to be able to handle previous events.
 */

var Peerio = this.Peerio || {};
Peerio.AppState = {};

Peerio.AppState.init = function () {
  'use strict';

  L.verbose('Peerio.AppState.init() start');

  var api = Peerio.AppState;
  delete Peerio.AppState.init;
  var d = Peerio.Dispatcher;

  // initial state
  api.loading = false;     // is app currently transferring/waiting for data
  api.connected = false;   // is app connected to peerio server socket
  api.authenticated = false; // is current connection authenticated

  /**
   * Adds a custom state rule to AppState.
   * You can provide your own logic of how AppState properties change on Dispatcher events.
   * On *action* event, *property* will be set to *value* or to return value of the *value* function.
   * @param {string} action - action name that will trigger this rule
   * @param {string} property - app state property name (will be available as AppState.property)
   * @param {null|string|number|object|Function} value - the value to set to property. Or function that will return such value.
   */
  api.addStateRule = function (action, property, value) {
    L.verbose('AppState rule add: action: {0}, property: {1}, value: {2}', action, property, value);
    var setFn;
    if (typeof(value) === 'function') {
      setFn = value.bind(api);
    } else {
      setFn = setState.bind(api, property, value);
    }
    d['on' + action](setFn);
  };
  /**
   * Executes specified function on specified action.
   * This is pretty much the same as addStateRule, but manipulates state inside of passed function.
   * @param {string} action - action name that will trigger handler execution
   * @param {function} handler - function that will handle the action event
   */
  api.addStateTrigger = function (action, handler) {
    d['on' + action](handler.bind(api));
  };

  function setState(prop, value) {
    L.silly('AppState change: {0}={1}', prop, value);
    api[prop] = value;
  }

  // subscribing to state-changing events
  d.onLoading(setState.bind(api, 'loading', true));
  d.onLoadingDone(setState.bind(api, 'loading', false));

  d.onSocketConnect(setState.bind(api, 'connected', true));
  d.onSocketDisconnect(function () {
    setState('connected', false);
    setState('authenticated', false);
  });

  d.onAuthenticated(setState.bind(api, 'authenticated', true));

  L.verbose('Peerio.AppState.init() end');

};