/**
 * Event system specs
 */

describe('Events', function () {
  'use strict';

  it('makes sure standard actions work', function () {
    // This test is pretty dumb, and requires maintenance on every action list change.
    // But it prevents accidental action removal, which happens sometimes.
    var actions = [
      'SocketConnect',
      'SocketDisconnect',
      'Loading',
      'LoadingDone',
      'LoginProgress',
      'LoginSuccess',
      'LoginFail',
      'TwoFARequest',
      'TwoFAValidateSuccess',
      'TwoFAValidateFail',
      'TOFUFail',
      'MessageSentStatus',
      'ConversationUpdated',
      'MessagesUpdated',
      'ConversationsLoaded',
      'FilesUpdated',
      'ContactsUpdated',
      'SignOut',
      'TabChange',
      'SidebarToggle',
      'SwipeLeft',
      'SwipeRight',
      'NavigatedIn',
      'NavigatedOut',
      'NavigateBack',
      'NewMessageViewOpen',
      'NewMessageViewClose',
      'UploadFile',
      'AddContact',
      'TabBarShow',
      'TabBarHide',
      'SendCurrentMessage',
      'ShowFileSelect',
      'FilesSelected',
      'HardMenuButton',
      'HardBackButton',
      'Pause',
      'Resume'
    ];
    var callCount = 0;
    actions.forEach(function (action) {
      var subscribeFnName = 'on' + action;
      var actionFnName = action[0].toLowerCase() + action.substring(1);

      var subscribeFn = Peerio.Dispatcher[subscribeFnName];
      var actionFn = Peerio.Action[actionFnName];

      subscribeFn(function () { callCount++; });
      actionFn();
    });

    expect(callCount).toBe(actions.length);

  });
});