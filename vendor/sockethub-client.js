/**
 * sockethub-client 0.1
 *
 * © 2013 Niklas E. Cathor (https://github.com/nilclass)
 * © 2013 Nick Jennings (https://github.com/silverbucket)
 *
 * sockethub-client is dual-licensed under either the MIT License or GPLv3 (at your choice).
 * See the files LICENSE-MIT and LICENSE-GPL for details.
 *
 * The latest version of sockethub-client can be found here:
 *   git://github.com/sockethub/sockethub-client.git
 *
 * For more information about sockethub visit http://sockethub.org/.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.SockethubClient = factory();
    }
}(this, function () {
/**
 * almond 0.1.4 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name],
                        config: makeConfig(name)
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else if (!defining[depName]) {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("vendor/almond", function(){});

/**
 * This file is part of sockethub-client.
 *
 * © 2013 Niklas E. Cathor (https://github.com/nilclass)
 * © 2013 Nick Jennings (https://github.com/silverbucket)
 *
 * sockethub-client is dual-licensed under either the MIT License or GPLv3 (at your choice).
 * See the files LICENSE-MIT and LICENSE-GPL for details.
 *
 * The latest version of sockethub-client can be found here:
 *   git://github.com/sockethub/sockethub-client.git
 *
 * For more information about sockethub visit http://sockethub.org/.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

define('sockethub/extend',[], function() {
  function extend(target) {
    var sources = Array.prototype.slice.call(arguments, 1);
    sources.forEach(function(source) {
      for(var key in source) {
        if(typeof(source[key]) === 'object' &&
           typeof(target[key]) === 'object') {
          extend(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    });
    return target;
  }

  return extend;
});
(function() {
  function getPromise(builder) {
    var promise;

    if(typeof(builder) === 'function') {
      setTimeout(function() {
        try {
          builder(promise);
        } catch(e) {
          promise.reject(e);
        }
      }, 0);
    }

    var consumers = [], success, result;

    function notifyConsumer(consumer) {
      if(success) {
        var nextValue;
        if(consumer.fulfilled) {
          try {
            nextValue = [consumer.fulfilled.apply(null, result)];
          } catch(exc) {
            consumer.promise.reject(exc);
            return;
          }
        } else {
          nextValue = result;
        }
        if(nextValue[0] && typeof(nextValue[0].then) === 'function') {
          nextValue[0].then(consumer.promise.fulfill, consumer.promise.reject);
        } else {
          consumer.promise.fulfill.apply(null, nextValue);
        }
      } else {
        if(consumer.rejected) {
          var ret;
          try {
            ret = consumer.rejected.apply(null, result);
          } catch(exc) {
            consumer.promise.reject(exc);
            return;
          }
          if(ret && typeof(ret.then) === 'function') {
            ret.then(consumer.promise.fulfill, consumer.promise.reject);
          } else {
            consumer.promise.fulfill(ret);
          }
        } else {
          consumer.promise.reject.apply(null, result);
        }
      }
    }

    function resolve(succ, res) {
      if(result) {
        console.log("WARNING: Can't resolve promise, already resolved!");
        return;
      }
      success = succ;
      result = Array.prototype.slice.call(res);
      setTimeout(function() {
        var cl = consumers.length;
        if(cl === 0 && (! success)) {
          // console.error("Possibly uncaught error: ", result);
        }
        for(var i=0;i<cl;i++) {
          notifyConsumer(consumers[i]);
        }
        consumers = undefined;
      }, 0);
    }

    promise = {

      then: function(fulfilled, rejected) {
        var consumer = {
          fulfilled: typeof(fulfilled) === 'function' ? fulfilled : undefined,
          rejected: typeof(rejected) === 'function' ? rejected : undefined,
          promise: getPromise()
        };
        if(result) {
          setTimeout(function() {
            notifyConsumer(consumer)
          }, 0);
        } else {
          consumers.push(consumer);
        }
        return consumer.promise;
      },

      fulfill: function() {
        resolve(true, arguments);
        return this;
      },
      
      reject: function() {
        resolve(false, arguments);
        return this;
      }
      
    };

    return promise;
  };

  if(typeof(module) !== 'undefined') {
    module.exports = getPromise;
  } else if(typeof(define) === 'function') {
    define('vendor/promising',[], function() { return getPromise; });
  } else if(typeof(window) !== 'undefined') {
    window.promising = getPromise;
  }

})();

/**
 * This file is part of sockethub-client.
 *
 * © 2013 Niklas E. Cathor (https://github.com/nilclass)
 * © 2013 Nick Jennings (https://github.com/silverbucket)
 *
 * sockethub-client is dual-licensed under either the MIT License or GPLv3 (at your choice).
 * See the files LICENSE-MIT and LICENSE-GPL for details.
 *
 * The latest version of sockethub-client can be found here:
 *   git://github.com/sockethub/sockethub-client.git
 *
 * For more information about sockethub visit http://sockethub.org/.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

define('sockethub/event_handling',[], function () {

  var methods = {
    /**
     * Method: on
     *
     * Install an event handler for the given event name.
     */
    on: function (eventName, handler) {
      this._validateEvent(eventName);
      this._handlers[eventName].push(handler);
    },

    _emit: function (eventName) {
      this._validateEvent(eventName);
      var args = Array.prototype.slice.call(arguments, 1);
      this._handlers[eventName].forEach(function (handler) {
        handler.apply(this, args);
      });
    },

    _validateEvent: function (eventName) {
      if(! (eventName in this._handlers)) {
        throw "Unknown event: " + eventName;
      }
    },

    _delegateEvent: function (eventName, target) {
      target.on(eventName, function (event) {
        this._emit(eventName, event);
      }.bind(this));
    },

    _addEvent: function (eventName) {
      this._handlers[eventName] = [];
    }
  };

  /**
   * Function: eventHandling
   *
   * Mixes event handling functionality into an object.
   *
   * The first parameter is always the object to be extended.
   * All remaining parameter are expected to be strings, interpreted as valid event
   * names.
   *
   * Example:
   *   (start code)
   *   var MyConstructor = function () {
   *     eventHandling(this, 'connected', 'disconnected');
   *
   *     this._emit('connected');
   *     this._emit('disconnected');
   *     // this would throw an exception:
   *     //this._emit('something-else');
   *   };
   *
   *   var myObject = new MyConstructor();
   *   myObject.on('connected', function () { console.log('connected'); });
   *   myObject.on('disconnected', function () { console.log('disconnected'); });
   *   // this would throw an exception as well:
   *   //myObject.on('something-else', function () {});
   *
   *   (end code)
   */
  return function (object) {
    var eventNames = Array.prototype.slice.call(arguments, 1);
    for (var key in methods) {
      object[key] = methods[key];
    }
    object._handlers = {};
    eventNames.forEach(function (eventName) {
      object._addEvent(eventName);
    });
  };
});

