define([
	'intern!tdd',
	'intern/chai!assert',
	'../Observable'
], function (test, assert, Observable) {

	test.suite('basic functionality', function () {
		test.test('observe', function () {
			var instance = new Observable();
			var expected = [{ type: 'updated', object: instance, name: 'foo', oldValue: 'bar' }];
			instance.foo = 'bar';
			var records;
			function callback(r) {
				records = r;
			}
			Observable.observe(instance, callback);
			instance.foo = 'qat';
			Observable.deliverChangeRecords(callback);
			assert.deepEqual(records, expected, 'records match expected results');
		});
	});

});