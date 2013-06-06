define([
	'intern!tdd',
	'intern/chai!assert',
	'require'
], function (test, assert, require) {
	'use strict';

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
		// test.test('logic operators', function () {
		// 	var dfd = this.async(1000);
		// 	require(['d2-proto/tmpl!./resources/keyword.tmpl'], dfd.callback(function (tmpl) {
		// 		console.log(tmpl.render(null, { testVal: 2, testArray: [1, 2, 3] }));
		// 	}));
		// });
		test.test('bind vars', function () {
			var dfd = this.async(1000);
			require(['d2-proto/tmpl!./resources/vars.tmpl'], dfd.callback(function (tmpl) {
				var context = {
					text: 'goodness'
				};
				var listener = function (changeRecord) {
					console.log(changeRecord);
				};
				var vars = tmpl.parseBind(listener, context);
				context.text = 'hello world';
				listener.remove();
				console.log(vars);
				console.log(context);
			}));
		});
	});
});