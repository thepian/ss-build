module.exports = function(nmf) {

    nmf.plugin('module',function(request,callback) {
        console.log('normal module',request);
        var module = ss.bundler.systemModule(request.request,false);
        if (module) {
            fsIn.mkdirpSync(module.dir);
            fsIn.writeFileSync(module.path,module.content);
            //console.log('found module',module);
            callback(null, {
                system: true,
                path: module.path,
                query: request.query,
                file: true, resolved: true
            });
        } else
        // continue with other plugins
            callback();

    });

    //nmf.plugin("after-resolve", function(result,callback) {
    //    console.log('m> ',result.request, result.resource, result.userRequest);
    //    callback(null, result);
    //});
    /*
     nmf.plugin("before-resolve", function(result, callback) {
     if(!result) return callback();
     if(resourceRegExp.test(result.request)) {
     if (typeof newResource === 'function') {
     newResource(result);
     } else {
     result.request = newResource;
     }
     }
     return callback(null, result);
     });
     nmf.plugin("after-resolve", function(result, callback) {
     if(!result) return callback();
     if(resourceRegExp.test(result.resource)) {
     if (typeof newResource === 'function') {
     newResource(result);
     } else {
     result.resource = path.resolve(path.dirname(result.resource), newResource);
     }
     }
     return callback(null, result);
     });

     nmf.plugin('after-resolve',function(data,callback) {
     if(!data) return callback();
     console.log('resolved', data.request, 'as', data.resource);
     callback(null, data);
     });
     */

};
