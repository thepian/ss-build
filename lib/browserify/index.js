'use strict';

//TODO try substack/factor-bundle
//TODO base it on browser-pack ignoring all the fancy crap

/**
 * @typedef { name:string, path:string, dir:string, content:string, options:string, type:string } AssetEntry
 */

var builder = require('./builder'),
	path = require('path');

/**
 * @ngdoc service
 * @name bundler.default:default
 * @function
 *
 * @description
 *  The default bundler of HTML, CSS & JS
 *
 * @type {{define: define, load: load, toMinifiedCSS: toMinifiedCSS, toMinifiedJS: toMinifiedJS, asset: {
 *  entries: entries, loader: assetLoader, systemModule: systemModule, js: assetJS, worker: assetWorker, start: assetStart,
 *  css: assetCSS, html: assetHTML}}}
 */
module.exports = function(ss,client,options){

  var clientRoot = path.join(ss.root,options.dirs.client);
  var bundler = ss.bundler.create({
    define: define,
    load: load,
    entries: entries,
    asset: asset
  });
  return bundler;


  function define(paths) {

    if (typeof paths.view !== 'string') {
      throw new Error('You may only define one HTML view per single-page client. Please pass a filename as a string, not an Array');
    }
    if (paths.view.lastIndexOf('.') <= 0) {
      throw new Error('The \'' + paths.view + '\' view must have a valid HTML extension (such as .html or .jade)');
    }

    // Define new client object
    client.paths = ss.bundler.sourcePaths(paths);
    client.constants = paths.constants || paths.consts;
    client.locals = paths.locals;
    client.entryInitPath = ss.bundler.findEntryPoint(client);

    return ss.bundler.destsFor(client);
  }

  function load() {

  	// module-deps cache
    var cache = {}, packageCache = {};

    var globalPaths = ""; // module-deps doesn't search server npm (perhaps client npm)

  	var sysModules = ss.bundler.systemModules(false)
  	sysModules.forEach(function(module) {
  		var logicalPath = path.relative(clientRoot,module.path);
  		console.log("CACHING ---",module.path,module.file,module.name);
  		cache[module.name] = { 
  			id: module.name,
  			deps: {},
  			file: module.name,
  			// file: path.relative(clientRoot,module.path),
  			source:module.content 
  		};
  	});

    // browserify bundling
    this.builder = builder({
    	//TODO debug: options.debug adds sourcemaps in source
    	debug: true,
    	basedir: path.join(ss.root,options.dirs.client),
    	cache: cache,
    	packageCache: packageCache, //??
    	paths: globalPaths
    });
    sysModules.forEach(function(module) {
  		var logicalPath = path.relative(clientRoot,module.path);
      try {
      bundler.builder.require(module.name, {expose:module.name});
      // bundler.builder.external(module.name);
      }
      catch(err) {
        console.log('system module',err);
      }
    });
    client.paths.code.forEach(function(rel) {
	    // bundler.browserify.add(rel);
	    bundler.builder.require(rel,{expose:rel});
    });
    // bundler.builder.external('socketstream');
    // bundler.builder.external('eventemitter2');

    this.builder.on('file',function(file,id,parent){
    	var f = file;
    });
    this.builder.pipeline.on('file',function(file,id,parent){
    	var f = file;
    });


  }

	/**
	* list of entries for an asset type relative to the client directory
	*
	* @param assetType
	* @param systemAssets
	* @returns {*}
	*/
  	function entries(assetType) {

		var pathType;

		switch(assetType) {
			case 'css':
			case 'html':
			case 'tmpl':
			  return ss.bundler.entries(client, assetType);

			case 'js': pathType = 'code'; break;
			case 'worker': pathType = 'code'; break;
		}

		// Libs
		return [ 
			{
			  file: '/main.js', 
			  importedBy: '/main.js', 
        type: 'js',
			  bundle:'js', ext:'js'
			}].concat(bundler.module('libs'));
	}


  //TODO callback(err,output) for pack to flag error
  function asset(entry, opts, cb) {
  	switch(entry.bundle) {
  		case 'js':
  			//TODO out stream instead of Callback
  			// this.browserify.bundle().pipe(out);
        try {
    			this.browserify.bundle(function(err,output) {
    				if (err) {
    					onerror(err);
    					return;
    				}
    				return cb(output);
    			});
        } 
        catch(err) {
          console.log('uncaught error',err);
        }
  			return;
  	}

    ss.bundler.loadFile(entry, opts, null,
      function(output) {
        switch(entry.bundle) {
          case 'html':
            return cb(ss.bundler.injectTailIfNeeded(output,opts));
          case 'css':
            return cb( output );
          case 'worker':
            //TODO
            if (opts.compress && entry.file.indexOf('.min') === -1) {
              output = ss.bundler.minifyJSFile(output, entry.file);
            }
            break;

          default:
            //TODO with options compress saved to avoid double compression
            output = bundler.wrapCode(output, entry, opts);
            if (opts.compress && entry.file.indexOf('.min') === -1) {
              output = ss.bundler.minifyJSFile(output, entry.file);
            }
            return cb(output);
        }
      },
	onerror);

      function onerror(err) {
        ss.log.clientIssue(client,options,err,entry);
        switch(entry.ext) {
          case 'html':
            return cb('Couldn\'t format ' + entry.file + err.userInfoHTML);
          case 'css':
            return cb('/* couldn\'t format ' + entry.file + err.userInfoText+' */');
          default:
            return cb('// couldn\'t format ' + entry.file + err.userInfoText);
        }
      }
    }
};

