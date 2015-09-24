/**
 * Event system specs
 */

describe('Events', function () {
  'use strict';

  it('makes sure standard actions work', function (done) {
    // This test is pretty dumb, and requires maintenance on every action list change.
    // But it prevents accidental action removal, which happens sometimes.
    var actions = [
      'SocketConnect',       // WebSocket reported successful connect
      'SocketDisconnect',    // WebSocket reported disconnected(and reconnecting) state
      'Authenticated',       // WebSocket connection was authenticated
      'Loading',             // Data transfer is in process
      'LoadingDone',         // Data transfer ended
      'LoginSuccess',        // login attempt succeeded
      'LoginFail',            // login attempt failed
      'MessageAdded',
      'ReceiptAdded',
      'ConversationsUpdated',
      'ContactsUpdated',
      'FilesUpdated'
    ];
    var callCount = actions.length;
    actions.forEach(function (action) {
      var subscribeFnName = 'on' + action;
      var actionFnName = action[0].toLowerCase() + action.substring(1);

      var subscribeFn = Peerio.Dispatcher[subscribeFnName];
      var actionFn = Peerio.Action[actionFnName];
      if (!subscribeFn) console.log('unknown action:', action);
      subscribeFn(function () {
        if(--callCount === 0) done();
      });
      actionFn();
    });

  });
});