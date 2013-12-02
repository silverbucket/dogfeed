(function () {
  var moduleName = 'sockethub';

  RemoteStorage.defineModule(moduleName, function(privateClient, publicClient) {
    return {
      exports: {
        c: privateClient,

        init: function () {
          privateClient.declareType('config', {
            "description" : "sockethub config file",
            "type" : "object",
            "properties": {
              "host": {
                "type": "string",
                "description": "the hostname to connect to",
                "format": "uri",
                "required": true
              },
              "port": {
                "type": "number",
                "description": "the port number to connect to",
                "required": true
              },
              "path": {
                "type": "string",
                "description": "path portion of the URI, if any",
                "required": false
              },
              "tls": {
                "type": "boolean",
                "description": "whether or not to use TLS",
                "required": false
              },
              "secret": {
                "type": "string",
                "description": "the secret to identify yourself with the sockethub server",
                "required": true
              }
            }
          });
        },

        getConfig: function (name) {
          name = name || 'default';
          name = 'config.' + name + '.json';
          return privateClient.getObject(name);
        },

        writeConfig: function (name, data) {
          if (typeof name !== 'string') {
            throw new Error("remotestorage.socketub.writeConfig requires the unique name of config to write as first param  (e.g. writeConfig('default', {...}); )");
          }
          name = 'config.' + name + '.json';
          return privateClient.storeObject('config', name, data);
        }
      }
    };
  });

})();