define([
	'teststack!tdd',
	'chai/chai',
	'../Observable',
	'../compose'
], function (test, chai, Observable, compose) {

	var assert = chai.assert;

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