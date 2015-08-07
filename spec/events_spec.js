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
      'LoginSuccess',
      'LoginFail'
    ];
    var callCount = 0;
    actions.forEach(function (action) {
      var subscribeFnName = 'on' + action;
      var actionFnName = action[0].toLowerCase() + action.substring(1);

      var subscribeFn = Peerio.Dispatcher[subscribeFnName];
      var actionFn = Peerio.Action[actionFnName];
      if (!subscribeFn) console.log('unknown action:', action);
      subscribeFn(function () { callCount++; });
      actionFn();
    });

    expect(callCount).toBe(actions.length);

  });
});