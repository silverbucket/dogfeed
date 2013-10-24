angular.module('dogfeed', ['ngFeeds', 'ngSockethubClient', 'ngRemoteStorage', 'ngMessages']).

/**
 * routes
 */
config(['$routeProvider',
function ($routeProvider) {
  $routeProvider.
    when('/', {
      templateUrl: "feeds.html"
    }).
    otherwise({
      redirectTo: "/"
    });
}]).

/**
 * remotestorage config
 */
run(['RemoteStorageConfig',
function (RScfg) {
  RScfg.modules = [
    ['sockethub', 'rw', {'cache': false}],
    ['feeds', 'rw', {'cache': false}],
    ['articles', 'rw', {'cache': false}]
  ];
}]).

/**
 * get sockethub settings and try to connect
 */
run(['SockethubSettings', 'SH', 'RS', '$rootScope',  '$timeout',
function (settings, SH, RS, $rootScope, $timeout) {

  var default_cfg = {
    host: 'localhost',
    port: 10550,
    path: '/sockethub',
    tls: false,
    secret: '1234567890'
  };

  function sockethubConnect(cfg) {
    console.log('USING SH CONFIG: ', cfg);
    // connect to sockethub and register
    if (settings.save('conn', cfg)) {
      $rootScope.$broadcast('message', {
            message: 'attempting to connect to sockethub',
            type: 'info',
            timeout: false
      });
      SH.connect({register: true}).then(function () {
        $rootScope.$broadcast('message', {
              message: 'connected to sockethub',
              type: 'success',
              timeout: true
        });
      }, function (err) {
        console.log('error connecting to sockethub: ', err);
        $rootScope.$broadcast('SockethubConnectFailed', {message: err});
      });
    } else {
      $rootScope.$broadcast('message', {
            message: 'failed saving sockethub credentials',
            type: 'success',
            timeout: true
      });
    }
  }

  RS.call('sockethub', 'getConfig', ['dogfeed'], 3000).then(function (c) {
    console.log('GOT SH CONFIG: ', c);
    if ((typeof c !== 'object') || (typeof c.host !== 'string')) {
      //cfg = settings.conn;
      c = default_cfg;
    }
    sockethubConnect(c);
  }, function (err) {
    console.log("RS.call error: ",err);
    sockethubConnect(default_cfg);
  });
}]).


/**
 * remoteStorage
 */
run(['SockethubSettings', 'SH', '$rootScope', 'RS', '$timeout',
function (settings, SH, $rootScope, RS, $timeout) {
  if (!RS.isConnected()) {
    $timeout(function () {
      if (!RS.isConnected()) {
        $rootScope.$broadcast('message', {message: 'remotestorage-connect', timeout: false});
      }
    }, 6000);
  }
}]).

/**
 * modal window listeners/emitters
 */
run(['$rootScope',
function ($rootScope) {
  $rootScope.$on('showModalAddFeed', function(event, args) {
    backdrop_setting = true;
    if ((typeof args === 'object') && (typeof args.locked !== 'undefined')) {
      if (args.locked) {
        backdrop_setting = "static";
      }
    }
    $("#modalAddFeed").modal({
      show: true,
      keyboard: true,
      backdrop: backdrop_setting
    });
  });

  $rootScope.$on('closeModalAddFeed', function(event, args) {
    $("#modalAddFeed").modal('hide');
  });
}]).

/**
 * filter: urlEncode
 */
filter('urlEncode', [
function() {
  return function (text, length, end) {
    return encodeURIComponent(escape(text));
  };
}]).

/**
 * filger: fromNow (date)
 */
filter('fromNow', [
function() {
  return function(dateString) {
    return new Date(dateString).toDateString(); ///moment(new Date(dateString)).fromNow();
  };
}]).


///////////////////////////////////////////////////////////////////////////
//
// CONTROLLERS
//
///////////////////////////////////////////////////////////////////////////

/**
 * controller: titlebarCtrl
 */
controller('titlebarCtrl',
['$scope', '$rootScope', 'SockethubSettings', 'RS',
function ($scope, $rootScope, settings, RS) {
  $scope.addFeed = function () {
    $rootScope.$broadcast('showModalAddFeed', {locked: false});
  };
  $scope.sockethubSettings = function () {
    $rootScope.$broadcast('showModalSockethubSettings', {locked: false});
  };

  $scope.$watch('settings.connected', function (newVal, oldVal) {
    if (settings.connected) {
      settings.conn.port = Number(settings.conn.port);
      RS.call('sockethub', 'writeConfig', [settings.conn]).then(function () {
        console.log("Sockethub config saved to remoteStorage");
      }, function (err) {
        console.log('Failed saving Sockethub config to remoteStorage: ', err);
      });
    }
  });
}]);