/**
 * This file is part of sockethub-client.
 *
 * © 2013 Niklas E. Cathor (https://github.com/nilclass)
 * © 2013 Nick Jennings (https://github.com/silverbucket)
 *
 * sockethub-client is dual-licensed under either the MIT License or GPLv3 (at your choice).
 * See the files LICENSE-MIT and LICENSE-GPL for details.
 *
 * The latest version of sockethub-client can be found here:
 *   git://github.com/sockethub/sockethub-client.git
 *
 * For more information about sockethub visit http://sockethub.org/.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

define('sockethub/client',[
  './extend',
  '../vendor/promising',
  './event_handling'
], function (extend, promising, eventHandling) {

  /**
   * Class: SockethubClient
   *
   * Provides a boilerplate client, that knows no verbs and no meaning in the
   * messages it processes, apart from the "rid" property.
   *
   * The client can then be extended with functionality, by using <declareVerb>,
   * or be used directly by sending objects using <sendObject>.
   *
   * Constructor parameters:
   *   jsonClient - a <JSONClient> instance
   */
  var SockethubClient = function (jsonClient, options) {
    this.jsonClient = jsonClient;
    this.options = options;

    this._ridPromises = {};

    eventHandling(this, 'connected', 'disconnected', 'failed', 'message',
                        'unexpected-response', 'reconnecting', 'reconnected');

    jsonClient.on('message', this._processIncoming.bind(this));
    this._delegateEvent('connected', jsonClient);
    this._delegateEvent('disconnected', jsonClient);
    this._delegateEvent('failed', jsonClient);
    this._delegateEvent('reconnecting', jsonClient);
    this._delegateEvent('reconnected', jsonClient);

    this.__defineGetter__('connected', function () {
      return this.jsonClient.connected;
    });
  };

  SockethubClient.prototype = {

    /**
     * Method: declareVerb
     *
     * Declares a new verb for this client.
     *
     * Declaring a verb will:
     *   - Add a method to the client, named like the verb.
     *   - Convert positional arguments of that method into message attributes.
     *   - Keep a template for messages sent using that verb.
     *
     * Parameters:
     *   verb           - (string) name of the verb, such as "post"
     *   attributeNames - (array) list of positional arguments for the verb method
     *   template       - (object) template to build messages upon
     *
     * Example:
     *   (start code)
     *
     *   // declare the "register" verb:
     *   client.declareVerb('register', ['object'], {
     *     platform: 'dispatcher'
     *   });
     *
     *   // send a "register" message, using the just declared method:
     *   client.register({ secret: '123' });
     *
     *   // will send the following JSON:
     *   {
     *     "verb": "register",
     *     "platform": "dispatcher",
     *     "object": {
     *       "secret": "123"
     *     },
     *     "rid": 1
     *   }
     *
     *   (end code)
     *
     * Receiving the response:
     *   The declared method returns a promise, which will notify you as soon as
     *   a response with the right "rid" is received.
     *
     * Example:
     *   (start code)
     *
     *   client.register({ secret: 123 }).
     *     then(function(response) {
     *       // response received
     *     }, function(error) {
     *       // something went wrong
     *     });
     *
     *   (end code)
     *
     * Nested attributes:
     *   If you want your verb methods to be able to modify deeply nested JSON
     *   structures through positional arguments, you can specify the path using
     *   dot notation.
     *
     * Example:
     *   (start code)
     *
     *   client.declareVerb('set', ['target.platform', 'object'], {
     *     platform: "dispatcher",
     *     target: {}
     *   });
     *
     *   client.set("smtp", {
     *     server: "example.com"
     *   });
     *
     *   // passing in "smtp" as "platform" here does not alter the toplevel
     *   // "platform" attribute, but instead adds one to "target":
     *   {
     *     "verb": "set",
     *     "platform": "dispatcher",
     *     "target": {
     *       "platform": "smtp"
     *     },
     *     "object": {
     *       "server": "example.com"
     *     }
     *   }
     *
     *   (end code)
     */
    declareVerb: function (verb, attributeNames, template, decorator) {
      this[verb] = function () {
        //
        var args = Array.prototype.slice.call(arguments);
        var object = extend({}, template, { verb: verb });
        attributeNames.forEach(function (attrName, index) {
          var value = args[index];
          var current = this._getDeepAttr(object, attrName);
          if (typeof(current) === 'undefined' && typeof(value) === 'undefined') {
            throw new Error(
              "Expected a value for parameter " + attrName + ", but got undefined!"
            );
          }
          this._setDeepAttr(object, attrName, value);
        }.bind(this));
        var extensionArg = args[attributeNames.length];
        if (typeof(extensionArg) === 'object') {
          extend(object, extensionArg);
        }
        return this.sendObject(object);
      };
      if (decorator) {
        this[verb] = decorator(this[verb].bind(this));
      }
    },

    declareEvent: function (eventName) {
      this._addEvent(eventName);
    },

    disconnect: function () {
      this.jsonClient.disconnect();
    },

    // incremented upon each call to sendObject
    _ridCounter: 0,

    /**
     * Method: sendObject
     *
     * Sends the object through the JSONClient, attaching a "rid" attribute to
     * link it to a response.
     *
     * Returns a promise, which will be fulfilled as soon as a response carrying
     * the same "rid" attribute is received.
     *
     * You can either call this directly, building messages by hand or first
     * declare a verb using <declareVerb>, which will then call sendObject for you.
     *
     */
    sendObject: function (object) {
      var promise = promising();
      // generate a new rid and store promise reference:
      var rid = ++this._ridCounter;
      this._ridPromises[rid] = promise;
      object = extend(object, { rid: rid });
      console.log('SEND', object);
      // non-dectructively add 'rid' and send!
      this.jsonClient.send(object);
      return promise;
    },

    // _getDeepAttr / _setDeepAttr are used in declareType.

    _getDeepAttr: function (object, path, _parts) {
      var parts = _parts || path.split('.');
      var next = object[parts.shift()];
      return parts.length ? this._getDeepAttr(next, undefined, parts) : next;
    },

    _setDeepAttr: function (object, path, value, _parts) {
      var parts = _parts || path.split('.');
      if(parts.length > 1) {
        this._setDeepAttr(object[parts.shift()], undefined, value, parts);
      } else {
        object[parts[0]] = value;
      }
    },

    _processIncoming: function (object) {
      console.log(object.verb === 'confirm' ? 'CONFIRM' : 'RECEIVE', object);
      var rid = object.rid;
      if (typeof(rid) !== 'undefined') {
        var promise = this._ridPromises[rid];
        if (promise) {
          // rid is known.
          if (object.verb === 'confirm') {
            // exception: confirm results are ignored, unless their status is fals
            if (object.status) {
              return;
            } else {
              promise.reject(object);
            }
          } else {
            if ('status' in object) {
              promise[object.status ? 'fulfill' : 'reject'](object);
            } else {
              promise.fulfill(object);
            }
          }
          delete this._ridPromises[rid];
        } else {
          // rid is not known. -> unexpected response!
          this._emit('unexpected-response', object);
        }
      } else {
        // no rid set. -> this is not a response, but a message!
        this._emit('message', object);
      }
    }

  };

  return SockethubClient;
});
/**
 * This file is part of sockethub-client.
 *
 * © 2013 Niklas E. Cathor (https://github.com/nilclass)
 * © 2013 Nick Jennings (https://github.com/silverbucket)
 *
 * sockethub-client is dual-licensed under either the MIT License or GPLv3 (at your choice).
 * See the files LICENSE-MIT and LICENSE-GPL for details.
 *
 * The latest version of sockethub-client can be found here:
 *   git://github.com/sockethub/sockethub-client.git
 *
 * For more information about sockethub visit http://sockethub.org/.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

define('sockethub/json_client',['./event_handling'], function (eventHandling) {

  /**
   * Class: JSONClient
   *
   * Exchanges JSON messages via a WebSocket
   *
   * Parameters:
   *   socket - a WebSocket object
   *
   */
  var JSONClient = function (uri, protocol, reconnect) {

    this.uri = uri;
    this.protocol = protocol;
    this.reconnect = reconnect || false;

    eventHandling(
      this,

      /**
       * Event: message
       *
       * Emitted when a new JSON message is received.
       *
       * Parameters:
       *   object - the unpacked JSON object
       *
       */
      'message',

      /**
       * Event: connected
       *
       * Emitted when the websocket is opened.
       */
      'connected',

      /**
       * Event: reconnecting
       *
       * Emitted when the websocket is closed but reconnecting.
       */
      'reconnecting',

      /**
       * Event: reconnected
       *
       * Emitted when the websocket is opened after a reconnect (old handlers
       * still active).
       *
       */
      'reconnected',

      /**
       * Event: disconnected
       *
       * Emitted when the websocket is closed.
       */
      'disconnected',

      /**
       * Event: disconnected
       *
       * Emitted when the websocket connection failed.
       */
      'failed'
    );

    this.wsConnect();
  };

  JSONClient.prototype = {

    wsConnect: function () {
      this.socket = null;
      delete this.socket;
      var ws = new WebSocket(this.uri, this.protocol);
      this.socket = ws;
      // start listening.
      this._listen();
    },

    /**
     * Method: send
     *
     * Serialize given object and send it.
     */
    send: function (object) {
      this.socket.send(JSON.stringify(object));
    },

    /**
     * Method: disconnect
     *
     * Close the socket.
     */
    disconnect: function () {
      this.socket.close();
    },

    // Start listening on socket
    _listen: function () {
      this.socket.onmessage = this._processMessageEvent.bind(this);
      this.connected = false;
      var _this = this;

      this.socket.onopen = function () {
        this.connected = true;
        if (this.reconnecting) {
          this._emit('reconnected');
          this.reconnecting = false;
        } else {
          this._emit('connected');
        }
      }.bind(this);

      this.socket.onclose = function () {
        if ((this.connected) &&
            (!this.reconnect)) {
          console.log('sockethub-client disconnected, not reconnecting...');
          this._emit('disconnected');
          this.connected = false;
        } else if ((this.connected) &&
                   (this.reconnect)) {
          this._emit('reconnecting');
          this.connected = false;
          this.reconnecting = true;
          console.log('sockethub-client disconnected, attempting reconnect...');
          this.wsConnect();
        } else if ((this.reconnecting) &&
                   (!this.connected)) {
          // failed reconnecting...
          setTimeout(function () {
            console.log('sockethub-client attempting reconnect after 5s');
            _this.wsConnect();
          }, 5000);
        } else {
          this._emit('failed');
        }
      }.bind(this);
    },

    // Emit "message" event
    _processMessageEvent: function (event) {
      this._emit('message', JSON.parse(event.data));
    }

  };

  return JSONClient;

});

