angular.module('dogfeed', ['ngRemoteStorage']).


/**
 * config: routes
 */
config(['$routeProvider',
function ($routeProvider) {
  $routeProvider.
    when('/', {
      templateUrl: "feeds.html"
    }).
    when('/feed/:address', {
      templateUrl: "feeds.html"
    }).
    otherwise({
      redirectTo: "/"
    });
}]).




/**
 * emitters
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
    console.log("FILTER: ", text, length, end);
    return encodeURIComponent(text);
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
['$scope', '$rootScope',
function ($scope, $rootScope) {
  $scope.addFeed = function () {
    $rootScope.$broadcast('showModalAddFeed', {locked: false});
  };
}]).


/**
 * controller: addFeedCtrl
 */
controller('addFeedCtrl',
['$scope', 'RS', '$rootScope',
function ($scope, RS, $rootScope) {
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

    RS.call('rss', 'add', [obj]).then(function () {
      console.log('rss feed url saved!');
      $rootScope.$broadcast('closeModalAddFeed');
      $scope.adding = false;
      $rootScope.$broadcast('message', {type: 'success', message: 'RSS feed added: '+url});
    }, function (err) {
      $rootScope.$broadcast('message', {type: 'error', message: err.message});
    });
  };

}]).


/**
 * controller: feedCtrl
 */
controller('feedCtrl',
['$scope',
function ($scope) {

  $scope.feeds = [];

}]).




///////////////////////////////////////////////////////////////////////////
//
// DIRECTIVES
//
///////////////////////////////////////////////////////////////////////////



/**
 * directive: message
 */
directive('message',
['$rootScope', '$timeout',
function ($rootScope, $timeout) {
  return {
    restrict: 'A',
    template: '<div class="alert alert-{{ m.type }}" ng-show="haveMessage">'+
              '  <strong>{{ m.title }}</strong> ' +
              '  <span> {{ m.message }}</span>' +
              '</div>',
    link: function (scope) {
      scope.haveMessage = false;
      scope.m = {type: '', title: '', message: ''};


      var presets = {
        'remotestorage-connect': {
          type: 'error',
          title : 'Connect to remoteStorage',
          message: 'First things first. You must connect to your remoteStorage'
        },
        'sockethub-config': {
          type: 'error',
          title: 'Sockethub configuration needed',
          message: 'You must fill in your Sockethub connection details'
        },
        'sockethub-connect': {
          type: 'error',
          title: 'Sockethub connection error',
          message: 'Unable to connect to Sockethub please check your configuration and try again'
        },
        'sockethub-register': {
          type: 'error',
          title: 'Sockethub registration problem',
          message: 'We were unable to register with your Sockethub instance'
        },
        'xmpp-connect': {
          type: 'error',
          title: 'XMPP connection failed',
          message: 'There was a problem connecting to the XMPP server, please verify you settings'
        },
        'unknown': {
          type: 'error',
          title: 'An unknown error has occurred',
          message: ''
        }
      };

      $rootScope.$on('message', function (event, e) {
        console.log('message event: ', e);

        scope.haveMessage = false;

        if (typeof e === 'undefined') {
          e = 'no error specified';
        }

        /*if ((typeof e.type === 'undefined') ||
            (typeof presets[e.message] === 'undefined')) {
          scope.m = presets['unknown'];
          scope.m.message = String(e.message || e);
        } else {*/

        if (typeof presets[e.message] !== 'undefined') {
          scope.m = presets[e.message];
        } else if (typeof e.message === 'string') {
          if (e.type === 'success') {
            scope.m.title = 'Success';
          } else {
            scope.m.title = "Error";
          }
          scope.m.message = e.message;
          scope.m.type = e.type;
        }
        console.log('done processing: ', scope.m);

        scope.haveMessage = true;
        $timeout(function () {
          scope.haveMessage = false;
          scope.m = {type: '', title: '', message: ''};
        }, 4000);


        /*if (e.type === 'sockethub-config') {
          console.log('no config found, launch modal');
          $rootScope.$broadcast('showModalSettingsSockethub', {locked: true});
        }*/
      });
    }
  };
}]).

/**
 * directive: articles
 */
directive('articles', [
function () {
  return {
    restrict: 'A',
    scope: {
      feeds: '='
    },
    template: '<div class="well" ng-repeat="f in feeds">' +
              '  <h2>{{ f.object.title }}</h2>' +
              '  <p>feed: <i>{{ f.actor.address }}</i></p>' +
              '  <p>article link: <i><a target="_blank" href="{{ f.object.link }}">{{ f.object.link }}</a><i></p>' +
              '  <div data-brief data-ng-bind-html-unsafe="f.object.brief_html"></div>' +
              '</div>',
    link: function (scope) {
      console.log('ARTICLES: ', scope.feeds);
      for (var i = 0, num = scope.feeds.length; i < num; i = i + 1) {
        if (!scope.feeds[i].object.html) {
          scope.feeds[i].object.html = scope.feeds[i].object.text;
        }
        if (!scope.feeds[i].object.brief_html) {
          scope.feeds[i].object.brief_html = scope.feeds[i].object.brief_text;
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
    restrict: 'A',
    scope: {
      feeds: '='
    },
    template: '<h4 ng-transclude></h4>' +
              ' <span>{{ message }}<span>' +
              '<ul class="nav nav-list">' +
              '  <li ng-repeat="f in uniqueFeeds" data-toggle="tooltip" title="{{ f.address }}">' +
              '    <a href="#/{{f.platform}}/feed/{{ f.address | urlEncode }}">{{ f.name }}</a>' +
              '  </li>' +
              '</ul>',
    link: function (scope, element, attrs) {
      scope.uniqueFeeds = [];
      scope.message = '';

      for (var i = 0, num = scope.feeds.length; i < num; i = i + 1) {
        var match = false;
        for (var j = 0, jnum = scope.uniqueFeeds.length; j < jnum; j = j + 1) {
          if (scope.uniqueFeeds[j].address === scope.feeds[i].actor.address) {
            match = true;
            break;
          }
        }
        if (!match) {
          scope.uniqueFeeds.push({ address: scope.feeds[i].actor.address,
                                   name: scope.feeds[i].actor.name,
                                   description: scope.feeds[i].actor.description,
                                   platform: scope.feeds[i].platform });
        }
      }
      console.log('**** feeds: ', scope.feeds);
      console.log('**** uniqueFeeds: ', scope.uniqueFeeds);

      if (scope.uniqueFeeds.length === 0) {
        scope.message = "no feeds yet, add some!";
      }
    },
    transclude: true
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