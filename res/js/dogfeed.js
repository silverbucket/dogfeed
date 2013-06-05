angular.module('dogfeed', []).




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
    //console.log('closeModalSockethubSettings');
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
['$scope',
function ($scope) {
  $scope.url = '';

  $scope.add = function (url) {
    console.log('add url! ' + url);
  };

  $scope.adding = false;
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
              '<ul class="nav nav-list">' +
              '  <li ng-repeat="f in uniqueFeeds" data-toggle="tooltip" title="{{ f.address }}">' +
              '    <a href="#/{{f.platform}}/feed/{{ f.address | urlEncode }}">{{ f.name }}</a>' +
              '  </li>' +
              '</ul>',
    link: function (scope, element, attrs) {
      scope.uniqueFeeds = [];

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