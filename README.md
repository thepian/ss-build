ss-build
========

Building Socketstream assets without running the server. It requires a minor refactor of your app launching script.

Usage
---
Change the package.json to

    "scripts": {
      "start": "node -e \"require('app').start({port:process.env.PORT||3000})\"",
      "stop": "node -e \"require('app').stop({port:process.env.PORT||3000})\""
    }


In the `app.js` file change the last bit to

    exports.settings = {...};

    exports.start = function(config) {
      config = config || {};
      // Start web server
      var server = http.Server(ss.http.middleware);
      server.listen(config.port || process.env.PORT || 3000);

      // Start SocketStream
      ss.start(server);
    };

    exports.stop = function() {

    };


SASS
---

The SASS support is a minor reworking of `gulp-sass` to support injecting variables.


Gulp usage
---

#### Saving system assets

In your gulpfile.js add a task to generate assets

    var ss = require('ss-build')(require('socketstream'));

      gulp.task('assets', function() {

      var ssBuild = require('ss-build')(require('socketstream')),
          server = require('./server');

      ssBuild.system.js(server.settings)
        .pipe(gulp.dest(path.join(__dirname,'site/assets/js/')));
      ssBuild.system.initCode(server.settings)
        .pipe(gulp.dest(path.join(__dirname,'site/assets/js/')));

    });



Development Notes
---

call `npm link` from here while developing. Call `npm link ss-build` from the socketstream app to get the changes without updating packages.

