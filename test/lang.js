define([
	'teststack!tdd',
	'chai/chai',
	'../lang'
], function (test, chai, lang) {

	var assert = chai.assert;

	test.suite('mixin', function () {
		test.test('basic', function () {
			assert(typeof lang.mixin === 'function', 'mixin present');

			var o1 = {
					foo: 'bar'
				},
				o2 = {
					baz: 'qat'
				};

			lang.mixin(o1, o2);
			assert(o1.foo === 'bar', 'original value unchanged');
			assert(o1.baz === 'qat', 'mixed in value present');
			assert(!o2.foo, 'no value for foo in source');
			assert(o2.baz === 'qat', 'no change in value in source');
		});
		test.test('overwrite', function () {
			var o3 = {
					foo: 'bar'
				},
				o4 = {
					foo: 'qat'
				};

			lang.mixin(o3, o4);
			assert(o3.foo === 'qat', 'original value changed');
			assert(o4.foo === 'qat', 'source value unchanged');
		});
	});

});