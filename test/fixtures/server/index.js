
// My SocketStream 0.3 app

var http = require('http'),
	path = require('path'),
    ss = require('socketstream');

ss.client.set({
	dirs: {
		'static': '/site',
		'assets': '/site/assets'
	},
	globals: {
		pkg: require('../package.json')
		// debug flag
		// default language
		// versions
		// license headers
	},
	'maxAge': 2.6*Math.pow(10,9),
	'entryModuleName': null,
	'globalModules': true
}); 
ss.client.assets.send('shim','json.min.js','');
ss.client.assets.send('lib','browserify.js','');

// LESS/SASS config
// less.prependLess('@assets-path: "' + '' + '"');

// Common codepage for all pages
ss.client.define('common', {
	view: 'common.jade',
	code: ['common'],
	tmpl: ['common']
});

// Define a single-page client called 'discuss'
ss.client.define('discuss', {
  view: 'discuss.jade',
  includes: {
  	system:false,
  },
  globals: {}, // passed to view, css, tmpl
  css:  ['discuss.scss'],
  // code: ['app/lesson.es','app/entry.js'],
  code: ['discuss','system'],
  tmpl: ['discuss']
});

// Serve this client on the root URL
ss.http.route('/discuss', function(req, res){
  res.serveClient('discuss');
});

// Define a single-page client called 'my-lesson'
ss.client.define('my-lesson', {
  view: 'my-lesson.jade',
  css:  ['my-lesson.scss'],
  code: ['my-lesson'],
  tmpl: '*'
});

ss.http.route('/my-lesson', function(req,res) {
	res.serveClient('my-lesson');
});

// Jasmine Test Runner
ss.client.define('test', {
	view: 'SpecRunner.jade',
	css: ['libs/test'],
	code: ['libs','tests','app'],
	templ: 'none'
});

ss.http.route('/test', function(req,res) {
	res.serveClient('test');
});

// Code Formatters
// ss.client.formatters.add(require('ss-sass'));
// ss.client.formatters.add(less);
// ss.client.formatters.add(amdclean);

// HTML template formatters
/*
ss.client.formatters.add(require('../lib/ss/jade'),{
    basedir: path.join(__dirname,"../lib"),
	locals: {
		//TODO howto add view definition path + entry name
		debug: !(ss.env === 'production')
	} // extra variables
	// headers {}
});
*/

ss.client.templateEngine.use('angular');

// Minimize and pack assets if you type: SS_ENV=production node app.js
if (ss.env === 'production') ss.client.packAssets();
else {
	// ss.client.packAssets();
	// var jadeware = require("../lib/util/jadeware");
	// ss.http.middleware.prepend(jadeware({
	// 	debug: true,
	// 	base_dir: path.join(__dirname,".."),
	// 	vars: {},
	// 	src: ss.client.options.dirs.static
	// }));
}

/**
 * Start server with config
 */
module.exports = function(config) {
	config = config || {};
	var server = http.Server(ss.http.middleware);
	server.listen(config.port || 3000);

	//TODO configurable port
	//TODO config SSL

	// Start SocketStream
	ss.start(server);
	 // Socket server load
	 // Http server load
	 // calls ss.client.load
	 // event server:start
};

