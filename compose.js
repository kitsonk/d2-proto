define([
	'./lang', // lang.delegate
	'./debug', // debug.error
	'./properties'
], function (lang, debug, properties) {
	'use strict';

	function isInMethodChain(method, name, prototypes) {
		// summary:
		//		Searches for a method in the given prototype hierarchy
		// returns: Boolean

		return prototypes.some(function (prototype) {
			return prototype[name] === method;
		});
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
		//		A specialised mixin function that handles hierarchial prototypes
		// dest: Object|Function
		//		The base of which the `sources` will be mixed into
		// sources: Object...
		//		The source (or sources) that should be mixed into the Object from left to right.
		// returns: Object
		//		The composite of the sources mixed in

		var args = Array.prototype.slice.call(arguments, 1), // convert arguments into an Array skipping first one
			value, i, arg, proto, key, own, propertyDescriptor;
		for (i = 0; i < args.length; i++) {
			arg = args[i];
			if (typeof arg === 'function') {
				proto = arg.prototype;
				for (key in proto) {
					// iterate through enumerable properties of prototype
					propertyDescriptor = properties.getDescriptor(proto, key);
					value = proto[key];
					own = proto.hasOwnProperty(key);
					if (typeof value === 'function' && key in dest && value !== dest[key]) {
						if (value === required) {
							// this is a required value, which is now supplied, so fulfilled
							propertyDescriptor = properties.getDescriptor(dest, key);
							value = dest[key];
						} else if (!own) {
							if (isInMethodChain(value, key,
								getBases(Array.prototype.slice.call(args, 0, i + 1), true))) {
								// this value is in the existing method's override chain, we can use the existing
								// method
								propertyDescriptor = properties.getDescriptor(dest, key);
								value = dest[key];
							} else if (!isInMethodChain(dest[key], key, getBases([arg], true))) {
								// The existing method is not in the current override chain, so we are left with a
								// conflict
								console.error('Conflicted method ' + key + ', final composer must explicitly override' +
									'with correct method.');
							}
						}
					}
					if (value && value.install && own && !isInMethodChain(dest[key], key, getBases([arg], true))) {
						// apply decorator
						value.install.call(dest, key);
					} else {
						if (key in dest) {
							dest[key] = value;
						} else {
							Object.defineProperty(dest, key, propertyDescriptor);
						}
					}
				}
			} else {
				for (key in validArg(arg)) {
					propertyDescriptor = properties.getDescriptor(arg, key);
					value = arg[key];
					if (typeof value === 'function') {
						if (value.install) {
							// apply decorator
							value.install.call(dest, key);
							continue;
						}
						if (key in dest) {
							if (value === required) {
								// requirement met
								continue;
							}
						}
					}
					if (key in dest) {
						dest[key] = value;
					} else {
						Object.defineProperty(dest, key, propertyDescriptor);
					}
				}
			}
		}
		return dest;
	}

	function compose(base, extensions) {
		// summary:
		//		Object compositor for JavaScript, featuring JavaScript-style prototype inheritance and composition,
		//		multiple inheritance, mixin and traits-inspired conflict resolution and composition.
		// base: Object|Function
		//		The object or constructor function that is used for the base to be composited upon
		// extensions: Object|Function...
		//		Additional constructor functions or objects to be composited into the base
		// returns: Object
		//		The composited object class, which can be instantiated with `new`
		var args = arguments,
			proto = (args.length < 2 && typeof args[0] !== 'function') ? args[0] :
			mixin.apply(this, [lang.delegate(validArg(base))].concat(Array.prototype.slice.call(arguments, 1)));

		var constructors = getBases(args),
			constructorsLength = constructors.length;

		if (typeof args[args.length - 1] === 'object') {
			args[args.length - 1] = proto;
		}

		var prototypes = getBases(args, true);

		function Constructor() {
			var instance = this instanceof Constructor ? this : Object.create(proto);
			for (var i = 0; i < constructorsLength; i++) {
				var constructor = constructors[i],
					result = constructor.apply(instance, arguments);
				if (typeof result === 'object') {
					if (result instanceof Constructor) {
						instance = result;
					} else {
						Object.keys(result).forEach(function (key) {
							if (key in instance) {
								instance[key] = result[key];
							} else {
								Object.defineProperty(instance, key, Object.getOwnPropertyDescriptor(result, key));
							}
						});
					}
				}
			}
			var name, propertyDescriptor;
			for (name in instance) {
				// accessor properties are not copied properly as own from prototype, this resolves that issue
				if (!instance.hasOwnProperty(name)) {
					propertyDescriptor = properties.getDescriptor(instance, name);
					if (properties.isAccessorDescriptor(propertyDescriptor)) {
						Object.defineProperty(instance, name, propertyDescriptor);
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
			value: extend,
			enumerable: true
		});

		if (!compose.secure) {
			Object.defineProperty(proto, 'constructor', {
				value: Constructor
			});
		}

		Constructor.prototype = proto;

		return Constructor;
	}

	Object.defineProperty(compose, 'required', {
		value: required,
		enumerable: true
	});

	function decorator(install, direct) {
		function Decorator() {
			if (direct) {
				return direct.apply(this, arguments);
			}
			throw new Error('Decorator not applied');
		}
		Object.defineProperty(Decorator, 'install', {
			enumerable: true,
			value: install,
		});
		return Decorator;
	}

	Object.defineProperty(compose, 'Decorator', {
		enumerable: true,
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
		value: stop,
		enumerable: true
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

	Object.defineProperty(compose, 'property', {
		value: function (descriptor) {
			return decorator(function (key) {
				var inheritedDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), key);
				if (inheritedDescriptor) {
					mixin(inheritedDescriptor, descriptor);
				}
				Object.defineProperty(this, key, inheritedDescriptor || descriptor);
			});
		},
		enumerable: true
	});

	Object.defineProperty(compose, 'from', {
		value: function (trait, fromKey) {
			var descriptor = fromKey ? Object.getOwnPropertyDescriptor((typeof trait === 'function' ?
				trait.prototype : trait), fromKey) : null;
			return decorator(function (key) {
				descriptor = descriptor || (typeof trait === 'string' ? Object.getOwnPropertyDescriptor(this, trait) :
					Object.getOwnPropertyDescriptor((typeof trait === 'function' ? trait.prototype : trait),
						fromKey || key));
				if (descriptor) {
					Object.defineProperty(this, key, descriptor);
				} else {
					throw new Error('Source method ' + fromKey + ' was not available to be renamed to ' + key);
				}
			});
		},
		enumerable: true
	});

	Object.defineProperty(compose, 'create', {
		value: function (base) {
			var instance = mixin.apply(this, [lang.delegate(base)].concat(Array.prototype.slice.call(arguments, 1))),
				arg;
			for (var i = 0, l = arguments.length; i < l; i++) {
				arg = arguments[i];
				if (typeof arg === 'function') {
					instance = arg.call(instance) || instance;
				}
			}
			return instance;
		},
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

	Object.defineProperty(compose, 'secure', {
		value: false,
		writable: true,
		enumerable: true
	});

	return compose;

});