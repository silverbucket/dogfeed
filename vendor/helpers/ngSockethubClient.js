'use strict';

angular.module('ngSockethubClient', ['ngCommandQueue']).

/**
 * default settings
 */
value('SockethubSettings', {
  conn: {
    host: 'localhost',
    port: 10550,
    path: '/sockethub',
    tls: false,
    secret: '1234567890'
  },
  connected: false,
  connecting: false,
  registered: false,
  env: {
    logo: '/res/img/sockethub-logo.svg'
  },
  save: function (prop, obj) {
    if (this.verify(prop, obj)) {
      this[prop] = obj;
      this[prop].port = +obj.port;
      //console.log('SH SAVE [' + prop + ']: ', this[prop]);
      return true;
    } else {
      console.log('SH SAVE FAILED '+prop+': ', this[prop]);
      return false;
    }
  },
  exists: function (prop) {
    this.verify(prop, this.conn);
  },
  verify: function (prop, p) {
    if (!p) {
      p = this[prop];
    }
    if (prop === 'conn') {
      if ((p.host) && (p.host !== '') &&
          (p.port) && (p.port !== '') &&
          (p.path) && (p.path !== '') &&
          (typeof p.tls === 'boolean') &&
          (p.secret)) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }
}).

/**
 * factory: SH
 */
factory('SH', ['$rootScope', '$q', '$timeout', 'SockethubSettings', 'cQueue',
function ($rootScope, $q, $timeout, settings, cQueue) {
  var sc;
  var callbacks = {
    'error': {},
    'message': {},
    'response': {},
    'close': {},
    'registered': {},
    'connected': {}
  };


  function isConnected() {
    if ((settings.connected) && (settings.registered)) {
      return true;
    } else {
      return false;
    }
  }

  function isConnecting() {
    return settings.connecting;
  }

  function isRegistered() {
    return settings.registered;
  }

  function callSH(job) {
    //console.log('callSH called ', job);
    sc[job.methods[0]].apply(sc, job.params)
      .then(function (e) {
        $rootScope.$apply(function () {
          job.defer.resolve(e);
        });
      }, function (e) {
        $rootScope.$apply(function () {
          job.defer.reject(e.message);
        });
      });
  }
  var queue = cQueue.init(callSH);

  function connect(p) {
    console.log('ngSockethubClient.connect() ', p);
    settings.connecting = true;
    settings.registered = false;
    settings.connected = false;
    var defer = $q.defer();
    var scheme = 'ws://';
    settings.connected = false;
    if (settings.conn.tls) {
      scheme = 'wss://';
    }

    var robj = {};
    if ((p) && (p.register)) {
      robj = {
        register: {
          secret: settings.conn.secret
        }
      };
    }

    console.log('Sockethub connect: '+scheme +
                                 settings.conn.host + ':' +
                                 settings.conn.port +
                                 settings.conn.path + ' register:'+ typeof robj.register);

    sc = SockethubClient.connect(scheme +
                                 settings.conn.host + ':' +
                                 settings.conn.port +
                                 settings.conn.path,
                                 robj
    );

    sc.on('connected', function () { // connected
      //console.log('Sockethub connected');
      if (callbacks.connected.sockethub) {
        $rootScope.$apply(callbacks.connected.sockethub());
      } else {
        if ((typeof p === 'object') && (!p.register)) {
          settings.connected = true;
          settings.connecting = false;
          // don't resolve the promise yet unless register was not requested
          // at the same time as connect
          $rootScope.$apply(function () {
            defer.resolve();
          });
        }
      }
    });

    sc.on('registered', function () { // connected & registered
      //console.log('Sockethub connected & registered');
      settings.connected = true;
      settings.connecting = false;
      settings.registered = true;
      if (callbacks.registered.sockethub) {
        $rootScope.$apply(callbacks.registered.sockethub());
      } else {
        try {
          $rootScope.$apply(function () {
            defer.resolve();
          });
        } catch (e) {
          console.log('ngSockethubClient ERROR: ', e);
        }
      }
    });

    sc.on('registration-failed', function (err) { // connected
      settings.registered = false;
      settings.connecting = false;
      console.log('Sockethub register failed ', err);
      $rootScope.$apply(function () {
        defer.reject(err);
      });
    });

    sc.on('failed', function (err) { // connection failed
      settings.registered = false;
      settings.connecting = false;
      settings.connected = false;
      console.log('Sockethub connection failed ', err);
      $rootScope.$apply(function () {
        defer.reject('Failed connecting to sockethub at ' + scheme +
                     settings.conn.host + ':' + settings.conn.port +
                     settings.conn.path);
      });
    });

    sc.on('disconnected', function (err) { // disconnected
      settings.registered = false;
      settings.connecting = false;
      settings.connected = false;
      console.log('SH received disconnect(close) '+err);
    });

    sc.on('message', function (data) { // message
      if ((data.platform) &&
          (callbacks.message[data.platform])) {
        //console.log('SH passing message to platform: '+data.platform);
        $rootScope.$apply(callbacks.message[data.platform](data));
      } else {
        console.log('SH received message with nothing to call: ', data);
      }
    });

    sc.on('unexpected-response', function (msg) {
      console.log('SH unexpected response: ', msg);
    });

    return defer.promise;
  }

  function register() {
    var defer = $q.defer();
    console.log('SH.register() called');
    queue.add({
      methods: ['register'],
      params: [{
        secret: settings.conn.secret
      }],
      defer: defer,
      timeout: 0,
      condition: isConnected
    });
    return defer.promise;
  }

  function sendSet(platform, type, index, object) {
    var defer = $q.defer();
    var data = {};
    data[type] = {};
    data[type][index] = object;
    queue.add({
      methods: ['set'],
      params: [platform, data],
      defer: defer,
      timeout: 0,
      condition: isRegistered
    });
    return defer.promise;
  }

  function callSubmit(obj, timeout) {
    var defer = $q.defer();
    queue.add({
      condition: isRegistered,
      methods: ['sendObject'],
      params: [obj, timeout],
      defer: defer,
      timeout: 0
    });
    return defer.promise;
  }

  function queueSubmit(obj, timeout) {
    queue.add({
      condition: isRegistered,
      methods: ['sendObject'],
      params: [obj, timeout],
      defer: false,
      timeout: 0
    });
  }

  var on = function on(platform, type, func) {
    callbacks[type][platform] = func;
  };

  return {
    connect: connect,
    register: register,
    isConnected: isConnected,
    isRegistered: isRegistered,
    isConnecting: isConnecting,
    set: sendSet,
    submit: {
      call: callSubmit,
      queue: queueSubmit
    },
    on: on
  };
}]).


directive('sockethubSettings', ['SH', '$rootScope', 'SockethubSettings',
function (SH, $rootScope, settings) {
  return {
    restrict: 'A',
    template: '<div class="col-xs-1"></div>' +
              '<div id="sockethubSettings" class="sockethub sockethub-form sockethub-settings col-xs-10">' +
              '  <div class="sockethub-logo" style="text-align: center;">' +
              '    <img data-ng-src="{{ sockethub.settings.env.logo }}" height="64" ng-cloak/>' +
              '  </div>' +
              '  <form name="settingsSockethub" role="form" class="form-horizontal" novalidate>' +
              '    <fieldset>' +
              '      <div class="form-group col-xs-12">' +
              '        <label for="host" class="control-label">Hostname</label>' +
              '        <div class="controls">' +
              '          <input type="text" class="required form-control" name="host" placeholder="Enter hostname..." ng-model="sockethub.settings.conn.host" required>' +
              '        </div>' +
              '      </div>' +
              '      <div class="form-group col-xs-12">' +
              '        <label for="port" class="control-label">Port</label>' +
              '        <div class="controls">' +
              '          <input type="text" class="required form-control" name="port" placeholder="Enter port..." ng-model="sockethub.settings.conn.port" required>' +
              '        </div>' +
              '      </div>' +
              '      <div class="form-group col-xs-12">' +
              '        <label for="path" class="control-label">Path</label>' +
              '        <div class="controls">' +
              '          <input type="text" class="required form-control" name="path" placeholder="Enter path (if any)..." ng-model="sockethub.settings.conn.path">' +
              '        </div>' +
              '      </div>' +
              '      <div class="form-group col-xs-12">' +
              '        <div class="">' +
              '          <div class="checkbox">' +
              '            <label>' +
              '              <input type="checkbox" name="tls" ng-model="sockethub.settings.conn.tls"> TLS'+
              '            </label>' +
              '          </div>' +
              '        </div>' +
              '      </div>' +
              '      <div class="form-group col-xs-12">' +
              '        <label for="secret" class="control-label">Secret</label>' +
              '        <div class="controls">' +
              '          <input type="text" class="required form-control" name="secret" placeholder="Enter secret..." ng-model="sockethub.settings.conn.secret" required>' +
              '        </div>' +
              '      </div>' +
              '    </fieldset>' +
              '    <div class="row">' +
              '         <div class="col-xs-2"></div>' +
              '         <div class="col-xs-4" style="padding:0 0 25px;margin:0 0 5px;">' +
              '           <button class="btn btn-primary" ng-click="sockethub.save(sockethub.settings.conn)" ' +
              '                   ng-disabled="!sockethub.settings.verify(\'conn\', sockethub.settings.conn) || saving">Submit</button>' +
              '         </div>' +
              '         <div class="col-sm-6" style="padding:0;margin:0 0 5px;">' +
              '           <button class="btn btn-default" ng-click="sockethub.useDefaults()">Populate Default Settings</button>' +
              '         </div>' +
              '    </div>' +
              '  </form>' +
              '</div>',
    link: function (scope) {
      scope.sockethub = {
        saving: false,
        settings: settings,
        useDefaults: function () {
          console.log('useDefaults() called: ', settings.defaultConn);
          for (var key in settings.defaultConn) {
            settings.conn[key] = settings.defaultConn[key];
          }
        }
      };
      scope.sockethub.save = function (cfg) {
        scope.sockethub.saving = true;
        /*$rootScope.$broadcast('message', {
              type: 'clear'
        });*/
        scope.sockethub.settings.save('conn', cfg);
        $rootScope.$broadcast('message', {
          message: 'attempting to connect to sockethub',
          type: 'info',
          topic: 'sockethub',
          timeout: false
        });
        SH.connect({register: true}).then(function () {
          scope.sockethub.saving = false;
          console.log('connected to sockethub');
          $rootScope.$broadcast('message', {
            message: 'connected to sockethub',
            type: 'success',
            topic: 'sockethub',
            timeout: true
          });
          $rootScope.$broadcast('sockethubSettingsSaved');
        }, function (err) {
          scope.sockethub.saving = false;
          console.log('error connection to sockethub: ', err);
          $rootScope.$broadcast('message', {
            message: err,
            type: 'error',
            topic: 'sockethub',
            timeout: false
          });
        });
      };
    }
  };
}]);