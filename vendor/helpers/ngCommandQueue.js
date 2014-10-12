/**
 * an abstraction for queueing method calls to other modules.
 *
 * use cases are:
 *
 *   * throttling calls to a certain operation
 *   * queueing websocket or http commands until a condition is met
 */
angular.module('ngCommandQueue', []).

factory('cQueue', ['$q', '$timeout',
function ($q, $timeout) {


  function cq(executeFunc, DEBUG) {
    /**
     * Variable: queue
     *
     * example structure:
     * {
     *   methods: (array)   // example: ['feeds', 'add']
     *   params: (array),
     *   condition: (function),
     *   defer: (object),
     *   timeout: (number)
     * }
     */
    var queue = [];
    var setTimedCheck = false;
    var interval = 1000;
    var throttle = 250;

    function propertyCheck(e) {
      var defer = $q.defer();
      try {
        if ((typeof e.methods !== 'object') ||
            (typeof e.methods[0] === 'undefined')) {
          console.error('methods property must be an array, indicating function order from left to right');
          defer.reject();
        } else if ((typeof e.params !== 'object') ||
                   (typeof e.params[0] === 'undefined')) {
          console.error('params property must be an array, indicating parameter order from left to right');
          defer.reject();
        } else if (typeof e.condition !== 'function') {
          e.condition = function () { return true; };
        } else if (typeof e.defer !== 'object') {
          e.defer = false;
        } else if (typeof e.timeout !== 'number') {
          e.timeout = 0;
        }
        e.age = 0;
        defer.resolve(e);
      } catch (error) {
        defer.reject(error);
      }
      return defer.promise;
    }

    function pushToQueue(e) {
      return propertyCheck(e).then(function (e) {
        if (DEBUG) { console.log('adding to queue: '+e.methods.join(' - ')); }
        e.id = Math.random(0, 9) * 100 / Math.random(0, 9);
        queue.push(e);
        setTimedCheck = true;
      });
    }

    function procSingleEntry() {
      if (queue.length <= 0) {
        setTimedCheck = false;
        return;
      }

      for (var i in queue) {
        // get entry off queue;
        var e = queue[i];
        if (!e.condition()) {
          if (DEBUG) { console.log(' procSingleEntry, condition NOT met. ',queue[i]); }
          break;
        }
        if (DEBUG) { console.log(' procSingleEntry, condition met ['+queue[i].id+']. ',queue[i]); }
        queue.splice(i, 1);
        try {
          executeFunc(e);
        } catch (error) {
          console.log('error : ', error);
          console.log('stack : ', error.stack);
          e.defer.reject(error);
        }
        break;
      }
      return;
    }

    (function procNextTick() {
      var i = 0;
      if (setTimedCheck) {
        // process a single entry from the queue every 'throttle' ms
        for (i in queue) {
          if ((queue[i].timeout !== 0) &&
              (queue[i].timeout < queue[i].age)) {
            if (DEBUG) { console.log('timing out ' + queue[i].methods.join('] [')); }
            queue[i].defer.reject('timed out');
            queue.splice(i, 1);
          } else {
            queue[i].age = queue[i].age + interval;
          }
        }
        $timeout(procSingleEntry, throttle);
      }

      $timeout(procNextTick, interval);
    })();

    return {
      add: pushToQueue
    };
  }

  return {
    init: function (executeFunc, DEBUG) {
      if (typeof executeFunc !== 'function') {
        throw new Error('cQueue init must pass a function to call when an entry from the queue is ready. The function should take the queue object as its first param');
      }
      return new cq(executeFunc, DEBUG);
    }
  };
}]);