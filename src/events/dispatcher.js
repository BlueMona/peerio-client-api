/**
 *  Dispatcher manages system-wide events
 *  --------------------------------------------------------------
 *  1. It provides a set of Peerio.Action.*([args]) functions which can be called
 *  by different components to notify other interested components.
 *  (see separate actions.js file).
 *
 *  2. It provides subscription/unsubscription mechanism to allow components to be notified when action happen
 *  Peerio.Dispatcher.subscribe(Peerio.Action.ACTION_NAME, callback_function)
 *  or use syntactic sugar: Peerio.Dispatcher.onACTION_NAME(callback_function)
 *  Peerio.Dispatcher.unsubscribe(subscription_id or callback_function,...)
 *
 *  Subscribers are being called synchronously in reversed order
 *  (last subscriber is called first)
 *  If subscriber returns true (===) processing stops (a la preventDefault).
 *
 *  No other logic is performed here, just dispatching.
 *  In some special cases custom dispatching logic is implemented, see overrides.js
 *
 */

var Peerio = this.Peerio || {};
Peerio.Dispatcher = {};

Peerio.Dispatcher.init = function () {
    'use strict';

    var api = Peerio.Dispatcher;
    delete Peerio.Dispatcher.init;

    // subscribers container
    // KEY: action. VALUE: [{id, handler},..] objects array
    var subscribers = {};

    /**
     * subscribes callback to action
     * @param {string} action - one of the events enum values
     * @param {function} handler - action handler
     * @returns {number} - subscription uuid. You can use this id, or the same callback to unsubscribe later.
     */
    api.subscribe = function (action, handler) {
        var id = uuid.v4();
        subscribers[action].push({
            id: id,
            handler: handler
        });
        return id;
    };

    /**
     * Unsubscribes from action
     * @param {...number|...function|[]} arguments -  subscription id or the actual subscribed callback.
     * You can pass one or more parameters with ids or callbacks or arrays containing mixed ids and callbacks
     * Note that if callback is passed, it will be unsubscribed from all actions.
     */
    api.unsubscribe = function () {
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
     * from Peerio.Action namespace should be used by components
     * @param {string} action - one of Peerio.Action names
     * @param arguments - any additional arguments will be passed to subscribers
     */
    api.notify = function (action) {
        window.setTimeout(function () {
            var args = _.rest(arguments);
            var subs = subscribers[action];
            for (var i = subs.length - 1; i >= 0; i--) {
                if (subs[i].handler.apply(null, args) === true) break;
            }
        }, 0);
    };

    /**
     * Registers new Action with dispatcher.
     * Adds a onActionName convenience function to Peerio.Dispatcher.
     * YOU SHOULD NOT NORMALLY USE THIS FUNCTION.
     * Instead, register new actions with Peerio.Action.add(actionName).
     * @param {string} actionName - the name of new action. Important: PascalCase.
     */
    api.addActionType = function (actionName) {
        if (subscribers[actionName]) throw 'Illegal attempt to register existing Action';
        // pre-creating action subscribers array
        subscribers[actionName] = [];
        // creating syntactic sugar method wrapping Peerio.Dispatcher.subscribe
        api['on' + actionName] = function (handler) {
            return api.subscribe(actionName, handler);
        };
    };

};