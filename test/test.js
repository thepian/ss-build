'use strict';

var ssBuild = require('../index')(require('socketstream')),
	expect = require('chai').expect;

describe('build',function() {

	it('should load', function() {
		var server = require('./fixtures/server');
		expect(server).to.be.a('function');
		var systemStream = ssBuild.system.js();
	});
});