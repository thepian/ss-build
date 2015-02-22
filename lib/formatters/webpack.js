'use strict';

var _ = require('lodash'),
    fs = require('fs'),
    pathlib = require('path'),
    webpack = require('webpack'),
    Readable = require('stream').Readable,
    File = require('vinyl'),
    through2 = require('through2');

var MemoryFileSystem = require("memory-fs");

// WebPack 'JS' wrapper for SocketStream 0.3

exports.init = function(root, config) {

    if (!(config && typeof(config) === 'object')) config = {};

    var packOptions = {
        //This key must be created for storing special information needed by socketstream
        socketstream: {},
        context: root,
        ouput: {
            filename: 'tmp.js',
            path: '/'
        }
    };
    var compiler = webpack(packOptions);
    var fsOut = compiler.outputFileSystem = new MemoryFileSystem(),
        validState = false,
        callbacks = [];

    compiler.plugin('done',function() {
        validState = true;
        process.nextTick(function() {
            if (validState) return;

            // outstanding callbacks
            while(callbacks.length) {
                callbacks.pop()();
            }
        });
    });

    function ready(fn) {
        callbacks.push(fn);
    }

    return {

        name: 'EcmaScript',

        extensions: ['js','es6'],

        assetType: 'js',

        contentType: 'text/javascript; charset=utf-8',

        compile: function(path, options, cb) {

            var locals = {};

            // Merge any locals passed to config.locals
            if (config.locals && typeof(config.locals) === 'object')
                for (var attrname in config.locals) { locals[attrname] = config.locals[attrname]; }

            // If passing optional headers for main view HTML
            if (options && options.headers) locals.SocketStream = options.headers;


            function handleFatalError(err) {
                console.error('webpack issue with',path,err, '\n',err.stack);
                cb('// Failed to compile, see log.');
            }
            function handleSoftErrors(errors) {
                console.log('Errors:', errors.join('\n'));
                cb('// Failed to compile, hasErrors.');
            }
            function handleWarnings(warnings) {
                console.log('Errors:', warnings.join('\n'));
            }

            var basePath = config.basePath || process.cwd(), //TODO project dir
                relPath = './' + pathlib.relative(basePath, path);//.replace('.js','').replace('.es6','');


            //@see /lib/bundler/webpackLoader.js
            //packOptions.nof5.testScripts = testScripts;
            //packOptions.resolve.loaders.push(require("./webpackLoader.js"));

            console.log('packing',basePath, relPath);

            var filename = path;

            //TODO set input/output path
            ready(function() {
                var stat = fsOut.statSync(filename);
                if (!stat.isFile()) {
                    if (stat.isDirectory()) {
                        filename = pathlib.join(filename,'index.html');
                        stat = fsOut.statSync(filename);
                        if (!stat.isFile()) {
                            throw "Not a file";
                        }
                    }
                    else {
                        throw "Not a file";
                    }
                }

                var content = fsOut.readFileSync(filename);
                cb(content);
            });

            /*
             compiler.plugin("after-emit", function(compilation, callback) {
             console.log('after packing',basePath, relPath);
             compilation.assets.forEach(function(asset) {
             var path = fsOut.join(compiler.outputPath, asset.name);
             console.log(asset.name, path);
             var contents = fsOut.readFileSync(path);

             //TODO what about multiple resulting files
             cb(contents);
             //stream.push(new File({
             //    base: compiler.outputPath,
             //    path: path,
             //    contents: contents
             //});
             });
             });
             */

            // input + output path for filename

            compiler.run(function(err, stats) {
                if(err)
                    return handleFatalError(err);
                var jsonStats = stats.toJson();
                if(jsonStats.errors.length > 0)
                    return handleSoftErrors(jsonStats.errors);
                if(jsonStats.warnings.length > 0)
                    handleWarnings(jsonStats.warnings);
                //successfullyCompiled(stats);
            });
        }
    };
};


