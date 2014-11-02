ss-build
========

Building Socketstream assets without running the server

Usage
---
Change the package.json to

    "scripts": {
      "start": "node -e \"require('app')({port:process.env.PORT||3000})\""
    }


In the app.js file change the last bit to

    module.exports = function(config) {
      config = config || {};
      // Start web server
      var server = http.Server(ss.http.middleware);
      server.listen(config.port || process.env.PORT || 3000);

      // Start SocketStream
      ss.start(server);
    }


Gulp usage
---

#### Saving system assets

In your gulpfile.js add a task to generate assets
    var ss = require('ss-build');

    gulp.task('assets', function() {
      require('./app');
      gulp
        .pipe(ss.system.js)
        .pipe(gulp.dest('./client/static/assets/js/'));
    });

Development Notes
---

call `npm link` from here while developing. Call `npm link ss-build` from the socketstream app to get the changes without updating packages.

