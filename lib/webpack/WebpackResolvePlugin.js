module.exports = function() {
    this.apply = function(compiler) {
        //TODO add input FS, module, start
        compiler.plugin("normal-module-factory", require('./NormalModuleFactory'));
    };
};
