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

  Peerio.Action = {};

  /**
   * Adds an action to Event System. Creates convenience functions.
   * Use this at any time to add a new action type.
   * There is no way to remove action type atm, as it is not needed.
   * @param {string} actionName - the name of new action. Important: PascalCase.
   */
  Peerio.Action.add = function(actionName){
    if(Peerio.Action[actionName]) throw 'Illegal attempt to register existing Action. Or other property with same name exists.';

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
    'SocketConnect',       // WebSocket reported successful connect
    'SocketDisconnect',    // WebSocket reported disconnected(and reconnecting) state
    'Authenticated',       // WebSocket connection was authenticated
    'Loading',             // Data transfer is in process
    'LoadingDone',         // Data transfer ended
    //'LoginProgress',       // {string} state
    'LoginSuccess',        // login attempt succeeded
    'LoginFail'           // login attempt failed
    //'TwoFARequest',        // server requested 2fa code
    //'TwoFAValidateSuccess',// 2fa code validation success
    //'TwoFAValidateFail',   // 2fa code validation fail
    //'TOFUFail',            // Contact loader detected TOFU check fail
    //'MessageSentStatus',   // progress report on sending message {object, Peerio.Action.Statuses} internal temporary guid
    //'ConversationUpdated', // messages were updated in single conversation thread {id} conversation id
    //'MessagesUpdated',     // there was an update to the messages in the following conversations {array} conversation ids
    //'ConversationsLoaded', // Peerio.user.conversations was created/replaced from cache or network. Full update.
    //'FilesUpdated',        // Something in user files collection has changed, so you better rerender it
    //'ContactsUpdated',     // One or more contacts loaded/modified/deleted

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

