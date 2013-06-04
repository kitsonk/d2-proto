define([
	'intern!tdd',
	'intern/chai!assert',
	'require'
], function (test, assert, require) {

	test.suite('d2-proto/tmpl', function () {
		// test.test('basic', function () {
		// 	var dfd = this.async(1000);
		// 	require(['d2-proto/tmpl!./resources/test.tmpl'], dfd.callback(function (tmpl) {
		// 		console.log(tmpl.toString());
		// 	}));
		// });
		// test.test('id Pseudo Selector', function () {
		// 	var dfd = this.async(1000);
		// 	require(['d2-proto/tmpl!./resources/id.tmpl'], dfd.callback(function (tmpl) {
		// 		console.log(tmpl.generate());
		// 	}));
		// });
		test.test('logic operators', function () {
			var dfd = this.async(1000);
			require(['d2-proto/tmpl!./resources/keyword.tmpl'], dfd.callback(function (tmpl) {
				console.log(tmpl.render(null, { testVal: 2 }));
			}));
		});
	});
});