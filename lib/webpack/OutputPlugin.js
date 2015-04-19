var path = require('path');

module.exports = function() {
    this.apply = function(compiler) {
        compiler.plugin('after-emit',afterEmitPlugin);

        function afterEmitPlugin(compilation, callback) {
            var contents;
            //?? name for JS
            Object.keys(compilation.assets).forEach(function(outname) {
                if (compilation.assets[outname].emitted) {
                    var outpath = path.join(compiler.outputPath, outname);
                    contents = compiler.outputFileSystem.readFileSync(outpath);
                    console.log('after emit',outpath);
                }
            });
            callback();
        }
    };
};
