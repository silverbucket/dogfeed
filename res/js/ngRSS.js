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



run(['$routeParams', '$rootScope', 'RSS',
function ($routeParams, $rootScope, RSS) {

  $rootScope.feeds = RSS.data;

  if ($routeParams.feed) {
    // if we have a url as a param, we try to fetch it
    $rootScope.$broadcast('message', {
      message: 'attempting to fetch feed from '+$routeParams.feed,
      type: 'info'
    });
    $rootScope.selectedFeed = $routeParams.feed;
    RSS.func.fetchFeed($routeParams.feed);
  }
}]).







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
    info: {},
    infoArray: []
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
   * ARTICLE MANAGEMENT
   *********************/
  // update or create an article entry on remoteStorage
  func.updateArticle = function updateArticle(obj) {
    var defer = $q.defer();
    var s_obj = {
      link: obj.object.link,
      title: obj.object.title,
      date: obj.object.date,
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
   * FEED MANAGEMENT
   ******************/
  // grab whatever feeds exists in remoteStorage right away
  (function getFeedUrls() {
    RS.call('rss', 'getAll', ['']).then(function (urls) {
      console.log('RSS: got feed urls from remoteStorage ', urls);
      for (var key in urls) {
        if ((!urls[key]) || (typeof urls[key].url === 'undefined')) {
          console.log('ERROR processing url['+key+']: ', urls[key]);
        } else {
          var url = urls[key].url;
          urls[key].unread = 0;
          func.fetchFeed(urls[key].url); // asign existing feed info to data struct
        }
      }
    }, function (err) {
      console.log('error: unable to get feed list from remoteStorage: ', err);
      $rootScope.$broadcast('message', {
        message: 'unable to get feed list from remotestorage',
        type: 'error',
        timeout: false
      });
    });
  })();

  /**
   * Function: addFeed
   *
   * take a record from sockethub and creates a feed entry, queueing to store
   * in rs
   *
   * Parameters:
   *
   *   m - article object recevied from sockethub
   *
   */
  function addFeed (m) {
    var obj = {
      url: m.actor.address,
      name: m.actor.name,
      cache_articles: 20,
      last_fetched: new Date().getTime(),
      unread: 0
    };
    data.info[obj.url] = obj;
    data.infoArray.push(obj);
    RS.queue('rss', 'add', [obj]);
  }

  /**
   * Function: updateFeed
   *
   * update feed with the passed in feed object
   *
   * Parameters:
   *
   *   obj - feed object (remotestorage format)
   */
  func.updateFeed = function (obj) {
    var defer = $q.defer();
    RS.call('rss', 'add', [obj]).then(function (m) {
      //console.log('feed updated: ', obj);
      data.info[obj.url] = obj;
      defer.resolve(m);
    }, function (err) {
      defer.reject(err);
    });
    return defer.promise;
  };

  /**
   * Function: removeFeed
   *
   * remove a feed from the feed lists and remotestorage
   *
   * Parameters:
   *
   *   url - feed url
   */
  func.removeFeed = function (url) {
    var defer = $q.defer();
    RS.call('rss', 'remove', [url]).then(function (m) {
      delete data.info[url];
      for (var i = 0, len = data.infoArray.length; i < len; i = i + 1) {
        if ((data.infoArray[i]) && (data.infoArray[i].url === url)) {
          //console.log('removing from list: ',data.infoArray[i]);
          data.infoArray.splice(i, 1);
          break;
        }
      }
      console.log('articles count: '+data.articles.length);
      for (i = 0, len = data.articles.length; i < len; i = i + 1) {
        if ((data.articles[i]) && (data.articles[i].actor.address === url)) {
          //console.log('removing article from list: ',data.articles[i]);
          data.articles.splice(i, 1);
        }
      }
      console.log('articles count: '+data.articles.length);
      console.log('feed removed: ', url);
      defer.resolve(m);
    }, function (err) {
      defer.reject(err);
    });
    return defer.promise;
  };


  /****
   * FEED FETCHING
   ****************/
  var feedsTried = {};
  // issue orders to fetch feeds from sockethub
  func.fetchFeed = function fetch(url) {
    var match = false;
    for (var i = 0, len = data.infoArray.length; i < len; i = i + 1) {
      if ((data.infoArray[i]) && (data.infoArray[i].url === url)) {
        match = true;
        break;
      }
    }
    if ((match) || (feedsTried[url])) {
      return;
    }
    feedsTried[url] = true;

    var msg = {
      verb: 'fetch',
      platform: 'rss',
      actor: {
        address: 'rss'
      },
      target: [{
        address: url
      }]
    };
    console.log("FETCH: ", msg);
    SH.submit.call(msg).then(function (o) {
      data.info[url]['loaded'] = true;
    }, function (e) {
      $rootScope.$broadcast('message', {
        message: 'failed fetching feed: '+e,
        type: 'error'
      });
    });
  };


  //
  //
  // detect when new articles are received from Sockethub
  SH.on('rss', 'message', function (m) {
    console.log("RSS received message ",m);
    var key = m.actor.address;
    if (!m.status) {
      console.log('received error message from sockethub: ', m);
      $rootScope.$broadcast('message', {
        type: 'error',
        message: m.target[0].address + ' ' + m.message
      });
    }

    if (!data.info[key]) {
      console.log('#### - adding to data.info: ',m);
      addFeed(m);
    } else if ((!data.info[key].name) || (data.info[key].name === data.info[key].url)) {
      console.log('#### - updating name: ',m);
      data.info[key]['name'] = m.actor.name;
    } else {
      console.log('#### - neither here nor there: ',m);
    }

    if (!m.object.read) {
      m.object.read = false;
      data.info[key].unread = (typeof data.info[key].unread === "number") ? data.info[key].unread + 1 : 1;
    }

    data.articles.push(m);
    if (m.status) {
      //console.log('adding article: ', m);
      //console.log('ID: ', id);
      RS.call('articles', 'getByUrl', [m.object.link]).then(function (a) {
        if (a) {
          //console.log('ARTICLE FETCH from RS: ', a);
          m.object.read = (a.read) ? a.read : false;
        }

        if (m.object.read) {
          // this article is read, subtract from total
          data.info[key].unread = (typeof data.info[key].unread === "number") ? data.info[key].unread - 1 : 0;
        }

      }, function (e) {
        console.log("ARTICLE FETCH ERROR: ", e);
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
['$scope', 'RSS',
function ($scope, RSS) {
  $scope.adding = false;

  $scope.add = function (url) {
    $scope.adding = true;
    RSS.func.fetchFeed(url);
    $scope.adding = false;
  };

}]).


/**
 * controller: feedSettingsCtrl
 */
controller('feedSettingsCtrl',
['$scope', 'RSS',
function ($scope, RSS) {
  $scope.saving = false;

  $scope.saveFeedSettings = function (feed) {
    $scope.saving = true;
    RSS.func.updateFeed(feed).then(function () {
      $("#modalFeedSettings").modal('hide');
      $rootScope.$broadcast('message', {type: 'success', message: 'updated feed ' + url});
      $scope.saving = false;
    }, function (err) {
      console.log('rss feed update failed!: ', err);
      $rootScope.$broadcast('message', {type: 'error', message: err.message});
      $("#modalFeedSettings").modal('hide');
      $scope.saving = false;
    });
  };

  $scope.cancelFeedSettings = function () {
    $("#modalFeedSettings").modal('hide');
    $scope.model.feeds.info[$scope.feeds.edit].name = $scope.model.feeds._editName;
    $scope.saving = false;
  };


}]).


/**
 * controller: feedCtrl
 */
controller('feedCtrl',
['$scope', 'RSS', 'util', '$rootScope', '$timeout',
function ($scope, RSS, util, $rootScope, $timeout) {
  console.log('--- feedCtrl');
  $scope.model = {
    settings: {
      showRead: true
    }
  };
  $scope.saving = false;

  $rootScope.feeds.current = {
    name: '',
    indexes: []
  };
  $rootScope.feeds.edit = {
    name: '',
    url: '',
    origName: ''
  };


  $scope.isSelected = function (url, inclusive) {
    if ($rootScope.feeds.current.indexes.length === 0) {
      if ((inclusive) || (!url)) {
        return true;
      } else {
        return false;
      }
    } else {
      for (var i = 0, num = $scope.model.feeds.current.indexes.length; i < num; i = i + 1) {
        if ($rootScope.feeds.current.indexes[i] === url) {
          return true;
        }
      }
    }
    return false;
  };

  $scope.isShowable = function (feedUrl, isRead, settings) {
    if (!$scope.isSelected(feedUrl, true)) {
      return false;
    } else if (isRead) {
      if (settings.showRead) {
        return true;
      } else {
        return false;
      }
    }
    return true;
  };

  // returns true if current selection is empty (has no unread articles)
  $scope.currentIsEmpty = function (settings) {
    //console.log('CALLED: ', settings);
    if (!$rootScope.feeds.current.name) {
      return false;
    }
    for (var i = 0, num = $rootScope.feeds.current.indexes.length; i < num; i = i + 1) {
      //console.log('checking '+$scope.model.feeds.current.indexes[i], $scope.model.feeds.info[$scope.model.feeds.current.indexes[i]]);
      if (($rootScope.feeds.info[$scope.model.feeds.current.indexes[i]]) &&
          ($rootScope.feeds.info[$scope.model.feeds.current.indexes[i]].unread > 0)) {
        return false;
      }
      if (settings.showRead) {
        return false;
      }
    }
    return true;
  };

  $scope.switchFeed = function (url, error) {
    console.log('SWITCH FEED: '+url);
    if (error) { return false; }
    if (!url) {
      $scope.model.feeds.current.name = '';
      $scope.model.feeds.current.indexes.length = 0;
    } else {
      $scope.model.feeds.current.name = RSS.data.info[url].name;
      $scope.model.feeds.current.indexes = [url];
    }
  };

  $scope.showFeedSettings = function (url) {
    console.log('showFeedSettings: '+url);
    if (!url) { return; }
    $rootScope.feeds.edit.url = url;
    $rootScope.feeds.edit.name = $rootScope.feeds.info[url].name;
    $rootScope.feeds.edit.origName = $rootScope.feeds.info[url].name;
    $("#modalFeedSettings").modal({
      show: true,
      keyboard: true,
      backdrop: true
    });
  };

  $scope.deleteFeed = function (url) {
    $scope.saving = true;
    RSS.func.removeFeed(url).then(function () {
      $("#modalFeedSettings").modal('hide');
      $rootScope.$broadcast('message', {type: 'success', message: 'deleted feed '+url});
      $scope.saving = false;
      if ($scope.isSelected(url)) {
        $scope.switchFeed(url);
      }
    }, function (err) {
      console.log('error removing rss feed!: ', err);
      $rootScope.$broadcast('message', {type: 'error', message: err.message});
      $("#modalFeedSettings").modal('hide');
      $scope.saving = false;
    });
  };

  $scope.markRead = function (url, val) {
    //console.log('markRead Called! val:'+val);
    for (var i = 0, num = $scope.model.feeds.articles.length; i < num; i = i + 1) {
      //console.log('A.link: ' + $scope.model.feeds.articles[i].object.link + ' url: '+url);
      if ($scope.model.feeds.articles[i].object.link === url) {
        //console.log('R:'+$scope.model.feeds.articles[i].object.read+' v:'+val);
        if ((!$scope.model.feeds.articles[i].object.read) && (val)) {
          //console.log('subtracting 1 from : '+ $scope.model.feeds.info[$scope.model.feeds.articles[i].actor.address].unread);
          $scope.model.feeds.info[$scope.model.feeds.articles[i].actor.address].unread =
              $scope.model.feeds.info[$scope.model.feeds.articles[i].actor.address].unread - 1;
        } else if (($scope.model.feeds.articles[i].object.read) && (!val)) {
          //console.log('adding 1 to : '+ $scope.model.feeds.info[$scope.model.feeds.articles[i].actor.address].unread);
          $scope.model.feeds.info[$scope.model.feeds.articles[i].actor.address].unread =
              $scope.model.feeds.info[$scope.model.feeds.articles[i].actor.address].unread + 1;
        }
        $scope.model.feeds.articles[i].object.read = val;
        RSS.func.updateArticle($scope.model.feeds.articles[i]);
        return;
      }
    }
  };


  $rootScope.$on('SockethubConnectFailed', function (event, e) {
    console.log('Sockethub connect failed! ', e);
    $rootScope.$broadcast('message', {
      message: e.message,
      type: 'error',
      timeout: false
    });
    //$scope.model.loading = true;
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
      'feeds': '=',
      'settings': '='
    },
    template: '<h4 ng-transclude></h4>' +
              '<ul class="nav nav-list nav-pills nav-stacked">' +
              '  <li ng-click="switchFeed()"' +
              '      ng-class="{active: isSelected(), \'all-feeds\': true}">' +
              '      <span class="glyphicon glyphicon-globe"></span> <span>All Items</span>' +
              '  </li>' +
              '  <li ng-show="feeds.infoArray.length == 0"><span>no feeds yet, add some!</span></li>' +
              '  <li ng-repeat="f in feeds.infoArray | orderBy: \'name\'"' +
              '      data-toggle="tooltip" ' +
              '      ng-init="showSettings = false" ' +
              '      ng-mouseover="showSettings = true" ' +
              '      ng-mouseleave="showSettings = false" ' +
              '      title="{{ f.url }}" ' +
              '      ng-click="switchFeed(f.url, f.error)" ' +
              '      ng-class="{\'feed-entry\': true, active: isSelected(f.url), error: f.error, loading: !f.loaded}">' +
              '    <span ng-click="showFeedSettings(f.url)"' +
              '          ng-class="{glyphicon: f.loaded, \'glyphicon-cog\': (f.loaded || f.error) && showSettings, settings: true, \'icon-loading-small\': !f.loaded}"></span>' +
              '    <span class="unread-count" ng-bind="f.unread"></span>' +
              '    <span ng-bind="f.name"></span>' +
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
      'feeds': '=',
      'settings': '='
    },
    template: //'<h4><span ng-bind="feeds.current.name"></span></h4>' +
              '<div class="article-text" ng-show="feeds.articles.length > 0 && currentIsEmpty(settings)"><p>no articles {{feeds.articles.length}} - {{currentIsEmpty(settings)}}</p></div>' +
              '<div ng-repeat="a in (filteredItems = (feeds.articles | orderBy: \'object.date\':true))"' +
              '     ng-controller="feedCtrl"' +
              '     ng-class="{read: a.object.read, article: true}"' +
              '     ng-show="isShowable(a.actor.address, a.object.read, settings)">' +
              '  <div class="mark-unread" ng-show="a.object.read" ng-click="markRead(a.object.link, false)">Mark Unread</div>' +
              '  <div class="article-content" ng-click="markRead(a.object.link, true)">' +
              '    <div class="article-title">' +
              '      <a target="_blank" href="{{ a.object.link }}">' +
              '        <h2>{{ a.object.title }}</h2></a>' +
              '    </div>' +
              '    <p>feed: <i>{{ feeds.info[a.actor.address].name }}</i></p>' +
              '    <p rel="{{ a.object.date }}">date: <i>{{ a.object.date | fromNow}}</i></p>' +
              //'    <p>article link: <i><a target="_blank" href="{{ a.object.link }}">{{ a.object.link }}</a><i></p>' +
              '    <div class="article-body" data-ng-bind-html-unsafe="a.object.brief_html"></div>' +
              '  </div>' +
              '</div>',
    link: function (scope, element, attrs) {
      //console.log('#### LINK FUNCTION: scope: ', scope);
      //console.log('#### LINK FUNCTION: element: ', element);
      //console.log('#### LINK FUNCTION: attrs: ', attrs);

      /*scope.$watch(attrs.feeds, function (val) {
        console.log('WATCH attrs.feeds', val);
      });*/

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