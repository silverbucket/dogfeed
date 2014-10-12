  'use strict';

angular.module('ngRemoteStorage', ['ngCommandQueue']).

value('RemoteStorageConfig', {
  modules: []
}).

factory('RS', ['$rootScope', '$q', '$timeout', 'cQueue',
function ($rootScope, $q, $timeout, cQueue) {

  var ready = false;
  var connecting = false;

  function isConnected() {
    return remoteStorage.remote.connected;
  }

  function isConnecting() {
    return connecting;
  }

  remoteStorage.on('ready', function () {
    ready = true;
    connecting = false;
  });
  remoteStorage.on('connecting', function () {
    ready = false;
    connecting = true;
  });
  remoteStorage.on('authing', function () {
    connecting = true;
    ready = false;
  });
  remoteStorage.on('disconnected', function () {
    connecting = false;
    ready = true;
  });

  function callRS(job) {
    //console.log('callRS:', job);
    var p = remoteStorage[job.methods[0]][job.methods[1]].apply(null, job.params);
    p.then(function (res) {
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
          console.log('error during RS call: ', err);
          throw new Error();
        }
      });
    });
  }

  var queue = cQueue.init(callRS);

  return {
    isConnected: isConnected,
    isConnecting: isConnecting,
    queue: function (module, func, params) {
      //console.log('RS.queue(' + module + ', ' + func + ', params):', params);
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
      //console.log('RS.call(' + module + ', ' + func + ', params):', params);
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
          condition: function () { return true; } //isConnected
        });
      }
      return defer.promise;
    },
    on: function (module, event, func) {
      remoteStorage[module].on(event, func);
    }
  };
}]).


controller('remoteStorageCtrl',
['RemoteStorageConfig', '$scope',
function (RScfg, $scope) {
  remoteStorage.disableLog();

  $scope.$watch('RScfg.modules', function () {
    console.log('remoteStorageCtrl initializing modules: ', RScfg.modules);

    var mod, key;
    for (key in RScfg.modules) {
      mod = RScfg.modules[key];
      console.log('claim: '+mod[0]+ ' a: '+mod[1], mod);
      remoteStorage.access.claim(mod[0], mod[1]);
      // if ((mod[2]) && (typeof mod[2].cache === 'boolean') && (!mod[2].cache)) {
      //   // disable caching
      //   remoteStorage.caching.disable('/'+mod[0]+'/');
      //   if ((mod[2]) && (typeof mod[2].public === 'boolean') && (mod[2].public)) {
      //     remoteStorage.caching.enable('/public/'+mod[0]+'/');
      //   } else {
      //     // disable public caching by default
      //     remoteStorage.caching.disable('/public/'+mod[0]+'/');
      //   }
      // } else {
      //   // enable caching
      //   remoteStorage.caching.enable('/'+mod[0]+'/');
      //   if ((mod[2]) && (typeof mod[2].public === 'boolean') && (!mod[2].public)) {
      //     remoteStorage.caching.disable('/public/'+mod[0]+'/');
      //   } else {
      //     // enable public caching by default
      //     remoteStorage.caching.enable('/public/'+mod[0]+'/');
      //   }
      // }
    }

    remoteStorage.displayWidget('remotestorage-connect', {
      redirectUri: window.location.protocol + '//' + window.location.host + '/rscallback.html'
    });

    for (key in RScfg.modules) {
      mod = RScfg.modules[key];
      if ((remoteStorage[mod[0]]) && (typeof remoteStorage[mod[0]].init === 'function')) {
        remoteStorage[mod[0]].init();
      }
    }
  });

}]);
