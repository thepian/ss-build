// Webpack bundler implementation
'use strict';

var fs = require('fs'),
	path = require('path'),
    File = require('vinyl'),
    through = require('through'),
    webpack = require("webpack"),
    MemoryFileSystem = require("memory-fs"),
    ProgressPlugin = require('webpack/lib/ProgressPlugin');
//  log = require('../../utils/log');

/**
 * Creates a webpack compiler for all resources of the view. It can declare a separate named configuration for js and worker.
 */
module.exports = function(ss,options){
	var clientRoot = path.join(ss.root,options.dirs.client);
    var packOptions = {
            //This key must be created for storing special information needed by socketstream
            socketstream: {},
            context: clientRoot,
            quiet: false, // hardcoded for now
            output: {
                path: '/',
                filename: '[hash].js'
            },
            watch: true,
            watchDelay: 200
        },
        optionStats = {
		    context: clientRoot
	    };

    var fsOut,
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
          start: assetStart,
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

        packOptions.entry = paths.code;
	    var watching = bundler.watching = webpack(packOptions, function(err, stats){
            if (err) throw err;
            if (!packOptions.quiet) {
                console.log('webpack bundler running for "'+client.name+'".');
            }
        });
        var compiler = bundler.compiler = watching.compiler;
        fsOut = bundler.compiler.outputFileSystem = new MemoryFileSystem();
        /*
        compiler.plugin('done', donePlugin);
        compiler.plugin("invalid",invalidPlugin);
        compiler.plugin("compile",compilePlugin);

        compiler.plugin('emit',function(emitted) {
            console.log('emit assets',emitted.assets, 'for', client.name);
        });
        */

        compiler.plugin('after-emit', function(compilation, callback) {
            var contents;
            Object.keys(compilation.assets).forEach(function(outname) {
                if (compilation.assets[outname].emitted) {
                    var outpath = path.join(compiler.outputPath, outname);
                    contents = fsOut.readFileSync(outpath);
                    console.log('after emit',outpath,contents.toString());
                    //self.queue(new File({
                    //    base: compiler.outputPath,
                    //    path: path,
                    //    contents: contents,
                    //}));
                }
            });
            callback();
        });

        //compiler.plugin('watch-run', function(watching) {
        //    console.log('watching', watching);
        //});
        //var watching = bundler.watching = compiler.watch(watchDelay, );

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


    function donePlugin(stats) {
        validState = true;
        process.nextTick(function() {
            if (validState) return;

            var displayStats = !packOptions.quiet && paths.stats !== false; //TODO best home for 'stats' & 'noInfo' flag
            if (displayStats && !(stats.hasErrors() || stats.hasWarnings()) && paths.noInfo) {
                displayStats = false;
            }
            if (displayStats) {
                console.log(stats.toString(paths.stats));
            }

            if (!packOptions.quiet) {
                console.info('webpack:',stats,'bundle is now VALID, running handlers');
            }

            // outstanding callbacks
            while(callbacks.length) {
                var cb = callbacks.pop();
                cb();
            }
            //console.log(fsOut.readFileSync('/tmp.js'));
            //console.log(fsOut.readdirSync('/'));
        });
    }

    function invalidPlugin() {
        if (validState && !packOptions.quiet) {
            console.info('webpack:',/*entryPath,*/ 'bundle is now INVALID', arguments);
        }
        validState = false;
    }

    function compilePlugin() {
        console.info('webpack: compiling', arguments);
        validState = false;
    }

    function ready(fn, info) {
        if (validState) return fn();
        if (!packOptions.quiet) {
            console.log('webpack: wait until bundle finished', info.url);
        }
        callbacks.push(fn);
    }

    function compile(entryPath, opts, cb) {

	var filename = entryPath; //TODO func transform



  }

  /**
   * list of entries for an asset type relative to the client directory
   *
   * @param assetType
   * @returns {*}
   */
  function entries(assetType) {
	return ss.bundler.entries(bundler.client, assetType);
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

      var filename = '/' + 'index.js'; // entryPath; //TODO intelligent path info, module name, repo name, global name

      ready(function() {
          console.info('serving',filename,' or dying.');

          try {
              var stat = fsOut.statSync(filename);
              if(!stat.isFile()) {
                  if (stat.isDirectory()) {
                      filename = path.join(filename, "index.js");
                      stat = fs.statSync(filename);
                      if(!stat.isFile()) throw "next";
                  } else {
                      throw "next";
                  }
              }
          } catch(e) {
              //return next();
              console.log("couldn't stat",filename);
          }

          // server content
          try {
              var content = fsOut.readFileSync(filename);
              cb(content);
          } catch(e) {
              console.log("couldn't read",filename);
          }

          //res.setHeader("Access-Control-Allow-Origin", "*"); // To support XHR, etc.
          //res.setHeader("Content-Type", mime.lookup(filename));
          //res.setHeader("Content-Length", content.length);
          //if(options.headers) {
          //    for(var name in options.headers) {
          //        res.setHeader(name, options.headers[name]);
          //    }
          //}
          //res.end(content);

      }, { url: entryPath });
  }

  /**
   *
   * @param cb
   * @returns {*}
   */
  function assetStart() {
	var output = ss.bundler.startCode(bundler.client);
	return output;
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
