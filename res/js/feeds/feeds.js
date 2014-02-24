angular.module('ngFeeds', ['ngRemoteStorage', 'ngSockethubClient', 'ngSanitize']).


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
factory('Feeds', ['$q', 'SH', 'configHelper', 'RS', '$rootScope', '$sce',
function ($q, SH, CH, RS, $rootScope, $sce) {

  var config = {};
  var data = {
    articles: [],
    info: {},
    infoArray: [],
    groups: {},
    groupArray: [],
    settings: {
      showRead: true,  // show read articles or disappear them
      articlesPerPage: 5,  // number of articles to show per page
      displayCap: 10,  // current limit of articles to show (increments by articlesPerPage)
      displayed: {}  // index of displayed articles
    },
    current: {
      name: '',
      indexes: []
    },
    edit: {
      name: '',
      url: '',
      origName: ''
    },
    state: {
      remoteStorage: false
    }
  };
  var func = {};

  function trustMedia (o) {
    // 'trust' media urls
    if (typeof o.object.media === 'object') {
      for (var i = 0, len = o.object.media.length; i < len; i = i + 1) {
        o.object.media[i].url = $sce.trustAsResourceUrl(o.object.media[i].url);
      }
    }
  }

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
  // update or create an article entry
  // - add to article indexes
  // - update on remoteStorage
  func.updateArticle = function (obj) {
    var s_obj = {
      link: obj.object.link,
      title: obj.object.title,
      date: obj.object.date || new Date().toUTCString(),
      datenum: Date.parse(obj.object.date) || 0,
      html: (obj.object.html) ? obj.object.html : (obj.object.brief_html) ? obj.object.brief_html : '',
      text: (obj.object.text) ? obj.object.text : (obj.object.brief_text) ? obj.object.brief_text : '',
      brief_html: obj.object.brief_html,
      brief_text: obj.object.brief_text,
      read: (obj.object.read) ? true : false,
      media: (obj.object.media) ? obj.object.media : [],
      source_link: (obj.actor.address) ? obj.actor.address : (obj.actor.url) ? obj.actor.url : '',
      source_title: obj.actor.name
    };

    var updated = false;
    for (var i = 0, len = data.articles.length; i < len; i = i + 1) {
      if ((data.articles[i]) && (data.articles[i].link === s_obj.link)) {
        data.articles[i] = s_obj;
        updated = true;
        break;
      }
    }

    if (!updated) {
      data.articles.push(s_obj);
    }

    return func.saveArticle(s_obj);
  };

  func.saveArticle = function (a) {
    var defer = $q.defer();
    RS.call('articles', 'update', [a]).then(function (m) {
      defer.resolve(a);
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
    setTimeout(function () {
      $rootScope.$broadcast('message', {
        message: 'fetching feeds from remoteStorage',
        title: 'Info',
        type: 'info',
        timeout: false
      });
    }, 1000);
    RS.call('feeds', 'getAll', ['']).then(function (feeds) {
      console.log('Feeds: got feed urls from remoteStorage ', feeds);
      for (var key in feeds) {
        if ((!feeds[key]) || ((typeof feeds[key].url === 'undefined') &&
                             (typeof feeds[key].address === 'undefined'))) {
          console.log('ERROR processing url['+key+']: ', feeds[key]);
        } else {
          feeds[key].url = (feeds[key].url) ? feeds[key].url : feeds[key].address;
          feeds[key].unread = 0;
          func.updateFeed(feeds[key]);
          func.fetchFeed(feeds[key].url); // asign existing feed info to data struct
        }
      }
      data.state.remoteStorage = true;
    }, function (err) {
      console.log('error: unable to get feed list from remoteStorage: ', err);
      $rootScope.$broadcast('message', {
        message: 'unable to get feed list from remotestorage',
        type: 'error',
        timeout: false
      });
      data.state.remoteStorage = true;
    }); 
  })();

  /**
   * Function: _saveFeed
   *
   * take a feed object, add to info & infoArray and queue to
   * store to remoteStorage.
   *
   * Parameters:
   *
   *   obj - feed object
   *
   */
  function _saveFeed (obj) {
    //console.log('********** ADDING:', obj);
    data.info[obj.url] = obj;
    _addToInfoArray(obj);
    RS.queue('feeds', 'add', [obj]);
  }

  //
  // find if object already exists in infoArray, if so overwrite with new object
  // else push it to stack.
  //
  function _addToInfoArray(obj) {
    // iterate through infoArray to see if this feed entry exists in it already
    var updated = false;
    for (var i = 0, len = data.infoArray.length; i < len; i = i + 1) {
      if ((data.infoArray[i]) && (data.infoArray[i].url === obj.url)) {
        data.infoArray[i] = obj;
        updated = true;
        break;
      }
    }
    if (!updated) {
      data.infoArray.push(obj);
    }
  }

  function _addArticle(a) {
    // clean urls for angularjs security
    trustMedia(a);
    var url = a.link || a.object.link;

    //
    // see if we can fetch article to get previously set read status
    return RS.call('articles', 'getByUrl', [url]).then(function (_a) {
      if ((typeof _a === 'object') && (typeof _a.read === 'boolean')) {
        //console.log('ARTICLE FETCH from RS: ', a);
        a.read = (_a.read) ? _a.read : false;

        if (a.read) {
          // this article is read, subtract from total
          data.info[key].unread = (typeof data.info[key].unread === "number") ? data.info[key].unread - 1 : 0;
        }
      }
      func.updateArticle(a);
    }, function (e) {
      //console.log("ARTICLE FETCH ERROR: ", e);
      func.updateArticle(a);
    });
  }

  
  func.getArticle = function (url) {
    var defer = $q.defer();

    for (var i = 0, len = data.articles.length; i < len; i = i + 1) {
      if (data.articles[i].link === url) {
        defer.resolve(data.articles[i]);
      }
    }

    RS.call('articles', 'getByUrl', [url]).then(function (a) {
      defer.resolve(a);
    }, function (err) {
      defer.reject(err);
    })

    return defer.promise;
  };


  /**
   * Function: updateFeed
   *
   * update feed with the passed in feed object
   *
   * Parameters:
   *
   *   obj - feed object (remotestorage or sockethub format)
   */
  func.updateFeed = function (obj) {
    //console.log('updateFeed called', obj);
    var updated = false;
    var defaults = {
      name: '',
      cache_articles: 20,
      last_fetched: new Date().getTime(),
      unread: 0,
      image: '',
      favicon: ''
    };

    if (data.info[obj.url]) {
      // feed record exists, update it. set defaults based on existing record.
      defaults.name = (data.info[obj.url].name) ? data.info[obj.url].name : defaults.name;
      defaults.cache_articles = (data.info[obj.url].cache_articles) ? data.info[obj.url].cache_articles : defaults.cache_articles;
      defaults.last_fetched = (data.info[obj.url].last_fetched) ? data.info[obj.url].last_fetched : defaults.last_fetched;
      defaults.unread = (data.info[obj.url].unread) ? data.info[obj.url].unread : defaults.unread;
      defaults.image = (data.info[obj.url].image) ? data.info[obj.url].image : defaults.image;
      defaults.favicon = (data.info[obj.url].favicon) ? data.info[obj.url].favicon : defaults.favicon;
    }

    // now ensure passed in object has all fields updated, assuming passed in object
    // is the most recent copy we have to go on.
    obj.url = (obj.address) ? obj.address : obj.url;
    obj.cache_articles = (obj.cache_articles) ? obj.cache_articles : defaults.cache_articles;
    obj.last_fetched = (obj.last_fetched) ? obj.last_fetched : defaults.last_fetched;
    obj.unread = (obj.unread) ? obj.unread : ((data.info[obj.url]) &&
                                              (data.info[obj.url].unread)) ? data.info[obj.url].unread : defaults.unread;
    obj.image = (typeof obj.image === 'object' && typeof obj.image.url === 'string') ? obj.image.url : defaults.image;
    obj.favicon = (obj.favicon) ? obj.favicon : defaults.favicon;

    // remotestorage doesn't use these properties, but sockethub passes them to us
    // so let's delete them now.
    delete obj.objectType;
    delete obj.categories;
    delete obj.address;

    _saveFeed(obj);
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
      defer.resolve(m);
    }, function (err) {
      defer.reject(err);
    });

    delete data.info[url];
    // remove this feed from infoArray
    for (var i = 0, len = data.infoArray.length; i < len; i = i + 1) {
      if ((data.infoArray[i]) && (data.infoArray[i].url === url)) {
        data.infoArray.splice(i, 1);
        break;
      }
    }
    // remove articles for this feed
    for (i = 0, len = data.articles.length; i < len; i = i + 1) {
      if ((data.articles[i]) && (data.articles[i].actor.address === url)) {
        data.articles.splice(i, 1);
      }
    }
    console.log('articles count: '+data.articles.length);
    console.log('feed removed: ', url);

    return defer.promise;
  };

  /****
   * FEED FETCHING
   ****************/
  // issue orders to fetch feeds from sockethub
  func.fetchFeed = function fetch(url, date) {

    var msg = {
      verb: 'fetch',
      platform: 'feeds',
      actor: {
        address: 'feeds'
      },
      target: [{
        address: url
      }],
      object: {
        limit: data.settings.articlesPerPage,
        date: date || 0,
        from: 'before'
      }
    };

    var defer = $q.defer();
    var name = url;
    if (typeof data.info[url] !== 'undefined') {
      name = data.info[url].name;
      data.info[url].loaded = false;
    }
    $rootScope.$broadcast('message', {type: 'info', message: 'fetching articles from '+name});

    SH.submit.call(msg).then(function (o) {
      $rootScope.$broadcast('message', {type: 'success', title: 'Fetched', message: ''+name});
      data.info[url].loaded = true;
      defer.resolve();
    }, function (e) {
      console.log('failed fetch '+url, data.info);
      if (typeof data.info[url] === 'object') {
        data.info[url].loaded = true;
        data.info[url].error = e;
      }
      $rootScope.$broadcast('message', {
        message: 'failed fetching feed: '+url+': '+e,
        type: 'error'
      });
      defer.reject(e);
    });
    return defer.promise;
  };

  //
  // detect when new articles are received from Sockethub
  //
  SH.on('feeds', 'message', function (m) {
    //console.log("Feeds received message ",m);
    var key = m.actor.address;

    if (!m.status) {
      console.log('received error message from sockethub: ', m);
      $rootScope.$broadcast('message', {
        type: 'error',
        message: m.target[0].address + ' ' + m.message
      });
      return;
    }

    //
    // check if the feed entry for this article exists yet, if not add it.
    // also check to update name.
    //
    if (!data.info[key])  {
      func.updateFeed(m.actor);
    } else if ((!data.info[key].name) || (data.info[key].name === data.info[key].url)) {
      func.updateFeed(m.actor);
    } else if ((typeof m.actor.image === 'object' && typeof m.actor.image.url === 'string') && (data.info[key].image !== m.actor.image.url)) {
      func.updateFeed(m.actor);
    }

    if (!m.object.read) {
      m.object.read = false;
      data.info[key].unread = (typeof data.info[key].unread === "number") ? data.info[key].unread + 1 : 1;
    }

    if (!m.object.datenum) {
      m.object.datenum = Date.parse(m.object.date) || 0;
    }

    if (data.info[key].oldestFetched > m.object.datenum) {
      data.info[key].oldestFetched = m.object.datenum;
    }


    _addArticle(m);
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
['$scope', 'Feeds', '$rootScope', '$routeParams', '$location',
function ($scope, Feeds, $rootScope, $routeParams, $location) {
  $scope.saving = false;
  $scope.feeds = Feeds.data;
  var feedUrl;
  if ($routeParams.feed) {
    feedUrl = decodeURIComponent($routeParams.feed);
    console.log('feedSettingsCtrl feedUrl: '+feedUrl, Feeds.data.info);
    Feeds.data.edit.url = feedUrl;
    Feeds.data.edit.name = Feeds.data.info[feedUrl].name;
    Feeds.data.edit.origName = Feeds.data.info[feedUrl].name;
  } else {
    $location.path('/feeds/');
  }

  $scope.saveFeedSettings = function (feed) {
    $scope.saving = true;
    console.log('saveFeed', feed);
    delete feed.origName;
    Feeds.func.updateFeed(feed);
    $scope.saving = false;
    $location.path('/feeds/'+feedUrl);
  };

  $scope.cancelFeedSettings = function () {
    console.log('CANCEL: '+feedUrl, $scope.feeds.edit);
    Feeds.data.info[feedUrl].name = Feeds.data.edit.origName;
    $scope.saving = false;
    $location.path('/feeds/'+$routeParams.feed);
  };

  $scope.deleteFeed = function (feed) {
    $scope.saving = true;
    Feeds.func.removeFeed(feed.url).then(function () {
      $rootScope.$broadcast('message', {type: 'success', message: 'deleted feed '+feed.url});
      $scope.saving = false;
      $location.path('/feeds/');
    }, function (err) {
      console.log('error removing feed!: ', err);
      $rootScope.$broadcast('message', {type: 'error', message: err.message});
      $scope.saving = false;
      $location.path('/feeds/');
    });
  };

}]).

/**
 * controller: feedCtrl
 */
controller('feedCtrl',
['$scope', 'Feeds', '$rootScope', '$timeout', '$routeParams',
function ($scope, Feeds, $rootScope, $timeout, $routeParams) {
  $scope.saving = false;
  $scope.feeds = Feeds.data;
  $scope.article;
  $scope.articleUrl;
  $scope.test = false;
  $scope.view = 'list';

  if ($routeParams.article) {
    $scope.view = 'article';
    $scope.articleUrl = decodeURIComponent($routeParams.article);
    //console.log("ARTICLE PARAM: "+$scope.articleUrl);
    Feeds.func.getArticle($scope.articleUrl).then(function (a) {
      $scope.article = a;
    }, function (err) {
      $scope.view = 'list';
      $scope.error = err;
      $rootScope.$broadcast('message', {
        message: 'problem fetching article '+err,
        type: 'error'
      });
    });
  }

  if ($routeParams.feed) {
    var feed = decodeURIComponent($routeParams.feed);
    //console.log("FEED PARAM: "+feed);
    // if we have a url as a param, we try to fetch it

    //Feeds.data.selectedFeed = feed;
    Feeds.data.current.name = (Feeds.data.info[feed]) ? Feeds.data.info[feed].name : feed;
    Feeds.data.current.id = feed;
    Feeds.data.current.indexes = [feed];
    if (!Feeds.data.info[feed]) {
      $rootScope.$broadcast('message', {
        message: 'attempting to fetch feed from '+feed,
        type: 'info'
      });
      Feeds.func.fetchFeed(feed);
    }
  } else {
    Feeds.data.current.name = '';
    Feeds.data.current.indexes.length = 0;
  }
  
  // $scope.$watch('Feeds.data.info[feed].loaded', function (val1, val2) {
  //   if (feed) {
  //     console.log('FEED LOADED! '+val1+'-'+val2+' ['+Feeds.data.info[feed].loaded+']');
  //   }
  // });

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

factory('isSelected', ['Feeds',
function (Feeds) {
  return function (url, inclusive) {
    if (Feeds.data.current.indexes.length === 0) {
      if ((inclusive) || (!url)) {
        return true;
      } else {
        return false;
      }
    } else {
      for (var i = 0, num = Feeds.data.current.indexes.length; i < num; i = i + 1) {
        if (Feeds.data.current.indexes[i] === url) {
          return true;
        }
      }
    }
    return false;
  };
}]).

/**
 * directive: feedList
 */
directive('feedList', ['isSelected', 'Feeds', '$location', '$rootScope',
function (isSelected, Feeds, $location, $rootScope) {
  function FeedListCtrl ($scope) {

    $scope.isSelected = isSelected;

    $scope.switchFeed = function (url, groupId, error) {
      //console.log('SWITCH FEED: '+encodeURIComponent(url));
      if (error) { return false; }
      // ensure slider is closed
      $('.opposite-sidebar').removeClass('slider-active');
      $('#remotestorage-widget').removeClass('hidden');
      if (!url) {
        $location.path('/feeds/');
      } else {
        $location.path('/feeds/'+encodeURIComponent(url));
      }
    };
  }

  return {
    restrict: 'E',
    scope: {
      'feeds': '=',
      'settings': '=',
      'test': '='
    },
    templateUrl: '/res/js/feeds/feed-list.html.tpl',
    controller: FeedListCtrl,
    transclude: true
  };
}]).

/**
 * directive: feedTiles
 */
directive('feedTiles', ['isSelected', 'Feeds', '$location', '$rootScope',
function (isSelected, Feeds, $location, $rootScope) {
  function FeedTilesCtrl ($scope) {

    //console.log('******** DATA: ', $scope.feeds);
    $scope.isSelected = isSelected;

    $scope.switchFeed = function (url, groupId, error) {
      //console.log('SWITCH FEED: '+encodeURIComponent(url));
      if (error) { return false; }
      // ensure slider is closed
      $('.opposite-sidebar').removeClass('slider-active');
      $('#remotestorage-widget').removeClass('hidden');
      if (!url) {
        $location.path('/feeds/');
      } else {
        $location.path('/feeds/'+encodeURIComponent(url));
      }
    };
  }

  return {
    restrict: 'E',
    scope: {
      'feeds': '=',
      'settings': '=',
      'test': '='
    },
    templateUrl: '/res/js/feeds/feed-tiles.html.tpl',
    controller: FeedTilesCtrl
  };
}]).


/**
 * directive: articles
 */
directive('articles', ['isSelected', 'Feeds', '$location', '$filter',
function (isSelected, Feeds, $location, $filter) {

  function ArticlesCtrl($scope) {

    $scope.ArticlesDisplayed = {
      oldest: 0
    };
    $scope.viewing = '';

    $scope.feeds = Feeds.data;
    $scope.articlesShown = false;

    $scope.showFeedSettings = function (url) {
      console.log('showFeedSettings: '+url);
      if (!url) {
        return;
      } else {
        $location.path('/feeds/edit/'+encodeURIComponent(url));
      }
    };

    // returns true if current selection is empty (has no unread articles)
    $scope.currentIsEmpty = function () {
      if (!$scope.feeds.current.name) {
        return true;
      }
      for (var i = 0, num = $scope.feeds.current.indexes.length; i < num; i = i + 1) {
        //console.log('checking '+$scope.model.feeds.current.indexes[i], $scope.model.feeds.info[$scope.model.feeds.current.indexes[i]]);
        if ((Feeds.data.info[Feeds.data.current.indexes[i]]) &&
            (Feeds.data.info[Feeds.data.current.indexes[i]].unread > 0)) {
          return false;
        }
        // if (Feeds.data.settings.showRead) {
        //   return false;
        // }
      }
      return true;
    };

    $scope.viewArticle = function (a, move) {
      if (!a) {
      } else {
        if (!move) {
          $scope.toggleRead(a, true);
          //console.log('---VIEW ARTICLE: '+'/feeds/'+encodeURIComponent(a.source_link)+'/article/'+encodeURIComponent(a.link), a);
          $location.path('/feeds/'+encodeURIComponent(a.source_link)+'/article/'+encodeURIComponent(a.link));
        } else if (move === 'prev') {
          var prevUrl = $scope.getPrevUrl(a);
          if (!prevUrl) {
            $scope.switchFeed($scope.feeds.current.id);
          }
          //console.log('---VIEW ARTICLE(prev): '+prevUrl);
          $location.path('/feeds/'+encodeURIComponent(a.source_link)+'/article/'+encodeURIComponent(prevUrl));
        } else if (move === 'next') {
          var nextUrl = $scope.getNextUrl(a);
          if (!nextUrl) {
            $scope.switchFeed($scope.feeds.current.id);
          }
          //console.log('---VIEW ARTICLE(next): '+nextUrl);
          $location.path('/feeds/'+encodeURIComponent(a.source_link)+'/article/'+encodeURIComponent(nextUrl));
        }
        // $('#article'+remoteStorage.feeds.md5sum(url)).modal({
        //   show: true,
        //   backdrop: false
        // });
      }
      
    }

    $scope.getNextUrl = function (a) {
      var as = $filter('orderBy')(Feeds.data.articles, 'date', true);
      var as = $filter('filter')(as, $scope.isShowable);

      var next;
      for (var i = 0, num = as.length; i >= 0; i = i + 1) {
        if (!as[i]) {
          return '';
        } else if (as[i].link === a.link) {
          next = true;
        } else if (next) {
          return as[i].link;
        }
      }
    };

    $scope.getPrevUrl = function (a) {
      var as = $filter('orderBy')(Feeds.data.articles, 'date', true);
      var as = $filter('filter')(as, $scope.isShowable);

      var prev = '';
      for (var i = 0, num = as.length; i >= 0; i = i + 1) {
        //console.log('checking article: '+as[i].link);
        if (as[i].link === a.link) {
          return prev;
        } else {
          prev = as[i].link;
        }
      }
      return '';
    };

    $scope.switchFeed = function (url, groupId, error) {
      console.log('SWITCH FEED: '+encodeURIComponent(url));
      if (error) { return false; }
      // ensure slider is closed
      $('.opposite-sidebar').removeClass('slider-active');
      $('#remotestorage-widget').removeClass('hidden');
      if (!url) {
        $location.path('/feeds/');
      } else {
        $location.path('/feeds/'+encodeURIComponent(url));
      }
    };

    /**
     * Function: toggleRead
     *
     * toggle an article as read/unread, update unread could on info index,
     * update article on remoteStorage.
     *
     *
     * Parameters:
     *
     *   a   - article object
     *   read   - force mark as read
     *
     * Returns:
     *
     *   return description
     */
    $scope.toggleRead = function (a, read) {
      if ((read) || (!a.read)) {
        if (!Feeds.data.info[a.source_link].unread > 0) {
          Feeds.data.info[a.source_link].unread =
              Feeds.data.info[a.source_link].unread - 1;
        }
        a.read = true;
      } else if (a.read) {
        Feeds.data.info[a.source_link].unread =
            Feeds.data.info[a.source_link].unread + 1;
        a.read = false;
      }

      Feeds.func.saveArticle(a);
    };

    /**
     * Function: showMore
     *
     * fetches another group of articles from Sockethub
     *
     */
    $scope.showMore = function () {
      Feeds.data.settings.displayCap = Feeds.data.settings.displayCap +
                                       Feeds.data.settings.articlesPerPage;
      for (var i = 0, num = Feeds.data.current.indexes.length; i < num; i = i + 1) {
        Feeds.func.fetchFeed(Feeds.data.current.indexes[i],
                             $scope.ArticlesDisplayed.oldest);
      }
    };

    /**
     * Function: isShowable
     *
     * returns true/false if the article qualifies for being shown currently.
     * this is based on how many articles can be shown per-page [displayCap]
     * and the number of articles currently being shown [ArticlesDisplayed].
     * Also whether the setting to show read articles is set [showRead].
     *
     * Parameters:
     *
     *   article - article object
     *
     * Returns:
     *
     *   return boolean
     */
    $scope.isShowable = function (article) {
      if (!isSelected(article.source_link, true)) {
        return false;
      }

      // if (Feeds.data.settings.displayed[article.object.link]) {
      //   return true;
      // }

      if (Object.keys($scope.ArticlesDisplayed).length >= Feeds.data.settings.displayCap) {
        if ((article.read) && (!Feeds.data.settings.showRead)) {
          delete $scope.ArticlesDisplayed[article.link];
          return false;
        } else if ($scope.ArticlesDisplayed[article.link]) {
          $scope.articlesShown = true;
          return true;
        } else {
          delete $scope.ArticlesDisplayed[article.link];
          return false;
        }
      }

      if (article.read) {
        if (Feeds.data.settings.showRead) {
          $scope.ArticlesDisplayed[article.link] = true;
          // keep the oldest value (datenum of oldest article in list) up to date
          $scope.ArticlesDisplayed.oldest =
              ($scope.ArticlesDisplayed.oldest > article.datenum) ?
              article.datenum : ($scope.ArticlesDisplayed.oldest === 0) ?
              article.datenum : $scope.ArticlesDisplayed.oldest;
          $scope.articlesShown = true;
          return true;
        } else {
          delete $scope.ArticlesDisplayed[article.link];
          return false;
        }
      } else {
        $scope.ArticlesDisplayed[article.link] = true;
        // keep the oldest value (datenum of oldest article in list) up to date
        $scope.ArticlesDisplayed.oldest =
              ($scope.ArticlesDisplayed.oldest > article.datenum) ?
              article.datenum : ($scope.ArticlesDisplayed.oldest === 0) ?
              article.datenum : $scope.ArticlesDisplayed.oldest;
        $scope.articlesShown = true;
        return true;
      }
      return true;
    };
  }

  return {
    restrict: 'E',
    scope: {
      'feeds': '=',
      'settings': '='
    },
    controller: ArticlesCtrl,
    templateUrl: '/res/js/feeds/articles.html.tpl',
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