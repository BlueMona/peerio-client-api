/**
 *  Peerio Actions to use with Dispatcher
 *  -------------------------------------
 *
 *  use Peerio.Actions.ACTION_NAME to reference action name string
 *  use Peerio.Actions.ACTION_NAME([params]) to execute action function (first letter of the method is in lower case)
 *  use Peerio.Dispatcher.onACTION_NAME(callback) to subscribe to action
 */
(function () {
  'use strict';

  window.Peerio = window.Peerio || {};
  Peerio.Actions = {};

  // Actions list with parameter information
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
  //      Peerio.Actions.MyAction
  //      value of the property === Action name ("MyAction")
  // 4. Action execution methods will have action name but with first letter in lower case
  //      Peerio.Actions.myAction(...params)
  [
    //------- ACTIONS EMITTED BY CORE -------
    'SocketConnect',       // WebSocket reported successful connect
    'SocketDisconnect',    // WebSocket reported disconnected(and reconnecting) state
    'Loading',             // Data transfer is in process
    'LoadingDone',         // Data transfer ended
    'LoginProgress',       // {string} state
    'LoginSuccess',        // login attempt succeeded
    'LoginFail',           // login attempt failed
    'TwoFARequest',        // server requested 2fa code
    'TwoFAValidateSuccess',// 2fa code validation success
    'TwoFAValidateFail',   // 2fa code validation fail
    'TOFUFail',            // Contact loader detected TOFU check fail
    'MessageSentStatus',   // progress report on sending message {object, Peerio.Actions.Statuses} internal temporary guid
    'ConversationUpdated', // messages were updated in single conversation thread {id} conversation id
    'MessagesUpdated',     // there was an update to the messages in the following conversations {array} conversation ids
    'ConversationsLoaded', // Peerio.user.conversations was created/replaced from cache or network. Full update.
    'FilesUpdated',        // Something in user files collection has changed, so you better rerender it
    'ContactsUpdated',     // One or more contacts loaded/modified/deleted
    //------- ACTIONS EMITTED BY UI -------
    'SignOut',             // User wants to sign out
    'TabChange',           // Active tab changed to (index)
    'SidebarToggle',       // User wants to change show/hide state of sidebar
    'SwipeLeft',           // Global swipe left event detected by app root
    'SwipeRight',          // Global swipe right event detected by app root
    // Navigate* events allow opening nested views and navigating back from them(closing)
    // When calling NavigatedIn action, parameter can be passed to change "universal action button" in footer
    // If no parameters were passed - action button will remain the same.
    // When calling NavigatedOut "universal action button will be reverted to previous state"
    // NavigatedIn and Out are navigation change FACTS
    // NavigateBack - is a REQUEST that may lead to NavigatedOut
    'NavigatedIn',         // {Object{string actionName, function actionFn}} subview was opened (may be called several times sequentially)
    'NavigatedOut',        // subview was closed
    'NavigateBack',        // user wants to go back from subview
    'NewMessageViewOpen',  // open new message composition view requested
    'NewMessageViewClose', // open new message composition view requested
    'UploadFile',          // user wants to upload file
    'AddContact',          // user wants to add a new contact
    'TabBarShow',          // show tab bar requested
    'TabBarHide',          // show tab bar requested
    'SendCurrentMessage',  // user wants to send the message that he is currently typing
    'ShowFileSelect',      // {string[]} open file selector, optionally pass array of preselected file id's
    'FilesSelected',       // file selector was closed accepting selection
    //------- HARDWARE/OS ACTIONS
    'HardMenuButton',      // hardware "menu" button was pressed
    'HardBackButton',      // hardware "back" button was pressed
    'Pause',               // OS sent app to background
    'Resume'               // app was restored from background
  ].forEach(function (action) {
      // creating action name property
      Peerio.Actions[action] = action;
    });

  // Enums
  Peerio.Actions.Statuses = {
    Pending: 0,
    Success: 1,
    Fail: 2
  };

}());

