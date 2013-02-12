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

	function defineOwnProperty(name, descriptor) {
		// summary:
		//		Default property setter which is used by compose when mixing in properties into objects and prototypes.
		// name: String
		//		The property name to be defined
		// descriptor: Object
		//		An object which describes the property to be defined

		return Object.defineProperty(this, name, descriptor);
	}

	function getDefineProperty(O) {
		// summary:
		//		Return the define property for an Object.
		// description:
		//		Returns the most appropriate define property function for an object.  If the object is decorated with a
		//		`defineOwnProperty` that is returned, wrapped to support the appropriate signature, otherwise
		//		`Object.defineProperty` is returned.
		// O: Object
		//		The Object to inspect
		// returns: Function
		//		The appropriate property definition function

		return O && O.defineOwnProperty ? function (obj, name, descriptor) {
			O.defineOwnProperty.call(obj, name, descriptor);
		} : Object.defineProperty;
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

	function mixin(dest, sources, defineProperty) {
		// summary:
		//		A specialised mixin function that handles hierarchial prototypes
		// dest: Object|Function
		//		The base of which the `sources` will be mixed into
		// sources: Array
		//		The source (or sources) that should be mixed into the Object from left to right.
		// defineProperty: Function
		//		The function to use for defining properties with the signature of `obj`, `name` and `descriptor` where
		//		`obj` is the target, `name` is the property name and `descriptor` is the property descriptor.
		// returns: Object
		//		The composite of the sources mixed in

		function set(dest, key, value, propertyDescriptor) {
			// summary:
			//		Either sets a value to a property if the property already exists in the target, otherwise defines
			//		a new property using the supplied property descriptor.

			if (key in dest && dest.hasOwnProperty(key)) {
				dest[key] = value;
			} else {
				defineProperty(dest, key, propertyDescriptor);
			}
		}

		function mixinPrototype(dest, proto) {
			// summary:
			//		Take a prototype and mix it into a destination, looking for specifically decorated values

			var key, value, own, propertyDescriptor;
			for (key in proto) {
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
								getBases(Array.prototype.slice.call(sources, 0, i + 1), true))) {
							// this value is in the existing method's override chain, we can use the existing method
							propertyDescriptor = properties.getDescriptor(dest, key);
							value = dest[key];
						} else if (!isInMethodChain(dest[key], key, getBases([arg], true))) {
							// The existing method is in the current override chain, so we are left with a conflict
							console.error('Conflicted method ' + key + ', final composer must explicitly override' +
									'with correct method.');
						}
					}
				}
				if (value && value.install && own && !isInMethodChain(dest[key], key, getBases([arg], true))) {
					// apply decorator
					value.install.call(dest, key);
				} else {
					set(dest, key, value, propertyDescriptor);
				}
			}
		}

		function mixinObject(dest, obj) {
			// summary:
			//		Take an object and mix it into a destination, looking for specifically decorated values

			var key, value, propertyDescriptor;
			for (key in obj) {
				propertyDescriptor = properties.getDescriptor(obj, key);
				value = obj[key];
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
				set(dest, key, value, propertyDescriptor);
			}
		}

		var i, arg;

		for (i = 0; i < sources.length; i++) {
			arg = sources[i];
			if (typeof arg === 'function') {
				mixinPrototype(dest, arg.prototype);
			} else {
				mixinObject(dest, validArg(arg));
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
				mixin(lang.delegate(validArg(base)), Array.prototype.slice.call(arguments, 1), getDefineProperty(base));

		var constructors = getBases(args),
			constructorsLength = constructors.length;

		if (typeof args[args.length - 1] === 'object') {
			args[args.length - 1] = proto;
		}

		var prototypes = getBases(args, true);

		function Constructor() {
			// summary:
			//		The base constructor function for compose generated classes.  Will return a new instance, even if
			//		called directly, without the `new` keyword.
			// returns: Object
			//		The constructed object
			
			var instance = this instanceof Constructor ? this : Object.create(proto),
				defineProperty;
			for (var i = 0; i < constructorsLength; i++) {
				var constructor = constructors[i],
					result = constructor.apply(instance, arguments);
				if (typeof result === 'object') {
					if (result instanceof Constructor) {
						instance = result;
					} else {
						defineProperty = getDefineProperty(instance);
						Object.keys(result).forEach(function (key) {
							if (key in instance) {
								instance[key] = result[key];
							} else {
								defineProperty(instance, key, Object.getOwnPropertyDescriptor(result, key));
							}
						});
					}
				}
			}
			// accessor properties are not copied as own from prototype, which is desired, therefore they are defined
			// on the target instance
			var propertyDescriptor;
			defineProperty = getDefineProperty(instance);
			for (var name in instance) {
				if (!instance.hasOwnProperty(name)) {
					propertyDescriptor = properties.getDescriptor(instance, name);
					if (properties.isAccessorDescriptor(propertyDescriptor)) {
						defineProperty(instance, name, propertyDescriptor);
					}
				}
			}
			return instance;
		}

		// returns "pre-calculated" bases for a Constructor class
		Object.defineProperty(Constructor, '_getBases', {
			value: function (prototypeFlag) {
				return prototypeFlag ? prototypes : constructors;
			}
		});

		// provides an extend function on the Constructor class
		Object.defineProperty(Constructor, 'extend', {
			value: extend,
			writable: true,
			enumerable: true,
			configurable: true
		});

		// provides a defineOwnProperty on the Constructor class
		Object.defineProperty(Constructor, 'defineOwnProperty', {
			value: defineOwnProperty,
			writable: true,
			enumerable: true,
			configurable: true
		});

		// if compose not operating in a secure mode, provides a constructor property
		if (!compose.secure) {
			Object.defineProperty(proto, 'constructor', {
				value: Constructor,
				configurable: true
			});
		}

		// sets the prototype for the Constructor
		Constructor.prototype = proto;

		return Constructor;
	}

	Object.defineProperty(compose, 'required', {
		value: required,
		enumerable: true,
		configurable: true
	});

	function decorator(install, direct) {
		function Decorator() {
			if (direct) {
				return direct.apply(this, arguments);
			}
			throw new Error('Decorator not applied');
		}
		Object.defineProperty(Decorator, 'install', {
			value: install,
			enumerable: true,
			configurable: true
		});
		return Decorator;
	}

	Object.defineProperty(compose, 'Decorator', {
		value: decorator,
		enumerable: true,
		configurable: true
	});

	// TODO: convert to `dojo/aspect`
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
		enumerable: true,
		configurable: true
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
					mixin(inheritedDescriptor, [descriptor], Object.defineProperty);
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
			var instance = mixin(lang.delegate(base), Array.prototype.slice.call(arguments, 1),
					getDefineProperty(base)),
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
			return self ? mixin(self, args, getDefineProperty(self)) :
				extend.apply.call(compose, 0, args);
		}
	});

	Object.defineProperty(compose, 'call', {
		value: function (self) {
			return mixin(self, Array.prototype.slice.call(arguments, 1), getDefineProperty(self));
		}
	});

	Object.defineProperty(compose, 'secure', {
		value: false,
		writable: true,
		enumerable: true
	});

	return compose;

});