define([
	'intern!tdd',
	'intern/chai!assert',
	'../string'
], function (test, assert, string) {
	'use strict';

	test.suite('d2-proto/string', function () {
		test.test('basic', function () {
			console.log(string.substitute());
		});
	});

});