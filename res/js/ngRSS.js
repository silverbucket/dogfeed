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


  function broadcastError(url, err) {
    data.info[url].error = true;
    data.info[url].errorMsg = err;
    $rootScope.$broadcast('message', {
      message: err,
      type: 'error'
    });
  }
  function dummy () {}


  /****
   * FEED MANAGEMENT
   ******************/
  // grab whatever feeds exists in remoteStorage right away
  (function getFeedUrls() {
    RS.call('rss', 'getAll', ['']).then(function (urls) {
      console.log('RSS: got feed urls from remoteStorage ', urls);
      for (var key in urls) {
        var url = urls[key].url;
        if (!url) {
          console.log('ERROR processing url['+url+']: ', urls[key]);
        } else {
          urls[key].unread = 0;
          func.addFeed(urls[key], true); // asign existing feed info to data struct
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

  // add a new feed to remoteStorage
  function _add(obj) {
    //console.log('ADDING FEED TO DATA STRUCT: ', obj);
    data.info[obj.url] = obj;
    var match = false;
    for (var i = 0, len = data.infoArray.length; i < len; i = i + 1) {
      if ((data.infoArray[i]) && (data.infoArray[i].url === obj.url)) {
        //console.log('BREAK: '+obj.url);
        match = true;
        break;
      }
    }
    if (!match) {
      ///console.log('adding to list: ', data.info[obj.url]);
      //console.log('existing feeds: ', data.info);
      data.infoArray.push(data.info[obj.url]);
      data.info[obj.url]['loaded'] = false;
      func.fetchFeed(obj.url).then(function () {
        data.info[obj.url]['loaded'] = true;
      }, function (err) {
        data.info[obj.url]['loaded'] = true;
        broadcastError(obj.url, 'failed fetching feed list from sockethub: '+err);
      });  // fetch articles from sockethub
    }
  }
  func.addFeed = function addFeed(obj, noRemoteStorage) {
    var defer = $q.defer();
    if (noRemoteStorage) {
      _add(obj);
    } else {
      RS.call('rss', 'add', [obj]).then(function (m) {
        //console.log('feed added to rs: ', obj);
        _add(obj);
        defer.resolve(m);
      }, function (err) {
        defer.reject(err);
      });
    }
    return defer.promise;
  };

  func.updateFeed = function updateFeed(obj) {
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

  func.removeFeed = function removeFeed(url) {
    var defer = $q.defer();
    RS.call('rss', 'remove', [url]).then(function (m) {
      //console.log('feed removed: ', url);
      delete data.info[url];
      for (var i = 0, len = data.infoArray.length; i < len; i = i + 1) {
        if ((data.infoArray[i]) && (data.infoArray[i].url === url)) {
          //console.log('removing from list: ',data.infoArray[i]);
          data.infoArray.splice(i, 1);
          break;
        }
      }
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
      console.log('received error message from sockethub: ', m);
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
          data.info[t_key]['error'] = true;
          data.info[t_key]['errorMsg'] = m.object.message;
        }
      }
    } else if (!data.info[key].name) { //} !== m.actor.name) {
      data.info[key]['name'] = m.actor.name;
      func.addFeed(data.info[key]);
    } else {
      //console.log("*** Names already match: " + m.actor.name);
    }

    if (!m.object.read) {
      m.object.read = false;
    }

    if (m.status) {
      //console.log('adding article: ', m);
      var id = RSutil.encode(m.object.link);
      //console.log('ID: ', id);
      RS.call('articles', 'get', [id]).then(function (a) {
        if (a) {
          //console.log('ARTICLE FETCH from RS: ', a);
          m.object.read = (a.read) ? a.read : false;
        }

        if (!m.object.read) {
          //console.log(data.info[key].name + ' UNREAD COUNT['+data.info[key].unread+'] + 1');
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
      //console.log('rss feed url saved!: ', m);
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
['$scope', 'RSS', 'util', '$rootScope', '$timeout',
function ($scope, RSS, util, $rootScope, $timeout) {
  $scope.model = {};
  $scope.model.settings = {
    showRead: false
  };
  $scope.model.feeds = RSS.data;
  $scope.model.loading = true;
  $scope.model.feeds.current = {
    name: '',
    indexes: []
  };
  if (!$scope.model.feeds.edit) {
    $scope.model.feeds.edit = '';
  }
  if (!$scope.model.feeds._editName) {
    $scope.model.feeds._editName = '';
  }
  $scope.model.saving = false;

  $scope.isSelected = function (url, inclusive) {
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
    if (!$scope.model.feeds.current.name) {
      return false;
    }
    for (var i = 0, num = $scope.model.feeds.current.indexes.length; i < num; i = i + 1) {
      //console.log('checking '+$scope.model.feeds.current.indexes[i], $scope.model.feeds.info[$scope.model.feeds.current.indexes[i]]);
      if ($scope.model.feeds.info[$scope.model.feeds.current.indexes[i]].unread > 0) {
        return false;
      }
      if (settings.showRead) {
        return false;
      }
    }
    return true;
  };

  $scope.switchFeed = function (url) {
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
    //$scope.switchFeed(url);
    $scope.model.feeds.edit = url;
    $scope.model.feeds._editName = $scope.model.feeds.info[$scope.model.feeds.edit].name;
    //console.log('EDIT: ', $scope.model.feeds.edit);
    $("#modalFeedSettings").modal({
      show: true,
      keyboard: true,
      backdrop: true
    });
  };

  $scope.cancelFeedSettings = function () {
    $("#modalFeedSettings").modal('hide');
    $scope.model.feeds.info[$scope.model.feeds.edit].name = $scope.model.feeds._editName;
    $scope.saving = false;
  };

  $scope.saveFeedSettings = function (url) {
    $scope.saving = true;
    //$scope.model.feeds.info[$scope.model.feeds.edit].name = $scope.model.feeds.edit.name;
    //console.log('SAVE: ', $scope.model.feeds.info[url]);
    RSS.func.updateFeed($scope.model.feeds.info[url]).then(function () {
      $("#modalFeedSettings").modal('hide');
      $rootScope.$broadcast('message', {type: 'success', message: 'updated feed '+url});
      $scope.saving = false;
    }, function (err) {
      console.log('rss feed update failed!: ', err);
      $rootScope.$broadcast('message', {type: 'error', message: err.message});
      $("#modalFeedSettings").modal('hide');
      $scope.saving = false;
    });
  };

  $scope.deleteFeed = function (url) {
    $scope.saving = true;
    RSS.func.removeFeed(url).then(function () {
      $("#modalFeedSettings").modal('hide');
      $rootScope.$broadcast('message', {type: 'success', message: 'deleted feed '+url});
      $scope.saving = false;
    }, function (err) {
      console.log('error removing rss feed!: ', err);
      $rootScope.$broadcast('message', {type: 'error', message: err.message});
      $("#modalFeedSettings").modal('hide');
      $scope.saving = false;
    });
  };

  $scope.markRead = function (url) {
    //console.log('markRead Called!');
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

  $rootScope.$on('SockethubConnectFailed', function (event, e) {
    console.log('Sockethub connect failed! ', e);
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
      'feeds': '=',
      'settings': '='
    },
    template: /*
              '<div style="min-width: 170px; background-color: #eeeeee;" ng-controller="feedCtrl">' +
              '  <form name="quickSettings" class="form-horizontal" novalidate>' +
              '    <div class="control-group">' +
              '      <label for="showRead" style="width: 130px; display: font-size: 12px; margin-right: 20px;" class="control-label">Show Read Artciles</label>' +
              '      <div class="controls">' +
              '        <input type="checkbox" name="showRead" ng-model="model.settings.showRead" />' +
              '      </div>' +
              '    </div>' +
              '  </form>' +
              '</div>' +
              */
              '<h4 ng-transclude></h4>' +
              '<ul class="nav nav-list" ng-controller="feedCtrl">' +
              '  <li ng-click="switchFeed()"' +
              '       ng-class="{active: isSelected(), \'all-feeds\': true}">' +
              '    <a href="" >' +
              '      <i class="icon-globe"></i><span>All Items</span>' +
              '    </a>' +
              '  </li>' +
              '  <li ng-show="feeds.infoArray.length ==0"><span>no feeds yet, add some!</span></li>' +
              '  <li ng-repeat="f in feeds.infoArray | orderBy: \'name\'"' +
              '      data-toggle="tooltip" ' +
              '      title="{{ f.url }}">' +
              '    <i ng-click="showFeedSettings(f.url)"' +
              '       ng-class="{status: true, \'icon-loading-small\': !f.loaded, \'icon-cog\': f.loaded}">' +
              '    </i>' +
              '    <div ng-click="switchFeed(f.url)"' +
              '         ng-class="{active: isSelected(f.url), error: f.error, loading: !f.loaded, \'feed-entry\': true}">' +
              '      <a href="" ng-class="{error: f.error}">' +
              '        <span ng-bind="f.name"></span> <span class="unread-count" ng-bind="f.unread"></span>' +
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
      'feeds': '=',
      'settings': '='
    },
    template: //'<h4><span ng-bind="feeds.current.name"></span></h4>' +
              '<div class="article-text" ng-controller="feedCtrl" ng-show="feeds.articles.length > 0 && currentIsEmpty(settings)"><p>no new articles</p></div>' +
              '<div ng-repeat="a in (filteredItems = (feeds.articles | orderBy: \'object.date\':true))"' +
              '     ng-controller="feedCtrl"' +
              '     ng-click="markRead(a.object.link)"' +
              '     ng-class="{well: true, unread: !a.object.read, article: true}"' +
              '     ng-show="isShowable(a.actor.address, a.object.read, settings)">' +
              '  <h2>{{ a.object.title }}</h2>' +
              '  <p>feed: <i>{{ a.actor.name }}</i></p>' +
              '  <p>date: <i>{{ a.object.date }}</i></p>' +
              '  <p>article link: <i><a target="_blank" href="{{ a.object.link }}">{{ a.object.link }}</a><i></p>' +
              '  <div class="article-body" data-ng-bind-html-unsafe="a.object.brief_html"></div>' +
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