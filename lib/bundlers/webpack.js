// Webpack bundler implementation
'use strict';

var fs = require('fs'),
	path = require('path'),
    File = require('vinyl'),
    through = require('through'),
    webpack = require("webpack"),
    PreLoadedFileSystem = require("../fs/PreLoadedFileSystem"),
    MemoryFileSystem = require("memory-fs"),
    ProgressPlugin = require('webpack/lib/ProgressPlugin');
//  log = require('../../utils/log');

/**
 * Creates a webpack compiler for all resources of the view. It can declare a separate named configuration for js and worker.
 */
module.exports = function(ss,options){
	var clientRoot = path.join(ss.root,options.dirs.client),
        startPath = './__start__.js';
    var packOptions = {
            //This key must be created for storing special information needed by socketstream
            socketstream: {},
            context: clientRoot,
            quiet: false, // hardcoded for now
            progress: true,
            resolve: {
                modulesDirectories: ['web_modules']
            },
            output: {
                path: '/',
                filename: 'main.js'
            },
            watch: true,
            watchDelay: 200*30
        },
        optionStats = {
		    context: clientRoot
	    };

    var fsOut, fsIn,
        validState = false,
        callbacks = [];

    var bundler = {
        define: define,
        load: load,
        toMinifiedCSS: toMinifiedCSS,
        toMinifiedJS: toMinifiedJS,
        asset: {
          entries: entries,

          html: assetHTML,
          loader: assetLoader,
          systemModule: systemModule,
          js: assetJS,
          worker: assetWorker,
          css: assetCSS
        }
    };


    /**
    *
    * @param client Client object with name and id
    * @param paths Configuration for the view source
    * @returns {*} Destinations
    */
    function define(client, paths) {

        if (typeof paths.view !== 'string') {
          throw new Error('You may only define one HTML view per single-page client. Please pass a filename as a string, not an Array');
        }
        if (paths.view.indexOf('.') === -1) {
          throw new Error('The \'' + paths.view + '\' view must have a valid HTML extension (such as .html or .jade)');
        }

        bundler.client = client;

        // Define new client object
        client.paths = ss.bundler.sourcePaths(paths);

        packOptions.entry = paths.code.concat(startPath);
        //console.log('client',client.name,packOptions.entry);
	    var watching = bundler.watching = webpack(packOptions, function(err, stats){
            if (err) throw err;
            if (!packOptions.quiet) {
                console.log('webpack bundler running for "'+client.name+'".');
            }
        });
        var compiler = bundler.compiler = watching.compiler;
        fsOut = bundler.compiler.outputFileSystem = new MemoryFileSystem();
        fsIn = bundler.compiler.inputFileSystem = new PreLoadedFileSystem();

        fsIn.cacheFile(path.join(clientRoot,startPath), ss.bundler.startCode(bundler.client));

        /*
        compiler.plugin('emit',function(emitted) {
            console.log('emit assets',emitted.assets, 'for', client.name);
        });
        */
        //compiler.plugin('resolve',function(context,request) {
        //   console.log('resolving', context, request);
        //});
        compiler.resolvers.normal.plugin('module',function(request,callback) {
            //console.log('requesting module', request.request); // .query .directory

            var module = ss.bundler.systemModule(request.request,false);
            if (module) {
                fsIn.mkdirpSync(module.dir);
                fsIn.writeFileSync(module.path,module.content);
                //console.log('found module',module);
                callback(null, {
                    system: true,
                    path: module.path,
                    query: request.query,
                    file: true, resolved: true
                });
            } else
            // continue with other plugins
                callback();

        });
        compiler.resolvers.normal.plugin('file',function(request,callback) {
            //if (request.system || ss.bundler.systemModule(request.request)) {
            //   console.log('system module file',request.request,request.path);
            //}
            //callback(null, {
            //    system: true,
            //    path: path.join(__dirname, "dummy.js"),
            //    query: request.query,
            //    file: true, resolved: true
            //});
            if (request.request == startPath) {
                request.path = path.join(request.path, request.request);
            }
            callback(null,request);
        });


        compiler.plugin("normal-module-factory", function(nmf) {
            nmf.plugin("after-resolve", function(result,callback) {
                console.log('m> ',result.request, result.resource, result.userRequest);
                callback(null, result);
            })
            /*
            nmf.plugin("before-resolve", function(result, callback) {
                if(!result) return callback();
                if(resourceRegExp.test(result.request)) {
                    if (typeof newResource === 'function') {
                        newResource(result);
                    } else {
                        result.request = newResource;
                    }
                }
                return callback(null, result);
            });
            nmf.plugin("after-resolve", function(result, callback) {
                if(!result) return callback();
                if(resourceRegExp.test(result.resource)) {
                    if (typeof newResource === 'function') {
                        newResource(result);
                    } else {
                        result.resource = path.resolve(path.dirname(result.resource), newResource);
                    }
                }
                return callback(null, result);
            });

             nmf.plugin('after-resolve',function(data,callback) {
             if(!data) return callback();
             console.log('resolved', data.request, 'as', data.resource);
             callback(null, data);
             });
            */

        });


        compiler.plugin('after-emit',afterEmitPlugin);

        if (packOptions.progress) {
            compiler.apply(new ProgressPlugin(function(percentage,msg) {
                percentage = Math.floor(percentage * 100);
                percentage = (percentage<10)? ' '+percentage+'%'  : percentage+'%';
                console.log('Webpacking',client.name+':',percentage,msg);
            }));
        }

        return ss.bundler.destsFor(client);
    }

    function load() {

    }

    //TODO unload the bundler
    function unload() {
        bundler.watching.close(function() {
            //TODO callback
        });
    }

    function afterEmitPlugin(compilation, callback) {
        var contents;
        //?? name for JS
        Object.keys(compilation.assets).forEach(function(outname) {
            if (compilation.assets[outname].emitted) {
                var outpath = path.join(bundler.compiler.outputPath, outname);
                contents = fsOut.readFileSync(outpath);
                console.log('after emit',outpath); //,contents.toString());
                //self.queue(new File({
                //    base: compiler.outputPath,
                //    path: path,
                //    contents: contents,
                //}));
            }
        });
        callback();
    }


  /**
   * list of entries for an asset type relative to the client directory
   *
   * @param assetType
   * @param systemAssets
   * @returns {*}
   */
  function entries(assetType,systemAssets) {


      var _entries = [],
          pathType;

      switch(assetType) {
          case 'css':
              return ss.bundler.entries(bundler.client, assetType);

          case 'js': pathType = 'code'; break;
          case 'worker': pathType = 'code'; break;
      }

      // Libs
      var libs = [bundler.asset.loader()];

      // Modules
      //var mods = [],
      //    _ref = systemAssets.modules;
      //for (var name in _ref) {
      //    if (_ref.hasOwnProperty(name)) {
      //        mods.push( bundler.asset.systemModule(name) );
      //    }
      //}
      _entries = _entries.concat(libs);//.concat(mods);
      _entries.push({file:"main.js", importedBy:"main.js"});

      // entries with blank ones stripped out
      return _entries.filter(function(entry) {
          return !!entry;
      });
  }

  /**
   *
   * @param path
   * @param opts
   * @param cb
   * @returns {*}
   */
  function assetCSS(path, opts, cb) {
	return ss.bundler.loadFile(path, 'css', opts, cb);
  }

  /**
   *
   * @param path
   * @param opts
   * @param cb
   * @returns {*}
   */
  function assetHTML(path, opts, cb) {
	return ss.bundler.loadFile(path, 'html', opts, cb);
  }

  /**
   * @description
   * Chooses a blank loader
   *
   * @param cb
   */
  function assetLoader() {
	return { type: 'loader', names: [], content: ';/* loader */' };
  }

  /**
   *
   * @param name
   * @param content
   * @param options
   * @returns {boolean}
   */
  function systemModule(name) {
	switch(name) {
	  case "eventemitter2":
	  case "socketstream":
	  default:
		//if (client.includes.system) {
		  return ss.bundler.systemModule(name)
		//}
	}
  }


  /**
   *
   * @param path
   * @param opts
   * @param cb
   */
  function assetJS(entryPath, opts, cb) {

      var content = fsOut.readFileSync('/' + entryPath).toString();
      cb(content);
          //res.setHeader("Access-Control-Allow-Origin", "*"); // To support XHR, etc.
          //res.setHeader("Content-Type", mime.lookup(filename));
          //res.setHeader("Content-Length", content.length);
          //if(options.headers) {
          //    for(var name in options.headers) {
          //        res.setHeader(name, options.headers[name]);
          //    }
          //}
          //res.end(content);
  }


  /**
   *
   * @param path
   * @param opts
   * @param cb
   */
  function assetWorker(path, opts, cb) {
	webpack({}, function() {
	  cb('//');
	});
  }

  /**
   *
   * @param files
   * @returns {*}
   */
  function toMinifiedCSS(files) {
	return ss.bundler.minifyCSS(files);
  }

  /**
   *
   * @param files
   * @returns {string}
   */
  function toMinifiedJS() {
	return '// minified JS for '+bundler.client.name;
  }

  return bundler;
};


// Expose webpack if asked
Object.defineProperty(module.exports,'webpack', {
    get: function() {
        return webpack;
    }
});
