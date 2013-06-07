angular.module('ngRemoteStorage', []).
factory('RS', ['$rootScope', '$q', '$timeout',
function ($rootScope, $q, $timeout) {

  function isConnected() {
    if (remoteStorage.getBearerToken() === null) {
      return false;
    } else {
      return true;
    }
  }

  return {
    isConnected: isConnected,
    call: function (module, func, params) {
      var defer = $q.defer();
      console.log('RS.call(' + module + ', ' + func + ', params):', params);

      if ((typeof params === 'object') &&
          (typeof params[0] === 'undefined')) {
        defer.reject('RS.call params must be an array');
      } else {

        (function callRS() {
          if (isConnected()) {
            console.log('RS connected, sending call');
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
              console.log('error : ',e);
              defer.reject(e);
            }
          } else {
            console.log('RS not connected yet, delaying call 1s');
            $timeout(callRS, 1000);
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
  remoteStorage.util.unsilenceAllLoggers();

  remoteStorage.claimAccess({sockethub:'rw',rss:'rw'}).then(function () {
    remoteStorage.displayWidget('remotestorage-connect', {
      redirectUri: window.location.protocol + '//' + window.location.host + '/rscallback.html'
    });

    remoteStorage.sockethub.init();
    remoteStorage.rss.init();
  });

}]);
