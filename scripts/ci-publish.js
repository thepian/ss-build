'use strict';

var RegClient = require('npm-registry-client');

var pkg = require('../package.json');
var client = new RegClient();
var uri = "http://registry.npmjs.org/" + pkg.name,
	params = { timeout:1000 };

client.get(uri, params, function(error, data/*, raw, res*/) {
	if (error) {
		console.error(error);
		process.exit(1);
	}
	var distTags = data["dist-tags"],
		latest = data.versions[distTags.latest];

	if (pkg.version !== distTags.latest) {
		console.info("Need npm 'publish "+pkg.version+"'");
		/*
		client.adduser({
			client.publish({
				version: pkg.version		
			})
		})
		*/
	}
});