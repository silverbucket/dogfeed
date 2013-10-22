angular.module('ngRemoteStorage', []).

value('RSutil', {
  encode: function encode(string) {
    //console.log("rsutil encode: ", string);
    return encodeURIComponent(string);
    //return string;
  }
}).

factory('RS', ['$rootScope', '$q', '$timeout',
function ($rootScope, $q, $timeout) {

  var ready = false;

  function isConnected() {
    return remoteStorage.remote.connected;
  }

  remoteStorage.on('ready', function () {
    ready = true;
  });

  var queue = [];
  var setTimedCheck = false;

  var delay = 500;

  function callRS(job) {
    remoteStorage[job.module][job.func].apply(null, job.params).
      then(function (res) {
        $rootScope.$apply(function () {
          console.log('RS JOB COMPLETE: ', job);
          job.promise.resolve(res);
        });
      }, function (err) {
        $rootScope.$apply(function () {
          job.promise.reject(err);
        });
      });
  }

  (function processQueue() {
    if (isConnected() && (setTimedCheck)) {
      //console.log('RS connected, sending call');
      for (var i in queue) {
        var job = queue[i];
        try {
          callRS(job)
        } catch (e) {
          console.log('error : ',e);
          console.log(e.stack);
          var errmsg = (typeof e.toString === 'function') ? e.toString() : e;
          job.promise.reject(errmsg);
        }
      }
      setTimedCheck = false;
    } else {
      console.log('RS not connected yet, delaying calls ' + delay + 's');
      for (var i in queue) {
        if ((queue[i].failTimeout) &&
            (queue[i].failTimeout < delay)) {
          queue[i].promise.reject('timed out');
          queue.splice(i, 1);
        }
      }
      if (delay < 30000) {
        delay = delay + (delay + 500);
      }
      $timeout(processQueue, delay);
    }
  })();

  return {
    isConnected: isConnected,
    queue: function (module, func, params) {
      console.log('RS.queue(' + module + ', ' + func + ', params):', params);

      queue.push({
        module: module,
        func: func,
        params: params,
        promise: false,
        failTimeout: false
      });
      setTimedCheck = true;
    },
    call: function (module, func, params, failTimeout) {
      var defer = $q.defer();
      console.log('RS.call(' + module + ', ' + func + ', params):', params);

      if ((typeof params === 'object') &&
          (typeof params[0] === 'undefined')) {
        defer.reject('RS.call params must be an array');
      } else {
        // put request onto queue
        queue.push({
          module: module,
          func: func,
          params: params,
          promise: defer,
          failTimeout: failTimeout
        });
        // toggle timed checker
        setTimedCheck = true;
      }
      return defer.promise;
    }
  };
}]).


controller('remoteStorageCtrl',
[function () {
  //remoteStorage.util.silenceAllLoggers();
  //remoteStorage.util.unsilenceAllLoggers();
  remoteStorage.disableLog();

  remoteStorage.access.claim('sockethub', 'rw');
  remoteStorage.access.claim('rss', 'rw');
  remoteStorage.access.claim('articles', 'rw');
  remoteStorage.caching.disable('/sockethub/');
  remoteStorage.caching.disable('/rss/');
  remoteStorage.caching.disable('/articles/');
  remoteStorage.displayWidget('remotestorage-connect', {
    redirectUri: window.location.protocol + '//' + window.location.host + '/rscallback.html'
  });

  remoteStorage.sockethub.init();
  remoteStorage.rss.init();
}]);
