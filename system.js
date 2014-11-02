'use strict';

var ss = require('socketstream'),
	File = require('vinyl');

module.exports = {
	js: function(config) {
		var contents = ss.client.assets.serve.js({ compress:true });
		var f = {
			path: "system.js"
			contents: new Buffer(contents)
		};

		var src = new File(f);
		return src;
	},

	initCode: function(config) {
		var contents = ss.client.assets.serve.initCode({ compress:true });
		var f = {
			path: "system.js"
			contents: new Buffer(contents)
		};

		var src = new File(f);
		return src;
	}
};