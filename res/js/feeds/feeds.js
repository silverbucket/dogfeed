angular.module('ngFeeds', ['ngRemoteStorage', 'ngSockethubClient']).


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

run(['$routeParams', '$rootScope', 'Feeds',
function ($routeParams, $rootScope, Feeds) {

  $rootScope.feeds = Feeds.data;

}]).


///////////////////////////////////////////////////////////////////////////
//
// FACTORY
//
///////////////////////////////////////////////////////////////////////////

/**
 * Factory: Feeds
 */
factory('Feeds', ['$q', 'SH', 'configHelper', 'RS', '$rootScope',
function ($q, SH, CH, RS, $rootScope) {

  var config = {};
  var data = {
    articles: [],
    info: {},
    infoArray: [],
    groups: {},
    groupArray: []
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
    RS.call('feeds', 'getAll', ['']).then(function (urls) {
      console.log('Feeds: got feed urls from remoteStorage ', urls);
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
    RS.queue('feeds', 'add', [obj]);
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
    RS.call('feeds', 'add', [obj]).then(function (m) {
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
    RS.call('feeds', 'remove', [url]).then(function (m) {
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
    var defer = $q.defer();
    $rootScope.$broadcast('message', {type: 'info', message: 'attempting to fetch feed '+url});
    SH.submit.call(msg).then(function (o) {
      $rootScope.$broadcast('message', {type: 'success', message: 'feed added '+url});
      data.info[url]['loaded'] = true;
      defer.resolve();
    }, function (e) {
      console.log('failed fetch');
      $rootScope.$broadcast('message', {
        message: 'failed fetching feed: '+e,
        type: 'error'
      });
      defer.reject(e);
    });
    return defer.promise;
  };


  //
  //
  // detect when new articles are received from Sockethub
  SH.on('rss', 'message', function (m) {
    console.log("Feeds received message ",m);
    var key = m.actor.address;
    if (!m.status) {
      console.log('received error message from sockethub: ', m);
      $rootScope.$broadcast('message', {
        type: 'error',
        message: m.target[0].address + ' ' + m.message
      });
      return;
    }


    // check if the feed entry for this article exists yet, if not add it.
    // also check to update name.
    if (!data.info[key]) {
      console.log('#### - adding to data.info: ',m);
      addFeed(m);
    } else if ((!data.info[key].name) || (data.info[key].name === data.info[key].url)) {
      console.log('#### - updating name: ',m);
      data.info[key]['name'] = m.actor.name;
    }

    if (!m.object.read) {
      m.object.read = false;
      data.info[key].unread = (typeof data.info[key].unread === "number") ? data.info[key].unread + 1 : 1;
    }

    // add article to article list
    data.articles.push(m);

    // fetch article from remoteStorage if exists
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
['$scope', 'Feeds', '$location',
function ($scope, Feeds, $location) {
  $scope.adding = false;

  $scope.add = function (url) {
    $scope.adding = true;
    Feeds.func.fetchFeed(url).then(function () {
      $scope.adding = false;
      $location.path('/feed/'+url);
    }, function (e) {
      $scope.adding = false;
    });
  };

}]).

/**
 * controller: feedSettingsCtrl
 */
controller('feedSettingsCtrl',
['$scope', 'Feeds',
function ($scope, Feeds) {
  $scope.saving = false;

  $scope.saveFeedSettings = function (feed) {
    $scope.saving = true;
    Feeds.func.updateFeed(feed).then(function () {
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
['$scope', 'Feeds', '$rootScope', '$timeout', '$routeParams',
function ($scope, Feeds, $rootScope, $timeout, $routeParams) {
  console.log('--- feedCtrl');
  $scope.model = {
    settings: {
      showRead: true,  // show read articles or disappear them
      articlesPerPage: 10,  // number of articles to show per page
      displayCap: 5,  // current limit of articles to show (increments by articlesPerPage)
      displayed: {}  // index of displayed articles
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

  if ($routeParams.feed) {
    // if we have a url as a param, we try to fetch it
    $rootScope.$broadcast('message', {
      message: 'attempting to fetch feed from '+$routeParams.feed,
      type: 'info'
    });
    $rootScope.selectedFeed = $routeParams.feed;
    Feeds.func.fetchFeed($routeParams.feed);
  }

  $scope.deleteFeed = function (url) {
    $scope.saving = true;
    Feeds.func.removeFeed(url).then(function () {
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

value('isSelected', function ($scope, url, inclusive) {
  if ($scope.feeds.current.indexes.length === 0) {
    if ((inclusive) || (!url)) {
      return true;
    } else {
      return false;
    }
  } else {
    for (var i = 0, num = $scope.feeds.current.indexes.length; i < num; i = i + 1) {
      if ($scope.feeds.current.indexes[i] === url) {
        return true;
      }
    }
  }
  return false;
}).

/**
 * directive: feedList
 */
directive('feedList', ['isSelected',
function (isSelected) {
  function FeedListCtrl ($scope) {

    $scope.isSelected = function (url, inclusive) {
      return isSelected.apply(this, [$scope, url, inclusive]);
    };

    $scope.switchFeed = function (url, groupId, error) {
      console.log('SWITCH FEED: '+url, $scope.feeds);
      if (error) { return false; }
      if (!url) {
        $scope.feeds.current.name = '';
        $scope.feeds.current.indexes.length = 0;
      } else {
        $scope.feeds.current.name = $scope.feeds.info[url].name;
        $scope.feeds.current.indexes = [url];
      }
    };

    $scope.showFeedSettings = function (url) {
      console.log('showFeedSettings: '+url);
      if (!url) { return; }
      $scope.feeds.edit.url = url;
      $scope.feeds.edit.name = $scope.feeds.info[url].name;
      $scope.feeds.edit.origName = $scope.feeds.info[url].name;
      $("#modalFeedSettings").modal({
        show: true,
        keyboard: true,
        backdrop: true
      });
    };
  }

  return {
    restrict: 'E',
    scope: {
      'feeds': '=',
      'settings': '='
    },
    templateUrl: 'res/js/feeds/feed-list.html.tpl',
    controller: FeedListCtrl,
    transclude: true
  };
}]).

/**
 * directive: articles
 */
directive('articles', ['isSelected', 'Feeds',
function (isSelected, Feeds) {
  function ArticlesCtrl($scope) {

    $scope.isSelected = function (url, inclusive) {
      return isSelected.apply(this, [$scope, url, inclusive]);
    };

    // returns true if current selection is empty (has no unread articles)
    $scope.currentIsEmpty = function (settings) {
      //console.log('CALLED: ', settings);
      if (!$scope.feeds.current.name) {
        return false;
      }
      for (var i = 0, num = $scope.feeds.current.indexes.length; i < num; i = i + 1) {
        //console.log('checking '+$scope.model.feeds.current.indexes[i], $scope.model.feeds.info[$scope.model.feeds.current.indexes[i]]);
        if (($scope.feeds.info[$scope.feeds.current.indexes[i]]) &&
            ($scope.feeds.info[$scope.feeds.current.indexes[i]].unread > 0)) {
          return false;
        }
        if (settings.showRead) {
          return false;
        }
      }
      return true;
    };

    $scope.markRead = function (url, val) {
      //console.log('markRead Called! val:'+val);
      for (var i = 0, num = $scope.feeds.articles.length; i < num; i = i + 1) {
        //console.log('A.link: ' + $scope.feeds.articles[i].object.link + ' url: '+url);
        if ($scope.feeds.articles[i].object.link === url) {
          //console.log('R:'+$scope.feeds.articles[i].object.read+' v:'+val);
          if ((!$scope.feeds.articles[i].object.read) && (val)) {
            //console.log('subtracting 1 from : '+ $scope.feeds.info[$scope.feeds.articles[i].actor.address].unread);
            $scope.feeds.info[$scope.feeds.articles[i].actor.address].unread =
                $scope.feeds.info[$scope.feeds.articles[i].actor.address].unread - 1;
          } else if (($scope.feeds.articles[i].object.read) && (!val)) {
            //console.log('adding 1 to : '+ $scope.feeds.info[$scope.feeds.articles[i].actor.address].unread);
            $scope.feeds.info[$scope.feeds.articles[i].actor.address].unread =
                $scope.feeds.info[$scope.feeds.articles[i].actor.address].unread + 1;
          }
          $scope.feeds.articles[i].object.read = val;
          Feeds.func.updateArticle($scope.feeds.articles[i]);
          return;
        }
      }
    };

    $scope.isShowable = function (feedUrl, isRead, settings, articleUrl) {
      if (!$scope.isSelected(feedUrl, true)) {
        return false;
      }

      if (settings.displayed[articleUrl]) {
        return true;
      }

      if (Object.keys(settings.displayed).length >= settings.displayCap) {
        return false;
      }

      if (isRead) {
        if (settings.showRead) {
          settings.displayed[articleUrl] = true;
          return true;
        } else {
          return false;
        }
      } else {
        settings.displayed[articleUrl] = true;
        return true;
      }
    };
  }

  return {
    restrict: 'E',
    scope: {
      'feeds': '=',
      'settings': '='
    },
    controller: ArticlesCtrl,
    templateUrl: 'res/js/feeds/articles.html.tpl',
    link: function (scope, element, attrs) {
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