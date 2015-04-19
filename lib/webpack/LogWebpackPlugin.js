module.exports = LogPlugin;

function LogPlugin(ss) {
}

LogPlugin.prototype.apply = function(compiler) {
    compiler.plugin('emit',function(emitted,callback) {
        console.log('emit assets',emitted.assets, 'for', compiler.clientName);
        callback();
    });
    //compiler.resolvers.normal.plugin('resolve',function(context,request) {
    //   console.log('resolving', context, request);
    //});

    compiler.resolvers.normal.plugin('module',function(request,callback) {
        console.log('module>', request.request); // .query .directory
        callback(null,request);
    });

    compiler.resolvers.normal.plugin('file',function(request,callback) {
        //if (request.system || ss.bundler.systemModule(request.request)) {
        //   console.log('system module file',request.request,request.path);
        //}
        //if (request.request == startPath) {
        //    request.path = path.join(request.path, request.request);
        //}
        console.log('file>',request.path,request.request);
        callback(null,request);
    });

};
