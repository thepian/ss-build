'use strict';

exports.system = function(ss) {
	return {
		system: require('./lib/system')(ss)
	};
};

exports.bundlers = {
    webpack: require('./lib/bundlers/webpack')
};
