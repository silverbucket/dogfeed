(function () {
  var moduleName = 'rss';

  RemoteStorage.defineModule(moduleName, function(privateClient, publicClient) {
    return {
      exports: {
        init: function () {
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

        on: privateClient.on.bind(privateClient),

        remove: function (url) {
          if (typeof url === 'string') {
            url = encodeURIComponent(escape(url));
          } else {
            return false;
          }
          return privateClient.remove(url);
        },

        add: function (obj) {
          if (typeof obj.url === 'string') {
            obj.id = encodeURIComponent(escape(obj.url));
          } else {
            obj.id = privateClient.uuid();
          }
          return privateClient.storeObject(moduleName, obj.id, obj);
        },

        getAll: privateClient.getAll.bind(privateClient),

        getListing: privateClient.getListing.bind(privateClient)
      }
    };
  });
})();