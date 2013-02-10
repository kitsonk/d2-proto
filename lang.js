define([
	'./properties'
], function (properties) {
	'use strict';

	function _mixin(dest, source, copyFunc) {
		// summary:
		//		Copies/adds all enumerable properties of source to dest; returns dest.
		// dest: Object
		//		The object to which to copy/add all properties contained in source.
		// source: Object
		//		The object from which to draw all properties to copy into dest.
		// copyFunc: Function?
		//		The process used to copy/add a property in source; defaults to Object.defineProperty.
		// returns:
		//		dest, as modified
		// description:
		//		All enumerable properties, including functions (sometimes termed "methods"), excluding any non-standard
		//		extensions found in Object.prototype, are copied/added to dest. Copying/adding each particular property
		//		is delegated to copyFunc (if any); this defaults to Object.defineProperty if no copyFunc is provided.
		//		Notice that by default, _mixin executes a so-called "shallow copy" and aggregate types are copied/added
		//		by reference.

		var name, value, empty = {};
		for (name in source) {
			value = source[name];
			// the (!(name in empty) || empty[name] !== s) condition avoids copying properties in "source"
			// inherited from Object.prototype.	 For example, if dest has a custom toString() method,
			// don't overwrite it with the toString() method that source inherited from Object.prototype
			if (!(name in dest) || (dest[name] !== value && (!(name in empty) || empty[name] !== value))) {
				// If already defined in dest or if there is a copyFunc supplied, just copy the value.
				if (copyFunc || name in dest) {
					dest[name] = copyFunc ? copyFunc(value) : value;
				} else {
					Object.defineProperty(dest, name, properties.getDescriptor(source, name));
				}
			}
		}

		return dest;
	}

	return {
		// summary:
		//		This module defines Javascript language extensions.

		mixin: function (dest, sources) {
			// summary:
			//		Copies/adds all properties of one or more sources to dest; returns dest.
			// dest: Object
			//		The object to which to copy/add all properties contained in source. If dest is falsy, then
			//		a new object is manufactured before copying/adding properties begins.
			// sources: Object...
			//		One of more objects from which to draw all properties to copy into dest. sources are processed
			//		left-to-right and if more than one of these objects contain the same property name, the right-most
			//		value "wins".
			// returns: Object
			//		dest, as modified
			// description:
			//		All properties, including functions (sometimes termed "methods"), excluding any non-standard extensions
			//		found in Object.prototype, are copied/added from sources to dest. sources are processed left to right.
			//		The Javascript assignment operator is used to copy/add each property; therefore, by default, mixin
			//		executes a so-called "shallow copy" and aggregate types are copied/added by reference.
			// example:
			//		make a shallow copy of an object
			//	|	var copy = lang.mixin({}, source);
			// example:
			//		copy in properties from multiple objects
			//	|	var flattened = lang.mixin(
			//	|		{
			//	|			name: "Frylock",
			//	|			braces: true
			//	|		},
			//	|		{
			//	|			name: "Carl Brutanananadilewski"
			//	|		}
			//	|	);
			//	|
			//	|	// will print "Carl Brutanananadilewski"
			//	|	console.log(flattened.name);
			//	|	// will print "true"
			//	|	console.log(flattened.braces);

			if (!dest) { dest = {}; }
			for (var i = 1, l = arguments.length; i < l; i++) {
				_mixin(dest, arguments[i]);
			}
			return dest; // Object
		},

		delegate: function (obj, props) {
			var d = Object.create(typeof obj === 'function' ? obj.prototype : obj || Object.prototype);
			return props ? _mixin(d, props) : d;
		},

		/*=====
		delegate: function(obj, props){
			// summary:
			//		Returns a new object which "looks" to obj for properties which it
			//		does not have a value for. Optionally takes a bag of properties to
			//		seed the returned object with initially.
			// description:
			//		This is a small implementation of the Boodman/Crockford delegation
			//		pattern in JavaScript. An intermediate object constructor mediates
			//		the prototype chain for the returned object, using it to delegate
			//		down to obj for property lookup when object-local lookup fails.
			//		This can be thought of similarly to ES4's "wrap", save that it does
			//		not act on types but rather on pure objects.
			// obj: Object
			//		The object to delegate to for properties not found directly on the
			//		return object or in props.
			// props: Object...
			//		an object containing properties to assign to the returned object
			// returns:
			//		an Object of anonymous type
			// example:
			//	|	var foo = { bar: "baz" };
			//	|	var thinger = lang.delegate(foo, { thud: "xyzzy"});
			//	|	thinger.bar == "baz"; // delegated to foo
			//	|	foo.thud == undefined; // by definition
			//	|	thinger.thud == "xyzzy"; // mixed in from props
			//	|	foo.bar = "thonk";
			//	|	thinger.bar == "thonk"; // still delegated to foo's bar
		}
		=====*/
	};
});