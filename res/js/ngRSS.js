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




///////////////////////////////////////////////////////////////////////////
//
// FACTORY
//
///////////////////////////////////////////////////////////////////////////


/**
 * Factory: RSS
 */
factory('RSS', ['$rootScope', '$q', 'SH', 'configHelper', 'RS',
function ($rootScope, $q, SH, CH, RS) {

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
      console.log('getFeedUrls - got: ', urls);
      for (var key in urls) {
        data.info[key] = urls[key];
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
      data.info[obj.id] = obj;
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
  func.fetchFeed = function fetch(msg) {
    var defer = $q.defer();
    msg.platform = 'rss';
    msg.verb = 'fetch';
    console.log("FETCH: ", msg);
    SH.submit(msg, 5000).then(defer.resolve, defer.reject);
    return defer.promise;
  };

  // detect when new articles are received from Sockethub
  SH.on('rss', 'message', function (m) {
    console.log("RSS received message");
    data.articles.push(m);
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
['$scope', 'RSS',
function ($scope, RSS) {

  $scope.model = {};
  $scope.model.feeds = RSS.data;

  console.log('-- feeds.info: ', $scope.model.feeds.info);
  console.log('-- feeds.articles: ', $scope.model.feeds.articles);

}]).




///////////////////////////////////////////////////////////////////////////
//
// DIRECTIVES
//
///////////////////////////////////////////////////////////////////////////



/**
 * sdirective: articles
 */
directive('articles', [
function () {
  return {
    restrict: 'E',
    scope: {
      feeds: '='
    },
    template: '<div class="well" ng-repeat="f in articles">' +
              '  <h2>{{ f.object.title }}</h2>' +
              '  <p>feed: <i>{{ f.actor.address }}</i></p>' +
              '  <p>article link: <i><a target="_blank" href="{{ f.object.link }}">{{ f.object.link }}</a><i></p>' +
              '  <div data-brief data-ng-bind-html-unsafe="f.object.brief_html"></div>' +
              '</div>',
    link: function (scope) {
      console.log('ARTICLES: ', scope.feeds.articles);
      for (var i = 0, num = scope.feeds.articles.length; i < num; i = i + 1) {
        if (!scope.feeds.articles[i].object.html) {
          scope.feeds.articles[i].object.html = scope.feeds.articles[i].object.text;
        }
        if (!scope.feeds.articles[i].object.brief_html) {
          scope.feeds.articles[i].object.brief_html = scope.feeds.articles[i].object.brief_text;
        }
      }
    }
  };
}]).


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
              '<ul class="nav nav-list">' +
              '  <li ng-repeat="f in feeds.info" data-toggle="tooltip" title="{{ f.name }}">' +
              '    <a href="#/feed/{{ f.url | urlEncode }}">{{ f.name }}</a>' +
              '  </li>' +
              '</ul>',
    transclude: true,
    link: function (scope, element, attrs) {
      scope.uniqueFeeds = [];
      scope.message = '';
      console.log('**** info: ', scope.feeds.info);
      console.log('**** articles: ', scope.feeds.articles);

      /*var match = false, j = 0, i = 0;
      for (i = 0, num = scope.feeds.articles.length; i < num; i = i + 1) {
        match = false;
        for (j = 0, jnum = scope.uniqueFeeds.length; j < jnum; j = j + 1) {
          if (scope.uniqueFeeds[j].address === scope.feeds.articles[i].actor.address) {
            match = true;
            break;
          }
        }
        if (!match) {
          scope.uniqueFeeds.push({ address: scope.feeds.articles[i].actor.address,
                                   name: scope.feeds.articles[i].actor.name,
                                   description: scope.feeds.articles[i].actor.description,
                                   platform: scope.feeds.articles[i].platform });
        }
      }

      for (var key in scope.feeds.info) {
        match = false;
        for (j = 0, jnum = scope.uniqueFeeds.length; j < jnum; j = j + 1) {
          if (scope.uniqueFeeds[j].address === scope.feeds.info[key].url) {
            match = true;
            break;
          }
        }
        if (!match) {
          scope.uniqueFeeds.push({ address: scope.feeds.info[key].url,
                                   name: scope.feeds.info[key].name,
                                   description: '',
                                   platform: 'rss' });
        }
      }

      console.log('**** uniqueFeeds: ', scope.uniqueFeeds);

      if (scope.uniqueFeeds.length === 0) {
        scope.message = "no feeds yet, add some!";
      }*/
    }
  };
}]);



/*
              <div ng-controller="feedListCtrl">
                <h4>Feeds</h4>
                <ul class="nav nav-list">
                  <li data-ng-repeat="c in model.contacts | filter:c.name | orderBy:c.state" ng-class="feedSwitch('{{ c.address }}')">
                    <a href="#/feed/{{c.address}}">
                      <span class="state {{ c.state }}"></span>
                      <span class="username" data-toggle="tooltip" title="{{ c.address }}">{{ c.name }}</span>
                    </a>
                  </li>
                </ul>
              </div>
*/
/*
              <div class="span9 messages" ng-controller="articlesCtrl">
                <p>{{ model.currentName }} - {{ model.currentAddress }}</p>
                <div class="articles">
                  <div class="article well" ng-repeat="a in model.articles">
                    <div class="name"><small>{{ a.actor.name }}</small></div>
                    <div class="address"><small>{{ a.actor.address }}</small></div>
                    <div class="text"><p></p><p class="text-info">{{ a.object.brief_text }}<p></div>
                  </div>
                </div>
              </div>
*/