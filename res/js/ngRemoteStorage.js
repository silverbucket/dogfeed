angular.module('ngRemoteStorage', ['ngCommandQueue']).

value('RSutil', {
  encode: function encode(string) {
    //console.log("rsutil encode: ", string);
    return encodeURIComponent(string);
    //return string;
  }
}).

factory('RS', ['$rootScope', '$q', '$timeout', 'cQueue',
function ($rootScope, $q, $timeout, cQueue) {

  var ready = false;

  function isConnected() {
    return remoteStorage.remote.connected;
  }

  remoteStorage.on('ready', function () {
    ready = true;
  });


  function callRS(job) {
    console.log('callRS:', job);
    remoteStorage[job.methods[0]][job.methods[1]].apply(null, job.params).
      then(function (res) {
        $rootScope.$apply(function () {
          if (job.defer) {
            job.defer.resolve(res);
          }
        });
      }, function (err) {
        $rootScope.$apply(function () {
          if (job.defer) {
            job.defer.reject(err);
          } else {
            throw new Error(err);
          }

        });
      });
  }

  var queue = cQueue.init(callRS);

  return {
    isConnected: isConnected,
    queue: function (module, func, params) {
      console.log('RS.queue(' + module + ', ' + func + ', params):', params);
      queue.add({
        methods: [module, func],
        params: params,
        defer: false,
        timeout: 0,
        condition: isConnected
      });
    },
    call: function (module, func, params, failTimeout) {
      var defer = $q.defer();
      console.log('RS.call(' + module + ', ' + func + ', params):', params);
      if ((typeof params === 'object') &&
          (typeof params[0] === 'undefined')) {
        defer.reject('RS.call params must be an array');
      } else {
        // put request onto queue
        queue.add({
          methods: [module, func],
          params: params,
          defer: defer,
          timeout: failTimeout,
          condition: isConnected
        });
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
