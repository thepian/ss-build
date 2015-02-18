'use strict';

var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    systemjs = require('systemjs'),
    jspm = require('jspm'),
    Readable = require('stream').Readable,
    File = require('vinyl'),
    through2 = require('through2');

// SystemJS 'JS' wrapper for SocketStream 0.3

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

    return {

        name: 'EcmaScript',

        extensions: ['js','es6'],

        assetType: 'js',

        contentType: 'text/javascript; charset=utf-8',

        compile: function(pathEntry, options, cb) {

            var locals = {};

            // Merge any locals passed to config.locals
            if (config.locals && typeof(config.locals) === 'object')
                for (var attrname in config.locals) { locals[attrname] = config.locals[attrname]; }

            // If passing optional headers for main view HTML
            if (options && options.headers) locals['SocketStream'] = options.headers;


            function handleFatalError(err) {
                console.error('webpack issue with',pathEntry,err, '\n',err.stack);
                cb('// Failed to compile, see log.')
            }
            function handleSoftErrors(errors) {
                console.log('Errors:', errors.join('\n'));
                cb('// Failed to compile, hasErrors.');
            }
            function handleWarnings(warnings) {
                console.log('Errors:', warnings.join('\n'));
            }

            var basePath = config.basePath || process.cwd(), //TODO project dir
                relPath = './' + path.relative(basePath, pathEntry);//.replace('.js','').replace('.es6','');


            //@see /lib/bundler/webpackLoader.js
            //packOptions.nof5.testScripts = testScripts;
            //packOptions.resolve.loaders.push(require("./webpackLoader.js"));

            builder.build(relPath, 'outfile.js', {
                config: {
                    baseURL: basePath,

                    // any map config
                    //map: {
                    //    jquery: 'jquery-1.2.3/jquery'
                    //},

                    // etc. any SystemJS config
                }
            })
                .then(function() {
                    console.log('Build complete');
                })
                .catch(function(err) {
                    console.log('Build error');
                    console.log(err);
                });
        }
    };
};


