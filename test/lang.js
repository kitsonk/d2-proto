define([
	'teststack!tdd',
	'teststack/lib/assert',
	'../lang'
], function (test, assert, lang) {

	test.suite('mixin', function () {
		test.test('basic', function () {
			assert.isEqual(typeof lang.mixin, 'function', 'mixin present');

			var o1 = {
					foo: 'bar'
				},
				o2 = {
					baz: 'qat'
				};

			lang.mixin(o1, o2);
			assert.isEqual(o1.foo, 'bar', 'original value unchanged');
			assert.isEqual(o1.baz, 'qat', 'mixed in value present');
			assert.f(o2.foo, 'no value for foo in source');
			assert.isEqual(o2.baz, 'qat', 'no change in value in source');
		});
		test.test('overwrite', function () {
			var o3 = {
					foo: 'bar'
				},
				o4 = {
					foo: 'qat'
				};

			lang.mixin(o3, o4);
			assert.isEqual(o3.foo, 'qat', 'original value changed');
			assert.isEqual(o4.foo, 'qat', 'source value unchanged');
		});
	});

});