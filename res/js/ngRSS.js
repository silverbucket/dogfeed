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


/**
 * Factory: RSS
 */
factory('RSS', ['$rootScope', '$q', 'SH', 'configHelper', 'RS',
function ($rootScope, $q, SH, CH, RS) {

  var config = {
  };

  function exists(cfg) {
    return CH.exists(config, cfg);
  }

  function set(cfg) {
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
  }

  function fetch(msg) {
    var defer = $q.defer();
    msg.platform = 'rss';
    msg.verb = 'fetch';
    console.log("FETCH: ", msg);
    SH.submit(msg, 5000).then(defer.resolve, defer.reject);
    return defer.promise;
  }

  var feedData = [];

  SH.on('rss', 'message', function (m) {
    console.log("RSS received message");
    feedData.push(m);
  });


  function addFeed(obj) {
    var defer = $q.defer();
    RS.call('rss', 'add', [obj]).then(function (m) {
      defer.resolve(m);
    }, function (err) {
      defer.reject(err);
    });
    return defer.promise;
  }

  return {
    config: {
      exists: exists,
      set: set,
      data: config
    },
    feeds: {
      data: feedData,
      add: addFeed
    },
    fetch: fetch
  };
}]);