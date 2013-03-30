define([
	'teststack!bench'
], function (bench) {

	bench.baseline('suite1', function () {
		bench.test('bench1', function () {
			var array = [];
			for (var i = 0; i < 10000; i++) {
				array.push(Math.random());
			}
			array.sort();
		});
		bench.test('bench2', function () {
			var array = [];
			for (var i = 0; i < 10000; i++) {
				array.push(Math.random());
			}
			array.sort(function (a, b) {
				return a < b ? 1 : a > b ? -1 : 0;
			});
		});
	});

});