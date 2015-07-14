/**
 *  Dispatcher is a glue between React UI components and Data/Business logic layers
 *  --------------------------------------------------------------
 *  1. It provides a set of Peerio.Actions.*([args]) functions which can be called
 *  by different components to notify other interested components.
 *  (see separate actions.js file)
 *
 *  2. It provides subscription/unsubscription mechanism to allow components to be notified when action happen
 *  Peerio.Dispatcher.subscribe(Peerio.Actions.ACTION_NAME, callback_function)
 *  or use syntactic sugar: Peerio.Dispatcher.onACTION_NAME(callback_function)
 *  Peerio.Dispatcher.unsubscribe(subscription_id or callback_function,...)
 *
 *  Subscribers are being called synchronously in reversed order
 *  (last subscriber is called first)
 *  If subscriber returns true (===) processing stops (a la preventDefault).
 *
 *  No other logic is performed here, just dispatching.
 *  Except some special cases where matching "Done" event should not fire
 *  while original "Start" event was called more then once.
 *
 *
 */
(function () {
  'use strict';

  window.Peerio = window.Peerio || {};

  // subscribers container
  // action for a key and [{id, handler},..] objects array as value
  var subscribers = {};

  Peerio.Dispatcher = {};

  /**
   * subscribes callback to action
   * @param {string} action - one of the events enum values
   * @param {function} handler - action handler
   * @returns {number} - subscription uuid. You can use this id, or the same callback to unsubscribe later.
   */
  Peerio.Dispatcher.subscribe = function (action, handler) {
    var id = uuid.v4();
    subscribers[action].push({
      id: id,
      handler: handler
    });
    return id;
  };

  /**
   * Unsubscribes from action
   * @param {...number|...function|[]} - subscription id or the actual subscribed callback.
   * You can pass one or more parameters with ids or callbacks or arrays containing mixed ids and callbacks
   * Note that if callback is passed, it will be unsubscribed from all actions.
   */
  Peerio.Dispatcher.unsubscribe = function () {
    var removeSubscriber = function (subscriber) {
      var predicate = typeof (subscriber) === 'function' ? {handler: subscriber} : {id: subscriber};
      _.forIn(subscribers, function (value) {
        _.remove(value, predicate);
      });
    };
    // if array is passed, we will iterate it. If not, we will iterate arguments.
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      if (Array.isArray(a)) a.forEach(removeSubscriber);
      else removeSubscriber(a);
    }
  };

  /**
   * Notifies subscribers on action and passes optional arguments.
   * This is an abstract function, more convenient specialized functions
   * from Peerio.Actions namespace should be used by components
   * @param {string} action - one of Peerio.Actions names
   * @param arguments - any additional arguments will be passed to subscribers
   */
  Peerio.Dispatcher.notify = function (action) {
    var args = _.rest(arguments);
    var subs = subscribers[action];
    for (var i = subs.length - 1; i >= 0; i--) {
      if (subs[i].handler.apply(null, args) === true) break;
    }
  };

  // initialisation
  _.forIn(Peerio.Actions, function (actionName, key) {
    if (!Peerio.Actions.hasOwnProperty(key) || typeof(actionName) !== 'string') return;

    var actionMethodName = actionName.charAt(0).toLowerCase() + actionName.substring(1);
    // pre-creating action subscribers array
    subscribers[actionName] = [];
    // creating syntactic sugar method wrapping Peerio.Dispatcher.subscribe
    Peerio.Dispatcher['on' + actionName] = function (handler) {
      return Peerio.Dispatcher.subscribe(actionName, handler);
    };
    // creating action function
    Peerio.Actions[actionMethodName] = Peerio.Dispatcher.notify.bind(null, actionName);

  });

}());