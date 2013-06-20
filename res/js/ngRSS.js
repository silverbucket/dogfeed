angular.module('ngRSS', ['ngRemoteStorage', 'ngSockethubClient']).


/**
 * settings service
 */
value('configHelper', {
  exists: function exists(config, cfg) {
    if (!cfg) {
      cfg = config;
    }

    for (var key in config) {
      if (!cfg[key]) {
        return false;
      }
    }
    return true;
  },
  set: function (config, cfg) {
    for (var key in cfg) {
      config[key] = cfg[key];
    }
    return config;
  }
}).

value('util', {
  isEmptyObject: function isEmptyObject(obj) {
    for(var prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        return false;
      }
    }
    return true;
  }
}).


///////////////////////////////////////////////////////////////////////////
//
// FACTORY
//
///////////////////////////////////////////////////////////////////////////


/**
 * Factory: RSS
 */
factory('RSS', ['$q', 'SH', 'configHelper', 'RS', 'RSutil', '$rootScope',
function ($q, SH, CH, RS, RSutil, $rootScope) {

  var config = {};
  var data = {
    articles: [],
    info: {}
  };
  var func = {};

  /****
   * CONFIG MANAGEMENT
   ********************/
  function exists(cfg) {
    return CH.exists(config, cfg);
  }

  func.setConfig = function set(cfg) {
    var defer = $q.defer();
    if (exists(cfg)) {
      if (cfg) {
        CH.set(config, cfg);
      }
      defer.resolve(config);
    } else {
      defer.reject('config not set correctly');
    }
    return defer.promise;
  };


  /****
   * FEED MANAGEMENT
   ******************/
  // grab whatever feeds exists in remoteStorage right away
  (function getFeedUrls() {
    RS.call('rss', 'getAll', ['']).then(function (urls) {
      for (var key in urls) {
        var url = urls[key].url;
        data.info[url] = urls[key]; // asign existing feed info to data struct
        func.fetchFeed(url); // fetch articles from sockethub
      }
    }, function (err) {
      console.log('error: unable to get feed list from remoteStorage: ', err);
    });
  })();

  // add a new feed to remoteStorage
  func.addFeed = function addFeed(obj) {
    var defer = $q.defer();
    RS.call('rss', 'add', [obj]).then(function (m) {
      console.log('feed added: ', obj);
      data.info[obj.url] = obj;
      func.fetchFeed(obj.url);
      defer.resolve(m);
    }, function (err) {
      defer.reject(err);
    });
    return defer.promise;
  };


  /****
   * FEED FETCHING
   ****************/
  // issue orders to fetch feeds from sockethub
  func.fetchFeed = function fetch(url) {
    var defer = $q.defer();
    var msg = {
      actor: {},
      target: [{}]
    };
    msg.target[0].address = url;
    msg.platform = 'rss';
    msg.verb = 'fetch';
    msg.actor.address = "rss";
    console.log("FETCH: ", msg);
    SH.submit(msg, 5000).then(defer.resolve, defer.reject);
    return defer.promise;
  };

  // detect when new articles are received from Sockethub
  SH.on('rss', 'message', function (m) {
    //console.log("RSS received message");
    var key = m.actor.address;
    if (!m.status) {
      $rootScope.$broadcast('message', {
        type: 'error',
        message: m.target[0].address + ' ' + m.object.message
      });
    }

    if (!data.info[key]) {
      console.log("*** RSS: key doesn't match a feed entry [ " + key +" ]: ", m);
      if (!m.status) {
        // actor not found and error detected, probably bad feed
        var t_key = m.target[0].address;
        //console.log('CHECKING: [tkey:' + t_key + '] data.info: ', data.info);
        if (data.info[t_key]) {
          console.log('PROBLEM FEED SETTINGS:', data.info[t_key]);
          data.info[t_key]['loaded'] = true;
          data.info[t_key]['error'] = true;
          data.info[t_key]['errorMsg'] = m.object.message;
        }
      }
    } else if (data.info[key].name !== m.actor.name) {
      data.info[key]['name'] = m.actor.name;
      func.addFeed(data.info[key]);
      data.info[key]['loaded'] = true;
    } else {
      //console.log("*** Names already match: " + m.actor.name);
      data.info[key]['loaded'] = true;
    }

    if (m.status) {
      console.log('adding: ',m);
      data.articles.push(m);
    }
  });


  return {
    config: config,
    data: data,
    func: func
  };
}]).




