'use strict';

var _ = require('lodash'),
	path = require('path'),
	Readable = require('stream').Readable,
	File = require('vinyl'),
	through2 = require('through2'),
	defaults = {
		systemPath: "system.js",
		initCodePath: "initCode.js",
		compress: true
	};

module.exports = function(ss) {
	var responders = ss.responders.load();
	
	return {
		_assetStream: function(config,type) {
			var contents = ss.client.assets.serve[type]({ compress:config.compress }),
				stream = new Readable();

			stream.push(contents);
			stream.push(null);

			return stream;
		},

		_createSourceStream: function(config,filename) {
			var ins = through2(), out = false;

			/*
			if (filename) {
				filename = path.resolve(filename);
			}
			*/

			var f = { contents: ins };
			if (filename) {
				f.base = config.base || process.cwd();
				f.path = path.join(f.base, filename);
			}
			console.log(f.base, f.path);

			var src = new File(f);
			return through2({
				objectMode: true
			}, function(chunk, enc, next) {
				if (!out) {
					this.push(src);
					out = true;
				}

				ins.push(chunk);
				next();
			}, function() {
				ins.push(null);
				this.push(null);
			});
		},

		_sourceStream: function(config,type,filename) {
			config = _.defaults(config || {}, defaults);
			var filename = config[{ "js":"systemPath", "initCode":"initCodePath"}[type]];
			return this._assetStream(config,type).pipe(this._createSourceStream(config,filename));
		},

		js: function(config) {
			console.log("js...", config.systemPath);
			return this._sourceStream(config, "js", config.systemPath);
		},

		initCode: function(config) {
			return this._sourceStream(config, "initCode", config.initCodePath);
		}
	};
};