/**
 * This file is part of sockethub-client.
 *
 * © 2013 Niklas E. Cathor (https://github.com/nilclass)
 * © 2013 Nick Jennings (https://github.com/silverbucket)
 *
 * sockethub-client is dual-licensed under either the MIT License or GPLv3 (at your choice).
 * See the files LICENSE-MIT and LICENSE-GPL for details.
 *
 * The latest version of sockethub-client can be found here:
 *   git://github.com/sockethub/sockethub-client.git
 *
 * For more information about sockethub visit http://sockethub.org/.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

define('sockethub/connect',[
  './extend',
  './json_client',
  './client'
], function (extend, JSONClient, SockethubClient) {

  var DEFAULT_PORT = 10550;
  var DEFAULT_PATH = '/sockethub';
  var DEFAULT_PROTOCOL = 'sockethub';

  /**
   * Method: SockethubClient.connect
   *
   * Singleton method, used to construct a new client.
   *
   * Takes either a URI or an Object with connection options as it's only argument.
   * Returns a new <SockethubClient> instance, connected to a WebSocket through a
   * <JSONClient>.
   */
  var connect = function (uriOrOptions, options) {
    var uri;
    if (typeof(options) !== 'object') {
      options = {
        reconnect: true
      };
    }

    if (typeof(uriOrOptions) === 'string' &&
       ! uriOrOptions.match(/wss?\:\/\//)) {
      uriOrOptions = { host: uriOrOptions };
    }

    if (typeof(uriOrOptions) === 'string') {
      uri = uriOrOptions;
    } else if (typeof(uriOrOptions) === 'object') {
      extend(options, uriOrOptions);
      if (! options.host) {
        throw "Required 'host' option not present";
      }
      if (! options.port) {
        options.port = DEFAULT_PORT;
      }
      if (! options.path) {
        options.path = DEFAULT_PATH;
      }

      // by default we reconnect
      options.reconnect = (typeof options.reconnect === 'boolean') ? options.reconnect : true;

      uri = (
        (options.ssl ? 'wss' : 'ws') +
            '://' +
            options.host +
            ':' +
            options.port +
            options.path
      );
    } else {
      throw "SockethubClient.connect expects a URI, specified via a String or Object.";
    }
    return new SockethubClient(new JSONClient(uri, DEFAULT_PROTOCOL, options.reconnect), options);
  };

  return connect;
});

