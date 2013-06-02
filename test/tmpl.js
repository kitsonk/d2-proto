define([
	'intern!tdd',
	'intern/chai!assert',
	'require'
], function (test, assert, require) {

	test.suite('d2-proto/tmpl', function () {
		test.test('basic', function () {
			var dfd = this.async(1000);
			require(['d2-proto/tmpl!./resources/test.tmpl'], dfd.callback(function (tmpl) {
				console.log(tmpl.generate());
			}));
		});
	});
});