///////////////////////////////////////////////////////////////////////////
//
// CONTROLLERS
//
///////////////////////////////////////////////////////////////////////////


/**
 * controller: addFeedCtrl
 */
controller('addFeedCtrl',
['$scope', 'RSS', '$rootScope',
function ($scope, RSS, $rootScope) {
  $scope.url = '';
  $scope.adding = false;

  $scope.add = function (url) {
    $scope.adding = true;

    var obj = {
      url: url,
      name: url,
      cache_articles: 20,
      last_fetched: new Date().getTime()
    };

    RSS.func.addFeed(obj).then(function (m) {
      console.log('rss feed url saved!: ', m);
      $rootScope.$broadcast('closeModalAddFeed');
      $scope.adding = false;
      $rootScope.$broadcast('message', {type: 'success', message: 'RSS feed added: '+obj.url});
    }, function (err) {
      console.log('rss feed url save failed!: ', err);
      $rootScope.$broadcast('message', {type: 'error', message: err.message});
    });
  };

}]).


/**
 * controller: feedCtrl
 */
controller('feedCtrl',
['$scope', 'RSS', 'util', '$rootScope',
function ($scope, RSS, util, $rootScope) {

  $scope.model = {};
  $scope.model.feeds = RSS.data;
  $scope.model.message = '';
  $scope.model.loading = true;
  $scope.model.feeds['current'] = {
    name: '',
    url: ''
  };

  $scope.switchFeed = function (url) {
    $scope.model.feeds['current'] = RSS.data.info[url];
  };

  // display friendly message when no feeds are loaded
  if (util.isEmptyObject($scope.model.feeds.info)) {
    $scope.model.message = "loading feed list...";
  }

  $scope.$watch('$scope.model.feeds.info', function (newVal, oldVal) {
    if (!util.isEmptyObject($scope.model.feeds.info)) {
      $scope.model.message = '';
    } else {
      $scope.model.message = "no feeds yet, add some!";
    }
  });

  $rootScope.$on('SockethubConnectFailed', function (event, e) {
    $rootScope.$broadcast('message', {
      message: e.message,
      type: 'error',
      timeout: false
    });
    $scope.model.loading = true;
  });
}]).




///////////////////////////////////////////////////////////////////////////
//
// DIRECTIVES
//
///////////////////////////////////////////////////////////////////////////



/**
 * directive: feedList
 */
directive('feedList', [
function () {
  return {
    restrict: 'E',
    scope: {
      'feeds': '='
    },
    template: '<h4 ng-transclude></h4>' +
              '<span>{{ message }}<span>' +
              '<ul class="nav nav-list" ng-controller="feedCtrl">' +
              '  <li ng-repeat="f in feeds.info"' +
              '      data-toggle="tooltip" ' +
              '      title="{{ f.url }}"' +
              '      ng-click="switchFeed(f.url)"' +
              '      ng-class="{active: model.feeds.current.url == f.url, error: f.error, loading: !f.loaded}">' +
              '    <a href="" ng-class="{error: f.error}">' +
              '      <i class="status" ' +
              '         ng-class="{\'loading-icon-small\': !f.loaded}">' +
              '      </i><span>{{ f.name }}</span>' +
              '    </a>' +
              '  </li>' +
              '</ul>',
    transclude: true
  };
}]).


/**
 * directive: articles
 */
directive('articles', [
function () {
  return {
    restrict: 'E',
    scope: {
      'feeds': '='
    },
    template: '<h4>{{ feeds.current.name }}</h4>' +
              '<div class="well" ng-repeat="a in feeds.articles | orderBy:a.object.date">' +
              '  <h2>{{ a.object.title }}</h2>' +
              '  <p>feed: <i>{{ a.actor.name }}</i></p>' +
              '  <p>date: <i>{{ a.object.date | date }}</i></p>' +
              '  <p>article link: <i><a target="_blank" href="{{ a.object.link }}">{{ a.object.link }}</a><i></p>' +
              '  <div data-brief data-ng-bind-html-unsafe="a.object.brief_html"></div>' +
              '</div>'
  };
}]);