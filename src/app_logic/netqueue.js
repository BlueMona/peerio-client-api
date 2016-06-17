/**
 * Peerio request offlineable 
 * depends on - Peerio.Net, Peerio.Dispatcher, Peerio.AppState, Peerio.TinyDB
 */


var Peerio = this.Peerio || {};
Peerio.NetQueue = {};

Peerio.NetQueue.init = function () {
    'use strict';

    var api = Peerio.NetQueue;
    var queueParseChunk = 10;
    var watcherTimeout = 500;
    api.arr = [];

    api.pushToSocket = function (name, data, options) {
        var item = {};
        item.promise = new Promise( (resolve, reject) => {
            item.resolve = resolve;
            item.reject = reject;
            item.executor = () => Peerio.Net.sendToSocket(name, data, options);
        });
        api.arr.push(item);

        if(Peerio.AppState.connected) 
            api.executeWatcher();

        return item.promise;
    };

    api.executeWatcher = function () {
        api.watcher = null;
        if(api.arr.length === 0)
            return;

        var chunk = Math.min(api.arr.length, queueParseChunk);
        // only do operations if we are connected
        if (Peerio.AppState.connected)
            for(i = 0; i < chunk; ++i) {
                // always take the first item
                var item = api.arr.splice(0, 1)[0];
                item.executor()
                    .then(r => item.resolve(r))
                    .catch(e => item.reject(e));
            }

        api.watcher = window.setTimeout(api.executeWatcher, watcherTimeout);
    };

    Peerio.Dispatcher.onConnected(api.executeWatcher);
};
