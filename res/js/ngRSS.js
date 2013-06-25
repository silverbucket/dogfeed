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
        data.info[url] = urls[key];  // asign existing feed info to data struct
        func.fetchFeed(url);  // fetch articles from sockethub
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
   * ARTICLE MANAGEMENT
   *********************/
  // update or create an article entry on remoteStorage
  func.updateArticle = function updateArticle(obj) {
    var defer = $q.defer();
    var s_obj = {
      link: obj.object.link,
      title: obj.object.title,
      date: obj.object.data,
      html: obj.object.html,
      text: obj.object.text,
      brief_html: obj.object.brief_html,
      brief_text: obj.object.brief_text,
      read: (obj.object.read) ? true : false,
      source_link: obj.actor.address,
      source_title: obj.actor.name
    };

    RS.call('articles', 'update', [s_obj]).then(function (m) {
      //console.log('article added: ', m);
      //data.info[obj.url] = obj;
      //func.fetchFeed(obj.url);
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

    if (!m.object.read) {
      m.object.read = false;
    }

    if (m.status) {
      console.log('adding: ', m);
      var id = RSutil.encode(m.object.link);
      console.log('ID: ', id);
      RS.call('articles', 'get', [id]).then(function (a) {
        if (a) {
          console.log('ARTICLE FETCH from RS: ', a);
          m.object.read = a.read;
        }

        if (!m.object.read) {
          data.info[key].unread = (typeof data.info[key].unread === "number") ? data.info[key].unread + 1 : 1;
        }
        data.articles.push(m);
      }, function (e) {
        console.log("ARTICL FETCH ERROR: ", e);
        data.articles.push(m);
      });
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
  $scope.model.feeds.current = {
    name: '',
    indexes: []
  };

  $scope.isSelected = function(url, inclusive) {
    if ($scope.model.feeds.current.indexes.length === 0) {
      if ((inclusive) || (!url)) {
        return true;
      } else {
        return false;
      }
    } else {
      for (var i = 0, num = $scope.model.feeds.current.indexes.length; i < num; i = i + 1) {
        if ($scope.model.feeds.current.indexes[i] === url) {
          return true;
        }
      }
    }
    return false;
  };


  $scope.switchFeed = function (url) {
    if (!url) {
      $scope.model.feeds.current.name = '';
      $scope.model.feeds.current.indexes = [];
    } else {
      $scope.model.feeds.current.name = RSS.data.info[url].name;
      $scope.model.feeds.current.indexes = [url];
    }
  };

  $scope.showFeedSettings = function (url) {
    $rootScope.$broadcast('showModalFeedSettings', {locked: false});
  };

  $scope.markRead = function (url) {
    console.log('markRead Called!');
    for (var i = 0, num = $scope.model.feeds.articles.length; i < num; i = i + 1) {
      //console.log('A.link: ' + $scope.model.feeds.articles[i].object.link + ' url: '+url);
      if ($scope.model.feeds.articles[i].object.link === url) {
        if (!$scope.model.feeds.articles[i].object.read) {
          //console.log('subtracting 1 from : '+ $scope.model.feeds.info[$scope.model.feeds.articles[i].actor.address].unread);
          $scope.model.feeds.info[$scope.model.feeds.articles[i].actor.address].unread =
              $scope.model.feeds.info[$scope.model.feeds.articles[i].actor.address].unread - 1;
          $scope.model.feeds.articles[i].object.read = true;
          RSS.func.updateArticle($scope.model.feeds.articles[i]);
        }
        return;
      }
    }
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

  $scope.$watch('$scope.model.feeds.articles', function (newVal, oldVal) {
    console.log('article changed! ', newVal, oldVal);
  });

  $rootScope.$on('SockethubConnectFailed', function (event, e) {
    $rootScope.$broadcast('message', {
      message: e.message,
      type: 'error',
      timeout: false
    });
    $scope.model.loading = true;
    $rootScope.$broadcast('showModalSockethubSettings', {locked: false});
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
              '  <li ng-click="switchFeed()"' +
              '       ng-class="{active: isSelected(), \'all-feeds\': true}">' +
              '    <a href="" >' +
              '      <i class="icon-globe"></i><span>All Items</span>' +
              '    </a>' +
              '  </li>' +
              '  <li ng-repeat="f in feeds.info"' +
              '      data-toggle="tooltip" ' +
              '      title="{{ f.url }}">' +
              '    <i ng-click="showFeedSettings(f.url)"' +
              '      ng-class="{status: true, \'icon-loading-small\': !f.loaded, \'icon-cog\': f.loaded}">' +
              '    </i>' +
              '    <div ng-click="switchFeed(f.url)"' +
              '         ng-class="{active: isSelected(f.url), error: f.error, loading: !f.loaded, \'feed-entry\': true}">' +
              '      <a href="" ng-class="{error: f.error}">' +
              '        <span>{{ f.name }}</span> <span class="unread-count">{{ f.unread }}</span>' +
              '      </a>' +
              '    </div>' +
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
              '<div ng-repeat="a in feeds.articles | orderBy:a.object.date"' +
              '     ng-controller="feedCtrl"' +
              '     ng-click="markRead(a.object.link)"' +
              '     ng-class="{well: true, hide: !isSelected(a.actor.address, true), unread: !a.object.read, article: true}" >' +
              '  <h2>{{ a.object.title }}</h2>' +
              '  <p>feed: <i>{{ a.actor.name }}</i></p>' +
              '  <p>date: <i>{{ a.object.date | date }}</i></p>' +
              '  <p>article link: <i><a target="_blank" href="{{ a.object.link }}">{{ a.object.link }}</a><i></p>' +
              '  <div class="article-body" data-ng-bind-html-unsafe="a.object.brief_html"></div>' +
              '</div>',
    link: function (scope, element, attrs) {
      //console.log('#### LINK FUNCTION: scope: ', scope);
      //console.log('#### LINK FUNCTION: element: ', element);
      //console.log('#### LINK FUNCTION: attrs: ', attrs);

      scope.$watch(attrs.feeds, function (val) {
        console.log('WATCH attrs.feeds', val);
      });

      var divs = document.getElementsByClassName('article');
      for (var i = 0, num = divs.length; i < num; i = i + 1) {
        // grab all of the links inside the div
        var links = divs[i].getElementsByTagName('a');
        // Loop through those links and attach the target attribute
        for (var j = 0, jnum = links.length; j < jnum; j = j + 1) {
          // the _blank will make the link open in new window
          links[j].setAttribute('target', '_blank');
        }
      }
    }
  };
}]);