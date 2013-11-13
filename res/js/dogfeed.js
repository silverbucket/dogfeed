angular.module('dogfeed', [
    'ngFeeds',
    'ngSockethubClient',
    'ngSockethubRemoteStorage',
    'ngRemoteStorage',
    'ngMessages',
    'ngRoute'
]).

/**
 * routes
 */
config(['$routeProvider', '$locationProvider',
function ($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true);
  $routeProvider.
    when('/', {
      templateUrl: "main.html"
    }).
    when('/settings/sockethub', {
      templateUrl: "sockethub-settings.html"
    }).
    when('/feeds/add', {
      templateUrl: '/res/js/feeds/feed-add.html.tpl'
    }).
    when('/feeds/edit/:feed', {
      templateUrl: '/res/js/feeds/feed-edit.html.tpl'
    }).
    when('/feeds/:feed', {
      templateUrl: 'main.html'
    }).
    when('/about', {
      templateUrl: 'about.html'
    }).
    otherwise({
      redirectTo: "/"
    });
}]).

run(['$rootScope', '$timeout',
function ($rootScope, $timeout) {
  $rootScope.delayed = false;
  $timeout(function () {
    // give the app a second or two to load before we determine if the user
    // is logged in or not.
    $rootScope.delayed = true;
  }, 3000);
}]).

/**
 * snap.js initialization
 */
run(['$rootScope',
function ($rootScope) {
  $rootScope.snapper = new Snap({
    element: document.getElementById('content'),
    disable: 'right',
    maxPosition: 220
  });

  $(window).on('resize', function () {
      $rootScope.isMobile = matchMedia('(max-width:1024px)').matches;
      $rootScope.isDesktop = !$rootScope.isMobile;
  });

  $(window).on('resize', function () {
    if ($rootScope.isMobile) {
      //console.log("ENABLE SNAPPER ");
      $rootScope.snapperDisabled = false;
      $rootScope.snapper.enable();
    } else {
      //console.log("DISABLE SNAPPER ");
      $rootScope.snapperDisabled = true;
      $rootScope.snapper.close();
      $rootScope.snapper.disable();
    }
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
 * messages config
 */
run(['MessagesConfig',
function (cfg) {
  cfg.timeout = 15000;
}]).

/**
 * get sockethub settings and try to connect
 */
run(['SockethubBootstrap',
function (SockethubBootstrap) {
  SockethubBootstrap.run({
    // default connection settings, if none found in remoteStorage
    host: 'silverbucket.net',
    port: '443',
    path: '/sockethub',
    tls: true,
    secret: '1234567890'
  });
}]).

/**
 * remoteStorage
 */
run(['$rootScope', 'RS', '$timeout',
function ($rootScope, RS, $timeout) {
  if (!RS.isConnected()) {
    $timeout(function () {
      if (!RS.isConnected()) {
        $rootScope.$broadcast('message', {message: 'remotestorage-connect', timeout: false});
      }
    }, 3000);
  }
}]).

/**
 * listeners/emitters
 */
run(['$rootScope', '$location',
function ($rootScope, $location) {
  $rootScope.$on('sockethubSettingsSaved', function() {
    $location.path('/');
  });
}]).

/**
 * filter: fromNow (date)
 */
filter('fromNow', [
function() {
  return function (dateString) {
    return new Date(dateString).toDateString(); ///moment(new Date(dateString)).fromNow();
  };
}]).

/**
 * filter: pagination
 */
filter('pagination', [
function() {
  var count = 0;
  var max = 3;
  return function (article) {
    console.log("pagination received: ", article);
    if (!article) { return false; }
    count = count + 1;
    if (count > 10) {
      console.log('pagination returned false');
      return false;
    }
    console.log('pagination returned article: ',article);
    return article;
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

  $scope.showFeedList = function () {
    if ($rootScope.snapper.state().state === "left") {
      $rootScope.snapper.close();
    } else {
      $rootScope.snapper.open('left');
    }
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
}]).

controller('mainCtrl', ['$scope', 'RS', 'SH', '$timeout', '$rootScope', '$routeParams', 'Feeds',
function ($scope, RS, SH, $timeout, $rootScope, $routeParams, Feeds) {
console.log("mainCtrl ROUTE PARAMS: ", $routeParams);
  $scope.isConnected = function () {
//console.log('isConnected: ['+RS.isConnected()+'] ['+SH.isConnected()+']');
    if ((RS.isConnected()) && (SH.isConnected())) {
      return true;
    } else {
      if (($routeParams.feed) && (SH.isConnected())) {
        return true;
      } else {
        return false;
      }
    }
  };

  $scope.isConnecting = function () {
//console.log('isConnecting: ['+RS.isConnected()+'] ['+SH.isConnected()+']');
    if ((RS.isConnecting()) || (SH.isConnecting())) {
      return true;
    } else {
      return false;
    }
  };

  $scope.delayed = function () {
    return $rootScope.delayed;
  };

  $scope.waitingForArticles = function () {
    if ((Feeds.data.articles.length <= 1) &&
        (Feeds.data.infoArray > 0)) {
      return true;
    } else {
      return false;
    }
  };

}]).

directive('loading', [
function () {
  return {
    restrict: 'E',
    templateUrl: 'loading.html'
  };
}]).

directive('welcome', [
function () {
  return {
    restrict: 'E',
    templateUrl: 'welcome.html'
  };
}]).

directive('about', [
function () {
  return {
    restrict: 'E',
    templateUrl: 'about.html'
  };
}]);
