// Webpack bundler implementation
// https://medium.com/@tomchentw/why-webpack-is-awesome-9691044b6b8e
'use strict';

var fs = require('fs'),
	path = require('path'),
    File = require('vinyl'),
    through = require('through'),
    webpack = require("webpack"),
    WebpackResolvePlugin = require('./WebpackResolvePlugin'),
    OutputPlugin = require('./OutputPlugin'),
    LogWebpackPlugin = require('./LogWebpackPlugin'),
    PreLoadedFileSystem = require("../fs/PreLoadedFileSystem"),
    MemoryFileSystem = require("memory-fs"),
    WebpackWatchingPlugin = require("../fs/WebpackWatchingPlugin"),
    ProgressPlugin = require('webpack/lib/ProgressPlugin');
//  log = require('../../utils/log');

//TODO module.exports.prototype ...

/**
 * Creates a webpack compiler for all resources of the view. It can declare a separate named configuration for js and worker.
 */
module.exports = function(ss,client,options){
	var clientRoot = path.join(ss.root,options.dirs.client),
        startPath = './__start__';
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
        plugins: [
            new WebpackResolvePlugin(),
            new OutputPlugin(),
            new LogWebpackPlugin(ss)
            //new WebpackWatchingPlugin()
        ],
        watch: true,
        watchDelay: 200*30
    };

    var fsOut, fsIn;


    //TODO just return the object
    var bundler = ss.bundler.create({
        define: define,
        load: load, unload: unload,

        entries: entries,
        module: systemModule,
        asset: asset
    });


    /**
    *
    * @param client Client object with name and id
    * @param paths Configuration for the view source
    * @returns {*} Destinations
    */
    //TODO client is passed on bundler creation not define

    function define(paths) { //TODO (paths), client should be passed during construction.

        if (typeof paths.view !== 'string') {
          throw new Error('You may only define one HTML view per single-page client. Please pass a filename as a string, not an Array');
        }
        if (paths.view.indexOf('.') === -1) {
          throw new Error('The \'' + paths.view + '\' view must have a valid HTML extension (such as .html or .jade)');
        }

        // Define new client object
        client.paths = ss.bundler.sourcePaths(paths);

        packOptions.entry = paths.code.concat(startPath);

        // set of modules that are implemented with AMD
        packOptions.amd = paths.amd;

        //console.log('client entry:',client.name,packOptions.entry);
	    var watching = bundler.watching = webpack(packOptions, function(err){
            if (err) throw err;
            if (!packOptions.quiet) {
                console.log('webpack bundler running for "'+client.name+'".');
            }
        });
        var compiler = bundler.compiler = watching.compiler;
        compiler.clientName = client.name;
        fsOut = compiler.outputFileSystem = new MemoryFileSystem();
        fsIn = compiler.inputFileSystem = new PreLoadedFileSystem();
        //fsIn.watchFileSystem = fs;

        fsIn.cacheFile(path.join(clientRoot,startPath,'index.js'), ss.bundler.startCode(bundler.client));

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

  /**
   * list of entries for an asset type relative to the client directory
   *
   * @param assetType
   * @param systemAssets
   * @returns {*}
   */
  function entries(assetType /*,systemAssets*/) {

      var _entries = [],
          pathType;

      switch(assetType) {
          case 'css':
          case 'html':
          case 'tmpl':
              return ss.bundler.entries(client, assetType);

          case 'js': pathType = 'code'; break;
          case 'worker': pathType = 'code'; break;
      }

      // Libs
      var libs = [/*bundler.asset.loader()*/];

      // Modules
      //var mods = [],
      //    _ref = systemAssets.modules;
      //for (var name in _ref) {
      //    if (_ref.hasOwnProperty(name)) {
      //        mods.push( bundler.asset.systemModule(name) );
      //    }
      //}
      _entries = _entries.concat(libs);//.concat(mods);

        _entries.push({
          file: '/main.js', 
          importedBy: '/main.js', 
          bundle:'js', ext:'js'});

      // client.paths.code.forEach(function(entryPath) {
      //   _entries.push({
      //     file: entryPath, 
      //     importedBy: entryPath, 
      //     bundle:'js', ext:'js'});
      // });


      // entries with blank ones stripped out
      return _entries.filter(function(entry) {
          return !!entry;
      });
  }

    /**
     * @ngdoc method
     * @name bundler.default:default#system
     * @methodOf bundler.default:default
     * @function
     * @description
     * Return entries for the loader/start/module depending on includes.system client config and system assets.
     * Multiple arguments will attempt to add module for the name.
     * Special module names are 'loader' and 'start'.
     *
     * @returns {AssetEntry} Resource entries array
     */
    function systemModule(/* first_name */) {
        var entries = [];

        /*jshint -W084 */
        for(var i= 0,name; name = arguments[i]; ++i) {
            switch(name) {
                case 'loader':
                    entries.push(ss.bundler.browserifyLoader());
                    entries.push(ss.bundler.systemLibs());
                    break;
                case 'start':
                    entries = entries.concat(ss.bundler.constants(client));
                    if (bundler.client.includes.initCode) {
                        entries = entries.concat(ss.bundler.startCode(client));
                    }
                    break;

                //case "eventemitter2":
                //case "socketstream":
                default:
                    entries.push(ss.bundler.systemModule(name));
                    break;
            }
        }

        return entries;
    }


    //TODO callback(err,output) for pack to flag error
    function asset(entry, opts, cb) {
      switch(entry.bundle) {
        case 'html':
          ss.bundler.loadFile(entry, opts, null, function(output) {
            return cb(ss.bundler.injectTailIfNeeded(output,opts));
          }, onerror);
          break;

        case 'css':
          ss.bundler.loadFile(entry, opts, null, function(output) {
            return cb( client.includes.css? output:'');
          }, onerror);
          break;

        case 'js':
          var content = fsOut.readFileSync(path.join('/',entry.file),'utf8');//.toString();
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

              //TODO with options compress saved to avoid double compression
              //output = bundler.wrapCode(output, entry, opts);
              //if (opts.compress && entry.file.indexOf('.min') === -1) {
              //    output = ss.bundler.minifyJSFile(output, entry.file);
              //}
              //return cb(output);
          break;  
      }

      function onerror(err) {
          ss.log.clientIssue(client,options,err,entry);
          switch(entry.ext) {
              case 'html':
                  return cb('Couldn\'t format ' + entry.file + err.userInfoHTML);
              case 'css':
                  return cb('/* couldn\'t format ' + entry.file + err.userInfoText+' */');
              default:
                  return cb('/* couldn\'t format ' + entry.file + err.userInfoText+' */');
          }
      }
    }

  return bundler;
};


// Expose webpack if asked
Object.defineProperty(module.exports,'webpack', {
    get: function() {
        return webpack;
    }
});
