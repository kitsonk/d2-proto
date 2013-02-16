define([
	'teststack!benchmark',
	'chai/chai',
	'../../parser'
], function (test, chai, parser) {

	var assert = chai.assert;

	test.suite('parser', function () {
		test.test('basic tests', function () {
			assert(typeof parser.parse === 'function', 'parse present');
		});
	});

});