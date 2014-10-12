/**
 * directive: message
 */
angular.module('ngMessages', []).

value('MessagesConfig', {
  timeout: 3000
}).

directive('message',
['$rootScope', '$timeout', 'MessagesConfig',
function ($rootScope, $timeout, cfg) {
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
          type: 'warning',
          title : 'Connect to remoteStorage',
          message: 'to save your session'
        },
        'sockethub-config': {
          type: 'warning',
          title: 'Sockethub configuration needed',
          message: 'You must fill in your Sockethub connection details'
        },
        'sockethub-connect': {
          type: 'danger',
          title: 'Sockethub connection error',
          message: 'Unable to connect to Sockethub please check your configuration and try again'
        },
        'sockethub-register': {
          type: 'danger',
          title: 'Sockethub registration problem',
          message: 'We were unable to register with your Sockethub instance'
        },
        'xmpp-connect': {
          type: 'danger',
          title: 'XMPP connection failed',
          message: 'There was a problem connecting to the XMPP server, please verify you settings'
        },
        'unknown': {
          type: 'danger',
          title: 'An unknown error has occurred',
          message: ''
        }
      };

      $rootScope.$on('message', function (event, e) {
        //console.log('message event: ', e);

        var hasTimeout = (typeof e.timeout === 'boolean') ? e.timeout : true;
        scope.haveMessage = false;

        if (typeof e === 'undefined') {
          e = 'no error specified';
        }

        var defaultTitle = '';
        if (e.type === 'clear') {
          scope.haveMessage = false;
          scope.m = {type: '', title: '', message: ''};
          return;
        } else if (typeof presets[e.message] !== 'undefined') {
          scope.m = presets[e.message];
        } else if (typeof e.message === 'string') {
          if (e.type === 'success') {
            defaultTitle = 'Success';
          } else if (e.type === 'info') {
            defaultTitle = 'Info';
          } else {
            defaultTitle = "Error";
            e.type = 'danger';
          }
          scope.m.title = (e.title) ? e.title : defaultTitle;
          scope.m.message = e.message;
          scope.m.type = e.type;
        }

        var numTimeout = cfg.timeout;
        if ((e.topic) && (e.topic === 'sockethub') && (e.type === 'success')) {
          numTimeout = 1000;
        }
        scope.m.timeoutCount = numTimeout;

        scope.m.timeout = hasTimeout;
        //console.log('info message event set: ', scope.m);
        var message = scope.m.message;
        scope.haveMessage = true;
        if (hasTimeout) {
          $timeout(function () {
            if ((scope.m.timeout) && (message == scope.m.message)) {
              scope.haveMessage = false;
              scope.m = {type: '', title: '', message: '', timeout: true};
            }
          }, numTimeout);
        }
      });
    }
  };
}]);
