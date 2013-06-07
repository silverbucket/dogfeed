angular.module('ngRemoteStorage', []).
factory('RS', ['$rootScope', '$q',
function ($rootScope, $q) {

  return {
    isConnected: function () {
      if (remoteStorage.getBearerToken() === null) {
        return false;
      } else {
        return true;
      }
    },
    call: function (module, func, params) {
      var defer = $q.defer();
      console.log('RS.call(' + module + ', ' + func + ', params):', params);

      if ((typeof params === 'object') &&
          (typeof params[0] === 'undefined')) {
        defer.reject('RS.call params must be an array');
      } else {
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
