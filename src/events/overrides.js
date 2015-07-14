
// special cases for action dispatching
// following overrides make sure that Loading will be called only once and LoadingDone will be called
// only if no other Loading calls are active
(function () {
  var i = Peerio.Actions.internal = {};
  i.loadingCounter = 0;
  Peerio.Actions.loading = function () {
    if (++i.loadingCounter === 1) Peerio.Dispatcher.notify('Loading');
  };
  Peerio.Actions.loadingDone = function () {
    if (--i.loadingCounter === 0) Peerio.Dispatcher.notify('LoadingDone');
    i.loadingCounter = Math.max(i.loadingCounter, 0);
  };
}());
