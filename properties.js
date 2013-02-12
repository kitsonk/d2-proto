define([
], function () {

	var hasOwnProp = Object.prototype.hasOwnProperty;

	return {
		getDescriptor: function (obj, name) {
			// summary:
			//		Return a property descriptor from an object for the supplied property name.
			// description:
			//		Ascends the prototype of the object until it can find the property descriptor for the object,
			//		returning `undefined` if not found within it's inheritance chain.
			//
			//		An example of usage would be:
			//		|	obj = Object.create({ foo: 'bar' });
			//		|	var propertyDescriptor = properties.getPropertyDescriptor(obj, 'foo');
			//
			// obj: Object
			//		The object that should be inspected for the property descriptor.
			// name: String
			//		The name of the property to find a property descriptor for.
			// returns: Object|undefined
			//		The descriptor if found

			while (obj && !hasOwnProp.call(obj, name)) {
				obj = Object.getPrototypeOf(obj);
			}
			return obj ? Object.getOwnPropertyDescriptor(obj, name) : undefined;
		},

		isAccessorDescriptor: function (descriptor) {
			// summary:
			//		Returns 'true' if the provided descriptor is a data descriptor, otherwise 'false'
			// descriptor: Object
			//		The descriptor to inspect.
			// returns: Boolean

			return descriptor ? 'get' in descriptor || 'set' in descriptor : false;
		},

		isDataDescriptor: function (descriptor) {
			// summary:
			//		Returns 'true' if the provided descriptor is an accessor descriptor, otherwise 'false'
			// descriptor: Object
			//		The descriptor to inspect.
			// returns: Boolean

			return descriptor ? 'value' in descriptor || 'writable' in descriptor : false;
		},

		remove: function (obj, name) {
			// summary:
			//		Removes a property, including in its inheritance chain.
			// description:
			//		Ascends the prototype of the object deleting any occurances of the name property.  This is useful when
			//		wanting to ensure that if a configurable property is defined somewhere in the inheritance chain, it
			//		does not get persisted when using the object as a prototype for another object.
			// obj: Object
			//		The object that should property should be deleted from.
			// name: String
			//		The name of the property to find a property descriptor for.
			do {
				if (obj && hasOwnProp.call(obj, name)) {
					delete obj[name];
				}
			} while ((obj = Object.getPrototypeOf(obj)));
		}
	};

});