define([
	'dojo/has',
	'./lang', // lang.delegate
	'./debug' // debug.error
], function (has, lang, debug) {

	function isInMethodChain(method, name, prototypes) {
		// summary:
		//		Searches for a method in the given prototype hierarchy
		// returns: Boolean
		for (var i = 0; i < prototypes.length; i++) {
			var prototype = prototypes[i];
			if (prototype[name] === method) {
				// found it
				return true;
			}
		}
	}

	function getBases(args, prototypeFlag) {
		// summary:
		//		Registers a set of constructors for a class, eliminating duplicate constructors that may result from
		//		diamond construction for classes (e.g. B->A, C->A, D->B&C, then D() should only call A() once)
		// args: Array
		//		An array of constructors to utilise to return
		// prototypeFlag: Boolean
		//		Used to identify if the bases being collected are for the construction of a prototype.
		// returns: Array
		//		An array of constructors for a class

		var bases = [];

		function iterate(args, checkChildren) {
			outer:
			for (var i = 0; i < args.length; i++) {
				var arg = args[i],
					target = prototypeFlag && typeof arg === 'function' ? arg.prototype : arg;
				if (prototypeFlag || typeof arg === 'function') {
					var argGetBases = checkChildren && arg._getBases;
					if (argGetBases) {
						iterate(argGetBases(prototypeFlag));	// don't need to check children for these, they should
																// be pre-flattened
					}
				} else {
					for (var j = 0; j < bases.length; j++) {
						if (target === bases[j]) {
							continue outer;
						}
					}
					bases.push(target);
				}
			}
		}

		iterate(args, true);
		return bases;
	}

	function validArg(/* Mixed */ arg) {
		// summary:
		//		Checks to see if a valid argument is being passed and throws an error if it isn't, otherwise returns
		//		the argument

		if (!arg) {
			throw new Error('compose arguments must be functions or objects');
		}
		return arg; // Mixed
	}

	function required() {
		// summary:
		//		A "stub" function used to identify properties that are required in descendent objects.  Throws an
		//		error if called without the property being implemented.
		throw new Error('This method is required and no implementation has been provided');
	}

	function extend() {
		// summary:
		//		A shortcut function to quickly extend an Object via compose
		var args = [this];
		args.push.apply(args, arguments);
		return compose.apply(0, args);
	}

	function mixin(dest, sources) {
		// summary:
		//		A specialised mixin function that handles hierarchal prototypes
		// dest: Object|Function
		//		The base of which the `sources` will be mixed into
		// sources: Object...
		//		The source (or sources) that should be mixed into the Object from left to right.
		// returns: Object
		//		The composite of the sources mixed in

		var args = Array.prototype.slice.call(arguments, 1), // Convert arguments into an array, skipping the first
			name, propertyDescriptor, value, own;
		for (var i = 0, l = args.length; i < l; i++) {
			var arg = args[i],
				keys, j, m;
			if (typeof arg === 'function') {
				// Argument is a function, utilise the prototype to mixin
				var proto = arg.prototype;
				keys = Object.keys(proto); // Assuming enumerable only properties of the prototype
				for (j = 0, m = keys.length; j < m; j++) {
					name = keys[j];
					propertyDescriptor = Object.getOwnPropertyDescriptor(proto, name);
					value = propertyDescriptor.value;
					own = proto.hasOwnProperty(name);
					if (typeof value === 'function' && name in dest && value !== dest[name]) {
						var existing = Object.getOwnPropertyDescriptor(dest, name).value;
						if (value === required) {
							value = existing; // It is a required value, which is being supplied, so now fulfilled
						} else if (!own) {
							// If it is its own property, it is considered an explicit override
							// TODO: make faster calls on this, perhaps passing indices and caching
							if (isInMethodChain(value, name, getBases(args, true))) {
								// This value is in the existing method's override chain, we can use the existing
								// method
								value = existing;
							} else if (!isInMethodChain(existing, name, getBases([arg], true))) {
								// The existing method is not in the current override chain, so we are left with a
								// conflict
								debug.error('ERROR: Conflicted method "' + name + '", final composer must ' +
									'explicitly override with the correct method.');
							}
						}
					}
					if (value && value.install && own && !isInMethodChain(existing, name, getBases([arg], true))) {
						// apply modifier
						value.install.call(dest, name);
					} else {
						// defineProperty with propertyDescriptor on destination
						propertyDescriptor.value = value;
						Object.defineProperty(dest, name, propertyDescriptor);
					}
				}
			} else {
				// Argument should be an Object, mixin properties looking for modifiers
				keys = Object.keys(validArg(arg));
				for (j = 0, m = keys.length; j < m; j++) {
					name = keys[j];
					propertyDescriptor = Object.getOwnPropertyDescriptor(arg, name);
					value = propertyDescriptor.value;
					if (typeof value === 'function') {
						if (value.install) {
							// apply modifier
							value.install.call(dest, name);
							continue;
						}
						if (name in dest && value === required) {
							// required requirement met
							continue;
						}
					}
					propertyDescriptor.value = value;
					Object.defineProperty(dest, name, propertyDescriptor);
				}
			}
		}
	}

	var compose = function (base, extensions) {
		// summary:
		//		Object compositor for JavaScript, featuring JavaScript-style prototype inheritance and composition,
		//		multiple inheritance, mixin and traits-inspired conflict resolution and composition.
		// base: Object|Function
		//		The object or constructor function that is used for the base to be composited upon
		// extensions: Object|Function...
		//		Additional constructor functions or objects to be composited into the base
		// returns: Object
		//		The composited object class, which can be instantiated with `new`
		var args = Array.prototype.slice.call(arguments, 1); // Convert arguments into an array, skipping the first
		var proto = (args.length && typeof base !== 'function') ? base :
			mixin.apply(this, [lang.delegate(validArg(base))].concat(args));

		var constructors = getBases(arguments),
			constructorsLength = constructors.length,
			prototypes = getBases(arguments, true);

		function Constructor() {
			var instance = (this instanceof Constructor) ? this : Object.create(proto);
			for (var i = 0; i < constructorsLength; i++) {
				var constructor = constructors[i],
					result = constructor.apply(instance, arguments);
				if (typeof result === 'object') {
					if (result instanceof Constructor) {
						instance = result;
					} else {
						lang.mixin(instance, result);
					}
				}
			}
			return instance;
		}

		Object.defineProperty(Constructor, '_getBases', {
			value: function (prototypeFlag) {
				return prototypeFlag ? prototypes : constructors;
			}
		});

		Object.defineProperty(Constructor, 'extend', {
			value: extend
		});

		if (!compose.secure) {
			proto.constructor = Constructor;
		}

		Constructor.prototype = proto;
		return Constructor;
	};

	Object.defineProperty(compose, 'required', {
		value: required,
		enumerable: true
	});

	function decorator(install, direct) {
		function d() {
			if (direct) {
				return direct.apply(this, arguments);
			}
			throw new Error('Decorator not applied');
		}
		Object.defineProperty(d, 'install', {
			value: install
		});
		return d;
	}

	Object.defineProperty(compose, 'decorator', {
		value: decorator
	});

	function aspect(handler) {
		return function (advice) {
			return decorator(function install(name) {
				var baseMethod = this[name];
				(advice = this[name] = baseMethod ? handler(this, baseMethod, advice) : advice).install = install;
			}, advice);
		};
	}

	var stop = {};

	Object.defineProperty(compose, 'stop', {
		value: stop
	});

	Object.defineProperty(compose, 'around', {
		value: aspect(function (target, base, advice) {
			return advice.call(target, base);
		}),
		enumerable: true
	});

	Object.defineProperty(compose, 'before', {
		value: aspect(function (target, base, advice) {
			return function () {
				var results = advice.apply(this, arguments);
				if (results !== stop) {
					return base.apply(this, results || arguments);
				}
			};
		}),
		enumerable: true
	});

	Object.defineProperty(compose, 'after', {
		value: aspect(function (target, base, advice) {
			return function () {
				var results = base.apply(this, arguments),
					adviceResults = advice.apply(this, arguments);
				return adviceResults === undefined ? results : adviceResults;
			};
		}),
		enumerable: true
	});

	Object.defineProperty(compose, 'apply', {
		value: function (self, args) {
			return self ? mixin(self, args) : extend.apply.call(compose, 0, args);
		}
	});

	Object.defineProperty(compose, 'call', {
		value: function (self) {
			return mixin(self, Array.prototype.slice.call(arguments, 1));
		}
	});

	return compose;

});