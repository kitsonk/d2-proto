define([
	'require',
	'./debug', // debug.warn
	'dojo/_base/lang', // lang.getObject, lang.setObject, lang.mixin, lang.hitch
	'dojo/_base/window', // win.document
	'dojo/aspect', // aspect.before, aspect.around, aspect.after
	'dojo/Deferred', // Deferred
	'dojo/on', // on
	'dojo/promise/all', // all
	'dojo/query', // query().forEach
	'dojo/when', // when
	'dojo/domReady!'
], function (require, debug, lang, win, aspect, Deferred, on, all, query, when) {

	// eval is evil, except when it isn't, and it isn't in the parser
	/*jshint evil:true */

	var scopeBase = 'dojo',
		attributeBase = 'data-' + scopeBase + '-',
		typeAttribute = attributeBase + 'type',
		propsAttribute = attributeBase + 'props',
		mixinsAttribute = attributeBase + 'mixins',
		jsIdAttribute = attributeBase + 'id',
		attachPointAttribute = attributeBase + 'attach-point',
		attachEventAttribute = attributeBase + 'attach-event',
		scriptArgsAttribute = attributeBase + 'args',
		scriptWithAttribute = attributeBase + 'with',
		scriptEventAttribute = attributeBase + 'event',
		scriptPropAttribute = attributeBase + 'prop',
		scriptMethodAttribute = attributeBase + 'method',
		scriptTypeBase = scopeBase + '/';

	var ctorMap = {};
	function getCtor(types) {
		// summary:
		//		Retrieves a constructor based on the array of `types` passed to the function.  If the array contains
		//		more than one member, the second and subsequent types will be "mixed in" to the first, based on how
		//		the object supports extension.
		//		If the string appears to be a MID (contains a `/`) and the module is not already loaded, an error will
		//		be thrown.
		// types: String[]
		//		An array of constructor types.  They can either be in the format of module IDs or global variables.
		// returns: Object
		//		An object that is intended to be a constructor prototype to be instantiated.
		var ts = types.join();
		if (!ctorMap[ts]) {
			var mixins = types.map(function (t) {
				return ctorMap[t] = ctorMap[t] || (~t.indexOf('/') && require(t)) || lang.getObject(t);
			});
			var ctor = mixins.shift();
			ctorMap[ts] = mixins.length ? (ctor.createSubclass ? ctor.createSubclass(mixins) :
				ctor.extend.apply(ctor, mixins)) : ctor;
		}
		return ctorMap[ts];
	}

	function promiseRequire(mids) {
		// summary:
		//		Performs a context require on an array of module IDs, but returns as a promise
		//		which is fulfilled by the array of modules.
		// mids: String[]
		//		The modules to be required in and returned.
		// returns: dojo/promise/Promise

		var dfd = new Deferred();
		if (mids && mids.length) {
			debug.warn('WARNING: Auto-requiring modules: ' + mids.join(', '));
			try {
				require(mids, function () {
					dfd.resolve(Array.prototype.slice.call(arguments, 0));
				});
			} catch (e) {
				dfd.reject(e);
			}
		} else {
			dfd.resolve([]);
		}
		return dfd.promise;
	}

	function declarativeRequire(node) {
		// summary:
		//		Takes the `innerHTML` of a DOMNode, converts it into a object hash, requires in the supplied modules
		//		based on their module ID and then sets the modules as global objects as identified by the key in their
		//		hash.
		//
		var dfd = new Deferred();

		var midHash = eval('({' + node.innerHTML + '})'),
			vars = [],
			mids = [];

		for (var name in midHash) {
			vars.push(name);
			mids.push(midHash[name]);
		}

		try {
			require(mids, function () {
				vars.forEach(function (name, idx) {
					lang.setObject(name, arguments[idx]);
				});
				dfd.resolve(arguments);
			});
		} catch (e) {
			dfd.reject(e);
		}

		return dfd.promise;
	}

	function functionFromScript(script) {
		// summary:
		//		Take a `<script>` DOMNode and convert it into a Function.
		// script: DOMNode
		//		The DOMNode to convert into a Function.  If the node contains an argument or with attribute, those are
		//		added to the returned function.
		// returns: Function
		var prefix = '',
			suffix = '',
			args = script.getAttribute(scriptArgsAttribute) || '',
			w = script.getAttribute(scriptWithAttribute);

		if (w) {
			w.split(/\s*,\s*/).forEach(function (part) {
				prefix += 'with(' + part + ') {';
				suffix += '}';
			});
		}

		return new Function(args ? args.split(/\s*,\s*/) : [], prefix + script.innerHTML + suffix);

	}

	function convertPropsString(props) {
		// summary:
		//		eval is evil, except when it isn't.  There is no other way to take a text string and convert it into a
		//		JavaScript object.
		return eval('({' + props + '})');
	}

	return {
		instantiate: function (objects, options) {
			// summary:
			//		Instantiate an array of objects and return the instantiated instances
			// objects: Array
			//		An array of objects to instantiate, where are objects are a hash in the format of:
			//	|	{
			//	|		node: DOMNode, // A DOM node that is associated with the Object
			//	|		types: ['module/id', 'mixin/module'], // A string array of modules to derive a constructor
			//	|		ctor: function() {} // Optional constructor function to use or ``null``
			//	|	}
			// options: Object?
			//		A hash of options.  See .parse() for details.
			// returns: Array

			options = options || {};

			var instances = objects.map(function (obj) {
				if (!obj.ctor) {
					obj.ctor = getCtor(obj.types);  // Get ctor will now throw if it cannot be resolved
					obj.proto = obj.ctor && obj.ctor.prototype;
				}
				var props = obj.node.getAttribute(propsAttribute);
				if (props) {
					props = convertPropsString(props);
				}
				props = props || {};

				var scripts = [];
				if (!((obj.ctor && obj.ctor._noScript) || (obj.proto && obj.proto._noScript))) {
					query('> script[type^="dojo/"]', obj.node).forEach(function (script) {
						obj.node.removeChild(script);
						var scriptType = script.getAttribute('type');
						switch (scriptType) {
						case scriptTypeBase + 'on':
							scripts.push({
								node: script,
								type: 'on',
								evt: script.getAttribute(scriptEventAttribute)
							});
							break;
						case scriptTypeBase + 'watch':
							scripts.push({
								node: script,
								type: 'watch',
								prop: script.getAttribute(scriptPropAttribute)
							});
							break;
						case scriptTypeBase + 'before':
							scripts.push({
								node: script,
								type: 'before',
								method: script.getAttribute(scriptMethodAttribute)
							});
							break;
						case scriptTypeBase + 'around':
							scripts.push({
								node: script,
								type: 'around',
								method: script.getAttribute(scriptMethodAttribute)
							});
							break;
						case scriptTypeBase + 'after':
							scripts.push({
								node: script,
								type: 'after',
								method: script.getAttribute(scriptMethodAttribute)
							});
							break;
						default:
							scripts.push({
								node: script,
								type: 'default'
							});
						}
					});
				}

				var instance = new obj.ctor(props, obj.node);

				// Add the instance to the global scope if jsID attribute is set
				var jsId = obj.node.getAttribute(jsIdAttribute);
				if (jsId) {
					lang.setObject(jsId, instance);
				}

				// Loop through the scripts, post the instantiation of the object and set them up
				scripts.forEach(function (script) {
					var fn = functionFromScript(script.node);
					switch (script.type) {
					case 'on':
						on(instance, script.evt, fn);
						break;
					case 'watch':
						instance.watch(script.prop, fn);
						break;
					case 'before':
					case 'around':
					case 'after':
						aspect[script.type](instance, script.method, lang.hitch(instance, fn), true);
						break;
					default:
						fn.call(instance);
					}
				});

				return instance;
			});

			if (!options.noStart) {
				instances.forEach(function (instance) {
					if (typeof instance.startup === 'function' && !instance.started) {
						instance.startup();
					}
				});
			}

			return instances;
		},

		scan: function (rootNode, options) {
			// summary:
			//		Scan the DOM for decorated nodes that should be instantiated as Objects as well as `<script>`
			//		blocks that indicate modules that should be required.  It returns a promise that is fulfilled with
			//		an array of Objects that contain information about how the nodes should be
			//		instantiated.
			// rootNode: DOMNode?
			//		The DOMNode that should serve as the base for the scan.  If null or undefined, defaults to the
			//		body of the window.
			// options: Object?
			//		A hash of options.  See .parse() for details.
			// returns: dojo/promise/Promise

			// setup rootNode and optins if not provided
			rootNode = rootNode || win.body();
			options = options || {};

			// an array that may contain declarative require promises
			var dr = [];

			if (!options.noDeclarativeRequire) {
				// select node that are ``<script type="dojo/require">``
				query('script[type="dojo/require"]', rootNode).forEach(function (script) {
					// require in the modules inside the script object
					dr.push(declarativeRequire(script));

					// remove the node from the DOM so it isn't seen again
					script.parentNode.removeChild(script);
				});
			}

			return when(dr.length ? all(dr) : true).then(function () {
				var objects = [],
					mids = [],
					midHash = {};

				query('[' + typeAttribute + ']', rootNode).forEach(function (node) {
					var mixins = node.getAttribute(mixinsAttribute),
						type = node.getAttribute(typeAttribute),
						types = mixins ? [type].concat(mixins.split(/\s*,\s*/)) : [type],
						ctor;

					try {
						ctor = getCtor(types);
					} catch (e) {
						types.forEach(function (mid) {
							if (~mid.indexOf('/') && !midHash[mid]) {
								mids.push(mid);
								midHash[mid] = true;
							}
						});
					}

					objects.push({
						node: node,
						types: types,
						ctor: ctor
					});
				});

				return when(options.noAutoRequire ? true : promiseRequire(mids)).then(function () {
					return objects;
				});
			});
		},

		parse: function (rootNode, options) {
			// summary:
			//		Scan the DOM for decorated nodes that should be instantiated as Object and instantiate the objects
			//		and script nodes which indicate modules that should be required into and mapped to global
			//		variables.  The return is a promise which is fulfilled with an array of the instantiated objects.
			// rootNode: DOMNode?
			//		The DOMNode that should serve as the base for the scan.  If null or undefined, defaults to the
			//		body of the window.
			// options: Object?
			//		A hash of options:
			//
			//			 Option              | Default     | Description
			//			---------------------|-------------|-------------
			//			noStart              | `false`     | Whether or not to call `.startup()` on instances.
			//			propThis             | `undefined` | What to use for ``this`` when evaluating a property attribute string.  This is specifically designed for templates that contain widgets.
			//			noDeclarativeRequire | `false`     | If `true` it disables scanning the DOM for declarative requires to increase performance
			//			noAutoRequire        | `false`     | If `true` disables the ability to auto-require modules.  If auto-require is disabled, any modules not already loaded will cause the parser to error when it attempts to instantiate the object.
			//
			// returns: dojo/promise/Promise

			// For backwards compatibility with Dijit 1.X at the moment, we need to adjust arguments, because it will
			// sometimes pass a single argument of options instead of a `parse(null, {})`.
			if (!options && rootNode && typeof rootNode === 'object') {
				if ('nodeType' in rootNode) {
					options = {};
				} else {
					options = rootNode;
					rootNode = options.rootNode || win.body();
				}
			} else {
				rootNode = rootNode || win.body();
				options = options || {};
			}

			// This should be the simplified version of the arguments in the future:
			// rootNode = rootNode || win.body();
			// options = options || {};

			console.log('parser.parse', rootNode, options);

			var self = this,
				p = this.scan(rootNode, options).then(function (objects) {
					return self.instantiate(objects, options);
				});

			return p;
		}
	};

});