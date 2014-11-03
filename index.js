'use strict';

module.exports = function(ss) {
	return {
		system: require('./lib/system')(ss)
	};
};