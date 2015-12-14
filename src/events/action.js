/**
 *  Peerio Actions to use with Dispatcher
 *  -------------------------------------
 *
 *  use Peerio.Action.ACTION_NAME to reference action name string
 *  use Peerio.Action.ACTION_NAME([params]) to execute action function (first letter of the method is in lower case)
 *  use Peerio.Dispatcher.onACTION_NAME(callback) to subscribe to action
 */

var Peerio = this.Peerio || {};
Peerio.Action = {};

Peerio.Action.init = function () {
    'use strict';

    delete Peerio.Action.init;

    /**
     * Adds an action to Event System. Creates convenience functions.
     * Use this at any time to add a new action type.
     * There is no way to remove action type atm, as it is not needed.
     * @param {string} actionName - the name of new action. Important: PascalCase.
     */
    Peerio.Action.add = function (actionName) {
        if (Peerio.Action[actionName]) throw 'Illegal attempt to register existing Action. Or other property with same name exists.';

        Peerio.Action[actionName] = actionName;

        var actionMethodName = actionName[0].toLowerCase() + actionName.substring(1);
        // creating action function
        Peerio.Action[actionMethodName] = Peerio.Dispatcher.notify.bind(null, actionName);
        Peerio.Dispatcher.addActionType(actionName);
    };

    // Default actions list with parameter information
    // preferable naming style: "Action", "ObjectAction" or "ActionDetail"
    // IMPORTANT NOTE ABOUT NAMING:
    // 1. Action names should always
    //      * Be longer then 1 symbol
    //      * Start from upper case letter
    //      * Example: MyAction
    // 2. Dispatcher subscription methods will be named in following pattern
    //      Peerio.Dispatcher.onMyAction(...subscriber)
    //      e.g. action name will be prefixed with "on"
    // 3. Action names will be available as properties on Actions object like so:
    //      Peerio.Action.MyAction
    //      value of the property === Action name ("MyAction")
    // 4. Action execution methods will have action name but with first letter in lower case
    //      Peerio.Action.myAction(...params)
    [
        //------- ACTIONS EMITTED BY CORE -------
        'Connected',       // WebSocket reported successful connect
        'Disconnected',    // WebSocket reported disconnected(and reconnecting) state

        'Authenticated',       // WebSocket connection was authenticated
        'AuthFail',            // WebSocket connection failed to authenticate

        'Loading',             // Data transfer is in process
        'LoadingDone',         // Data transfer ended

        'SettingsUpdated',

        'TwoFactorAuthRequested',
        'TwoFactorAuthResend',

        'MessageAdded',
        'ReceiptAdded',

        'ConversationsUpdated',

        'ContactsUpdated',

        'FilesUpdated',
        'FileUpdated',         // ({file})

        'SyncStarted',
        'SyncProgress',
        'SyncEnded'
    ].forEach(function (action) {
        Peerio.Action.add(action);
    });

    // Enums
    Peerio.Action.Statuses = {
        Pending: 0,
        Success: 1,
        Fail: 2
    };

};

/**
 * @name Peerio.Action.contactsUpdated
 * @function
 */
/**
 * @name Peerio.Action.connected
 * @function
 */
/**
 * @name Peerio.Action.disconnected
 * @function
 */
/**
 * @name Peerio.Action.authenticated
 * @function
 */
/**
 * @name Peerio.Action.loading
 * @function
 */
/**
 * @name Peerio.Action.loadingDone
 * @function
 */
/**
 * @name Peerio.Action.loginSuccess
 * @function
 */
/**
 * @name Peerio.Action.loginFail
 * @function
 */
/**
 * @name Peerio.Action.settingsUpdated
 * @function
 */
/**
 * @name Peerio.Action.twoFactorAuthRequested
 * @function
 */
