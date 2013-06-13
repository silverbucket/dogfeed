angular.module('dogfeed', ['ngRSS']).


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
              '  <strong>{{m.title}}</strong> ' +
              '  <span>{{m.message}}</span>' +
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

        var timeout = (typeof e.timeout === 'boolean') ? e.timeout : true;
        scope.haveMessage = false;

        if (typeof e === 'undefined') {
          e = 'no error specified';
        }

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
        if (timeout) {
          $timeout(function () {
            scope.haveMessage = false;
            scope.m = {type: '', title: '', message: ''};
          }, 4000);
        }
      });
    }
  };
}]);

