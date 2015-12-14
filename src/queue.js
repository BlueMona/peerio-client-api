/**
 * Peerio specific queued task execution module.
 * - It starts in paused state
 * - You can start/pause at any time
 * - When paused, only tasks added after that will be placed on hold, existing queue will run to end
 */

(function (root) {
    'use strict';

    root.Queue = function () {

        var waitQueue = [];
        var runQueue = [];
        var paused = true;

        /**
         * Adds task to queue
         * @param {function} task - will be executed with `this === null`
         * @param [arg] - argument to pass to task
         */
        function add(task, arg) {
            if (!paused) {
                runQueue.push([task, arg]);
                if (runQueue.length < 2) tick();
            } else
                waitQueue.push([task, arg]);
        }

        function pause() {
            paused = true;
        }

        function resume() {
            if (waitQueue.length > 0) {
                runQueue = runQueue.concat(waitQueue);
                waitQueue = [];
            }
            paused = false;
            tick();
        }

        function tick() {
            if (runQueue.length === 0) return;
            var task = runQueue.shift();
            // it's important to schedule next tick before executing task
            // because if current task throws, next one will still run
            setTimeout(tick, 0);
            task[0].call(null, task[1]);
        }


        function getQueueLength() {
            return runQueue.length + waitQueue.length;
        }

        var ret = {};
        ret.add = add.bind(ret);
        ret.pause = pause.bind(ret);
        ret.resume = resume.bind(ret);
        ret.getQueueLength = getQueueLength.bind(ret);

        return ret;
    };

})(this);