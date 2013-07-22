(function () {
  var moduleName = 'articles';

  RemoteStorage.defineModule(moduleName, function(privateClient, publicClient) {
    return {
      exports: {
        init: function () {
          privateClient.declareType(moduleName, {
            description: 'collections of articles, typically retreived from RSS feeds',
            key: 'link',
            type: 'object',
            properties: {
              link: {
                type: 'string',
                description: 'link to the article',
                required: true,
                format: "uri"
              },
              title: {
                type: 'string',
                description: 'human readable name article',
                required: false
              },
              date: {
                type: 'number',
                description: 'date of article',
                required: false
              },
              html: {
                type: 'string',
                description: 'html content of the article',
                required: false
              },
              text: {
                type: 'string',
                description: 'text content of the article',
                required: false
              },
              brief_html: {
                type: 'string',
                description: 'a brief blurb of the article, in html',
                required: false
              },
              brief_text: {
                type: 'string',
                description: 'a brief blurb of the article, in text',
                required: false
              },
              read: {
                type: 'boolean',
                description: 'flag if the article has been read or not',
                required: true
              },
              source_link: {
                type: 'string',
                description: 'link to the source feed that this article may have been linked from',
                required: false,
                format: "uri"
              },
              source_title: {
                type: 'string',
                description: 'human readable name  of the source feed that this article may have been linked from',
                required: false
              }
            }
          });
        },

        on: privateClient.on,

        remove: privateClient.remove,

        update: function (obj) {
          if (typeof obj.link === 'string') {
            obj.id = encodeURIComponent(escape(obj.link));
          } else {
            obj.id = privateClient.uuid();
          }

          if (typeof obj.read === 'undefined') {
            obj.read = false;
          }

          return privateClient.storeObject(moduleName, obj.id, obj);
        },

        get: privateClient.getObject,
        getAll: privateClient.getAll,
        getListing: privateClient.getListing
      }
    };
  });

})();
