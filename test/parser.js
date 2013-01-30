define([
	'teststack!tdd',
	'chai/chai',
	'../parser'
], function (test, chai, parser) {

	console.log(chai);

	test.suite('parser', function () {
		test.test('basic tests', function () {
			chai.assert(typeof parser.parse === 'function', 'parse present');
		});
	});

});