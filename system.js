'use strict';

var ss = require('socketstream'),
	_ = require('lodash'),
	File = require('vinyl');

module.exports = {
	js: function(config) {
		config = _.defaults(config, {
			compress: true
		});
		var contents = ss.client.assets.serve.js({ compress:config.compress });
		var f = {
			path: "system.js",
			contents: new Buffer(contents)
		};

		var src = new File(f);
		return src;
	},

	initCode: function(config) {
		config = _.defaults(config, {
			compress: true
		});
		var contents = ss.client.assets.serve.initCode({ compress:config.compress });
		var f = {
			path: "system.js",
			contents: new Buffer(contents)
		};

		var src = new File(f);
		return src;
	}
};