/**
 * This file is part of sockethub-client.
 *
 * © 2013 Niklas E. Cathor (https://github.com/nilclass)
 * © 2013 Nick Jennings (https://github.com/silverbucket)
 *
 * sockethub-client is dual-licensed under either the MIT License or GPLv3 (at your choice).
 * See the files LICENSE-MIT and LICENSE-GPL for details.
 *
 * The latest version of sockethub-client can be found here:
 *   git://github.com/sockethub/sockethub-client.git
 *
 * For more information about sockethub visit http://sockethub.org/.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

define('sockethub/remoteStorage',[], function() {

  var module = function(privateClient, publicClient) {
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
        "secret": {
          "type": "string",
          "description": "the secret to identify yourself with the sockethub server",
          "required": true
        }
      }
    });

    return {
      exports: {
        getConfig: function() {
          return privateClient.getObject('config.json');
        },
        writeConfig: function(data) {
          //console.log(' [RS] writeConfig()');
          return privateClient.storeObject('config', 'config.json', data);
        }
      }
    };
  };

  function connectRemoteStorage(remoteStorage) {
    remoteStorage.defineModule('sockethub', module);
    remoteStorage.access.claim('sockethub', 'rw');

    var token = remoteStorage.getBearerToken();
    if(typeof(token) === "string" && token.length > 0) {
      if(! this.options.register) {
        this.options.register = {};
      }
      // FIXME: this basically copies remoteStorage.access._scopeModeMap, which is
      //   private. Instead remoteStorage.js should give public access to the scope
      //   mode map.
      var scope = {};
      remoteStorage.access.scopes.forEach(function(key) {
        scope[key] = remoteStorage.access.get(key);
      });

      var storageInfo = remoteStorage.getStorageInfo();
      storageInfo.type = String(storageInfo.type); // wtf?

      this.options.register.remoteStorage = {
        storageInfo: storageInfo,
        bearerToken: token,
        scope: scope
      };
    }
  }

  return connectRemoteStorage;

});
/**
 * This file is part of sockethub-client.
 *
 * © 2013 Niklas E. Cathor (https://github.com/nilclass)
 * © 2013 Nick Jennings (https://github.com/silverbucket)
 *
 * sockethub-client is dual-licensed under either the MIT License or GPLv3 (at your choice).
 * See the files LICENSE-MIT and LICENSE-GPL for details.
 *
 * The latest version of sockethub-client can be found here:
 *   git://github.com/sockethub/sockethub-client.git
 *
 * For more information about sockethub visit http://sockethub.org/.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

define('verbs/core',[], function () {

  var coreVerbs = function (client) {

    // Verb: ping
    //
    // Sends a "ping" command to the sockethub and calculates it's offset
    // upon a reply.
    //
    // Example:
    //   (start code)
    //
    //   var client = SockethubClient.connect({ host: 'localhost' });
    //
    //   client.on('connected', function() {
    //     client.register({ secret: '123' }).
    //       then(function() {
    //         return client.ping();
    //       }).
    //       then(function(response) {
    //         console.log('sockethub reply received after: ' + response.offset + 'ms');
    //       }, function(error) {
    //         console.log('sending ping failed: ' + error.message);
    //       });
    //   });
    //
    //   (end code)
    //
    client.declareVerb('ping', [], {
      platform: 'dispatcher'
    }, function(method) {
      return function(object) {
        if(typeof(object) !== 'object') {
          object = {};
        }
        if(typeof(object.timestamp) !== 'number') {
          object.timestamp = new Date().getTime();
        }
        return method(object).
          then(function(result) {
            result.offset = new Date().getTime() - object.timestamp;
            return result;
          });
      };
    });

    // Verb: register
    client.declareVerb('register', ['object'], {
      platform: 'dispatcher'
    }, function (method) {
      return function () {
        if (client.registered) {
          console.log('WARNING: already registered!');
          console.trace();
        }
        return method.apply(this, arguments).then(function (response) {
          client.registered = response.status;
          if (! response.status) {
            setTimeout(function () {
              client._emit('registration-failed', response);
            }, 0);
            throw "registration failed: " + response.message;
          }
          setTimeout(function () { client._emit('registered'); }, 0);
          return response;
        });
      };
    });

    client.registered = false;

    // Event: registered
    //
    // Fired when registration succeeded.
    client.declareEvent('registered');

    // Event: registration-failed
    //
    // Fired when registration failed.
    client.declareEvent('registration-failed');

    function initRegister() {
      console.log('options passed to connect:', client.options);
      if (client.options.register) {
        console.log('automatic registration!');
        client.register(client.options.register);
      }
    }
    // Automatic registration, when 'register' option was passed during 'connect'.
    client.on('connected', initRegister);
    client.on('reconnected', initRegister);

    client.on('disconnected', function () {
      // make sure 'registered' flag is not set, in case the client is re-used.
      delete client.registered;
    });

    // Verb: set
    client.declareVerb('set', ['platform', 'actor.address', 'object'], {
      target: {},
      actor: {}
    });

  };

  return coreVerbs;
});

/**
 * This file is part of sockethub-client.
 *
 * © 2013 Niklas E. Cathor (https://github.com/nilclass)
 * © 2013 Nick Jennings (https://github.com/silverbucket)
 *
 * sockethub-client is dual-licensed under either the MIT License or GPLv3 (at your choice).
 * See the files LICENSE-MIT and LICENSE-GPL for details.
 *
 * The latest version of sockethub-client can be found here:
 *   git://github.com/sockethub/sockethub-client.git
 *
 * For more information about sockethub visit http://sockethub.org/.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

define('sockethub-client',[
  'sockethub/client',
  'sockethub/connect',
  'sockethub/remoteStorage',
  'verbs/core'
], function(SockethubClient, connect, connectRemoteStorage, coreVerbs) {

  SockethubClient.connect = function() {
    var client = connect.apply(this, arguments);
    // extend the client with core verbs
    coreVerbs(client);
    return client;
  };

  SockethubClient.prototype.connectStorage = connectRemoteStorage;

  return SockethubClient;

});


    return require('sockethub-client');
}));