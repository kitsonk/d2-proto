define([
	'intern!tdd',
	'intern/chai!assert',
	'../properties'
], function (test, assert, properties) {

	test.suite('getDescriptor', function () {
		var descriptor = {
			value: 'bar',
			writable: false,
			enumerable: false,
			configurable: false
		};
		test.test('basic', function () {
			var obj = {
				bar: 1
			};
			Object.defineProperty(obj, 'foo', {
				value: 'bar'
			});

			var descriptor2 = {
				value: 1,
				writable: true,
				enumerable: true,
				configurable: true
			};

			assert.deepEqual(properties.getDescriptor(obj, 'foo'), descriptor, 'obj.foo matches descriptor');
			assert.deepEqual(properties.getDescriptor(obj, 'bar'), descriptor2, 'obj.bar matches descriptor');
		});
		test.test('inherited', function () {
			var proto = {};
			Object.defineProperty(proto, 'foo', {
				value: 'bar'
			});

			function Create() {}

			Create.prototype = proto;

			var obj = new Create();

			assert.strictEqual(Object.getOwnPropertyDescriptor(obj, 'foo', undefined, 'not own property'));
			assert.deepEqual(properties.getDescriptor(obj, 'foo'), descriptor, 'descriptors match');
		});
		test.test('second generation', function () {
			var proto = {};
			Object.defineProperty(proto, 'foo', {
				value: 'bar'
			});

			function Create() {}

			Create.prototype = proto;

			var proto2 = new Create();

			Create.prototype = proto2;

			var obj = new Create();

			assert.strictEqual(Object.getOwnPropertyDescriptor(obj, 'foo', undefined, 'not own property'));
			assert.strictEqual(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), 'foo', undefined,
				'not in prototype'));
			assert.deepEqual(properties.getDescriptor(obj, 'foo'), descriptor, 'descriptors match');
		});
		test.test('not in object', function () {
			var obj = {};

			assert.strictEqual(properties.getDescriptor(obj, 'foo'), undefined, 'no descriptor returned');
		});
	});

	test.suite('property descriptors', function () {
		var obj = {};
		var value;
		Object.defineProperty(obj, 'value', {
			value: 'foo'
		});
		Object.defineProperty(obj, 'writable', {
			writable: true
		});
		Object.defineProperty(obj, 'setter', {
			set: function (val) {
				value = val;
			}
		});
		Object.defineProperty(obj, 'getter', {
			get: function () {
				return value;
			}
		});

		test.test('isAccessorDescriptor', function () {
			assert.isTrue(properties.isAccessorDescriptor(Object.getOwnPropertyDescriptor(obj, 'setter')));
			assert.isTrue(properties.isAccessorDescriptor(Object.getOwnPropertyDescriptor(obj, 'getter')));
			assert.isFalse(properties.isAccessorDescriptor(Object.getOwnPropertyDescriptor(obj, 'value')));
			assert.isFalse(properties.isAccessorDescriptor(Object.getOwnPropertyDescriptor(obj, 'writable')));
		});

		test.test('isDataDescriptor', function () {
			assert.isTrue(properties.isDataDescriptor(Object.getOwnPropertyDescriptor(obj, 'value')));
			assert.isTrue(properties.isDataDescriptor(Object.getOwnPropertyDescriptor(obj, 'writable')));
			assert.isFalse(properties.isDataDescriptor(Object.getOwnPropertyDescriptor(obj, 'getter')));
			assert.isFalse(properties.isDataDescriptor(Object.getOwnPropertyDescriptor(obj, 'setter')));
		});
	});

	test.suite('remove', function () {
		test.test('basic', function () {
			var obj = {
				foo: 'bar'
			};

			assert.equal(obj.foo, 'bar', 'property set');
			properties.remove(obj, 'foo');
			assert.strictEqual(obj.foo, undefined, 'property removed');
		});
		test.test('in prototype', function () {
			var proto = {
				foo: 'bar'
			};

			function Create() {}

			Create.prototype = proto;

			var obj = new Create();

			assert.equal(obj.foo, 'bar', 'property set');
			delete obj.foo;
			assert.equal(obj.foo, 'bar', 'property not deleted');
			properties.remove(obj, 'foo');
			assert.strictEqual(obj.foo, undefined, 'property fully removed');
		});
	});

});