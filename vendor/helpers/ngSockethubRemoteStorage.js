'use strict';

/**
 * helper modules to allow sockethub to bootstrap using remotestorage and to
 * write to remoteStorage when it needs to update it's sockethub config
 */
angular.module('ngSockethubRemoteStorage', ['ngSockethubClient', 'ngRemoteStorage']).

value('srsLocalSettings', {
  appName: 'default'
}).

/**
 * run
 */
run(['$rootScope', 'SockethubSettings', 'SH', 'RS', 'srsLocalSettings',
function ($rootScope, settings, SH, RS, localSettings) {
  //SH.on('sockethub', 'registered', function () {
  $rootScope.$on('sockethubSettingsSaved', function () {
    // sockethub connected, save settings to RS
    console.log('Sockethub-RemoteStorage: saving sockethub config to remoteStorage ', settings.conn);
    RS.call('sockethub', 'writeConfig', [localSettings.appName, settings.conn]).then(function () {
      //console.log('config saved to RS');
    }, function (err) {
      //console.log('Sockethub-RemoteStorage: Failed saving sockethub config to remoteStorage: ',err);
      $rootScope.$broadcast('message', {
        message: 'failed saving sockethub config to remote storage',
        type: 'error',
        topic: 'remotestorage',
        timeout: true
      });
    });
  });
}]).

factory('SockethubBootstrap', ['RS', 'SockethubSettings', '$rootScope', 'SH', '$timeout', 'srsLocalSettings',
function (RS, settings, $rootScope, SH, $timeout, localSettings) {
  function run(appName, defaultCfg, envObj) {

    if (typeof appName === 'string') {
      localSettings.appName = appName;
    }

    if (typeof defaultCfg === 'object') {
      settings.save('conn', defaultCfg);
      settings.save('defaultConn', defaultCfg);
    }

    if (typeof envObj === 'object') {
      settings.save('env', envObj);
    }

    function connect(cfg) {
      //console.log('USING SH CONFIG: ', cfg);
      //$rootScope.$broadcast('message', {type: 'clear'});
      // connect to sockethub and register
      if (settings.save('conn', cfg)) {
        $rootScope.$broadcast('message', {
          message: 'attempting to connect to sockethub',
          type: 'info',
          topic: 'sockethub',
          timeout: false
        });
        SH.connect({register: true}).then(function () {
          //console.log('connected to sockethub');
          $rootScope.$broadcast('message', {
            message: 'connected to sockethub',
            type: 'success',
            topic: 'sockethub',
            timeout: true
          });
        }, function (err) {
          console.log('error connecting to sockethub: ', err);
          $rootScope.$broadcast('SockethubConnectFailed', {message: err});
        });
      } else {
        $rootScope.$broadcast('message', {
          message: 'failed saving sockethub credentials',
          topic: 'sockethub',
          type: 'error',
          timeout: true
        });
      }
    }

    RS.call('sockethub', 'getConfig', [localSettings.appName]).then(function (c) {
      console.log('GOT SH CONFIG: ', c);
      var cfg = {};

      if ((typeof c !== 'object') || (typeof c.host !== 'string')) {
        //cfg = settings.conn;
        cfg = defaultCfg;
      } else {
        cfg = c;
      }
      connect(cfg);
    }, function (err) {
      console.log('RS.call error: ', err);
      if (defaultCfg) {
        console.log('attempting to fallback to default config: ', defaultCfg);
        connect(defaultCfg);
      }
    });
  }

  return {
    run: run
  };
}]);