angular.module('ngRemoteStorage', []).

value('RSutil', {
  encode: function encode(string) {
    //console.log("rsutil encode: ", string);
    return encodeURIComponent(escape(string));
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

  return {
    isConnected: isConnected,
    call: function (module, func, params) {
      var defer = $q.defer();
      console.log('RS.call(' + module + ', ' + func + ', params):', params);

      if ((typeof params === 'object') &&
          (typeof params[0] === 'undefined')) {
        defer.reject('RS.call params must be an array');
      } else {

        var delay = 500;
        (function callRS() {
          if (isConnected()) {
            //console.log('RS connected, sending call');
            try {
              remoteStorage[module][func].apply(null, params).
                then(function (res) {
                  $rootScope.$apply(function () {
                    defer.resolve(res);
                  });
                }, function (err) {
                  $rootScope.$apply(function () {
                    defer.reject(err);
                  });
                });
            } catch (e) {
              //console.log('error : ',e);
              console.log(e.stack);
              defer.reject(e.toString());
            }
          } else {
            console.log('RS not connected yet, delaying call ' + delay + 's');
            if (delay < 30000) {
              delay = delay + (delay + 500);
            }
            $timeout(callRS, delay);
          }
        })();
      }
      return defer.promise;
    }
  };
}]).


controller('remoteStorageCtrl',
[function () {
  //remoteStorage.util.silenceAllLoggers();
  //remoteStorage.util.unsilenceAllLoggers();

  remoteStorage.access.claim('sockethub', 'rw');
  remoteStorage.access.claim('rss', 'rw');
  remoteStorage.access.claim('articles', 'rw');
  remoteStorage.caching.disable('/sockethub/');
  remoteStorage.displayWidget('remotestorage-connect', {
    redirectUri: window.location.protocol + '//' + window.location.host + '/rscallback.html'
  });

  remoteStorage.sockethub.init();
  remoteStorage.rss.init();
}]);
