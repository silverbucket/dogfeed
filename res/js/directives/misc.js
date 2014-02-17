angular.module('dogfeed').

directive('butterbar', ['$rootScope',
function($rootScope) {
  return {
    link: function(scope, element, attrs) {
      element.addClass('hide');
      $rootScope.$on('$routeChangeStart', function() {
        element.removeClass('hide');
      });
      $rootScope.$on('$routeChangeSuccess', function() {
        element.addClass('hide');
      });
      $rootScope.$on('$routeChangeError', function (event, current, previous, rejection) {
        console.log('routeChangeError: ', rejection);
      });
    }
  };
}]).

directive('focus',
function() {
  return {
    link: function(scope, element, attrs) {
      element[0].focus();
    }
  };
});