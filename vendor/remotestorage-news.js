(function () {
  var moduleName = 'news';
  remoteStorage.defineModule(moduleName, function(privateClient, publicClient) {
    return {
      exports: {
        init: function () {
          privateClient.release('');
          publicClient.release('');
          privateClient.declareType(moduleName, {
            description: 'news articles',
            type: 'object',
            properties: {
              // TODO: need news article schema
            }
          });
        },

        on: privateClient.on,

        remove: privateClient.remove,

        add: function (obj) {
          console.log('attempting add of ', obj);
          if (typeof obj.url === 'string') {
            obj.id = encodeURIComponent(obj.url);
          } else {
            obj.id = privateClient.uuid();
          }
          return privateClient.storeObject(moduleName, obj.id, obj).
            then(function() {
              console.log("RS.rss object saved");
            });
        }
      }
    };
  });

})();
