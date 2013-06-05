(function () {
  var moduleName = 'rss';

  remoteStorage.defineModule(moduleName, function(privateClient, publicClient) {
    return {
      exports: {
        init: function () {
          privateClient.release('');
          publicClient.release('');
          privateClient.declareType(moduleName, {
            description: 'RSS Feed URLs and related settings',
            key: 'url',
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL of the RSS feed',
                required: true,
                format: "uri"
              },
              name: {
                type: 'string',
                description: 'human readable name of feed',
                required: false
              },
              cache_articles: {
                type: 'number',
                description: 'number of articles to store',
                required: false
              },
              last_fetched: {
                type: 'number',
                description: 'last time feed was fetched',
                required: false
              }
            }
          });
        },

        on: privateClient.on,

        remove: privateClient.remove,

        add: function (obj) {
          if (typeof obj.url === 'string') {
            obj.id = encodeURIComponent(obj.url);
          } else {
            obj.id = privateClient.uuid();
          }
          return privateClient.storeObject(moduleName, obj.id, obj);
        }

      }
    };
  });
})();