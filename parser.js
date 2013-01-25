define([
	'require',
	'./debug', // debug.warn
	'dojo/_base/lang', // lang.getObject, lang.setObject, lang.mixin, lang.hitch
	'dojo/_base/window', // win.document
	'dojo/aspect', // aspect.before, aspect.around, aspect.after
	'dojo/Deferred', // Deferred
	'dojo/dom', // dom.byId
	'dojo/on', // on
	'dojo/promise/all', // all
	'dojo/when', // when
	'dojo/domReady!'
], function (require, debug, lang, win, aspect, Deferred, dom, on, all, when) {

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
		scriptTypeBase = scopeBase + '/',
		scriptTypeRegEx = /^dojo\/\w/i;

	var ctorMap = {};
	function getCtor(types, contextRequire) {
		// summary:
		//		Retrieves a constructor based on the array of `types` passed to the function.  If the array contains
		//		more than one member, the second and subsequent types will be "mixed in" to the first, based on how
		//		the object supports extension.
		//		If the string appears to be a MID (contains a `/`) and the module is not already loaded, an error will
		//		be thrown.
		// types: String[]
		//		An array of constructor types.  They can either be in the format of module IDs or global variables.
		// contextRequire: Function
		//		The context `require()` that should be used to resolve the MIDs
		// returns: Object
		//		An object that is intended to be a constructor prototype to be instantiated.
		var ts = types.join();
		if (!ctorMap[ts]) {
			var mixins = types.map(function (t) {
				return ctorMap[t] = ctorMap[t] || (~t.indexOf('/') && contextRequire(t)) || lang.getObject(t);
			});
			if (mixins.length > 1) {
				var ctor = mixins.shift();
				ctorMap[ts] = ctor.createSubclass ? ctor.createSubclass.apply(ctor, mixins) :
					ctor.extend.apply(ctor, mixins);
			}
		}
		return ctorMap[ts];
	}

	function promiseRequire(mids, contextRequire) {
		// summary:
		//		Performs a context require on an array of module IDs, but returns as a promise
		//		which is fulfilled by the array of modules.
		// mids: String[]
		//		The modules to be required in and returned.
		// contextRequire: Function
		//		The context `require()` to be used for resolving the modules.
		// returns: dojo/promise/Promise

		var dfd = new Deferred();
		if (mids && mids.length) {
			debug.warn('WARNING: Auto-requiring modules: ' + mids.join(', '));
			try {
				contextRequire(mids, function () {
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

	function declarativeRequire(node, contextRequire) {
		// summary:
		//		Takes the `innerHTML` of a DOMNode, converts it into a object hash, requires in the supplied modules
		//		based on their module ID and then sets the modules as global objects as identified by the key in their
		//		hash.
		// node: DOMNode
		//		The DOM node that contains the declarative require object hash
		// contextRequire: Function
		//		The contextual `require()` to be used for resolving modules.
		// returns: dojo/promise/Promise

		var dfd = new Deferred();

		var midHash = eval('({' + node.innerHTML + '})'),
			vars = [],
			mids = [];

		for (var name in midHash) {
			vars.push(name);
			mids.push(midHash[name]);
		}

		try {
			contextRequire(mids, function () {
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

	function getProps(obj) {
		// summary:
		//		Iterates through all the properties of the objects prototype before instantiation, looking for any
		//		attributes that might be on the original node which should be copied into the properties to instantiate
		//		the object.
		// obj: Object
		//		The object that contains a obj.node and obj.proto
		// returns: Object
		//		A hash of properties to use to instantiate the object

		var props = {};
		if (obj.node && obj.proto) {
			var p, v, t;
			for (p in obj.proto) {
				v = obj.node.getAttribute(p);
				v = v && v.nodeValue;
				t = typeof obj.proto[p];
				if (!v && (t !== 'boolean' || v !== '')) {
					continue;
				}
				if (obj.proto[p] instanceof Array) {
					props[p] = v.split(/\s*,\s*/);
				} else if (t === 'string') {
					props[p] = v;
				} else if (t === 'number') {
					props[p] = v - 0;
				} else if (t === 'boolean') {
					props[p] = (v !== 'false');
				} else if (t === 'object') {
					props[p] = convertPropsString(v);
				} else if (t === 'function') {
					props[p] = lang.getObject(v, false) || new Function(v);
					obj.node.removeAttribute(p);
				}
			}
		}
		return props;
	}

	function getScriptNodes(node) {
		// summary:
		//		Iterates through all the direct child nodes of the supplied node, returning any nodes that are
		//		identified as "Declarative Scripts" to be "attached" to the object after instantiation.
		// node: DOMNode
		//		The node that is the parent of any potential script nodes.
		// returns: Array
		//		This will be the array of script nodes that contain declarative scripting.

		var scripts = [],
			child = node.firstChild,
			type;
		while (child) {
			if (child.nodeType === 1) {
				if (child.nodeName.toLowerCase() === 'script') {
					type = child.getAttribute('type');
					if (type && scriptTypeRegEx.test(type)) {
						scripts.push(child);
					}
				}
			}
			child = child.nextSibling;
		}
		return scripts;
	}

	function qSA(selector, node) {
		// summary:
		//		A very efficient helper function that does a querySelectorAll and returns an Array.  This is done to
		//		avoid any performance overhead of dojo/query or any selector engine.
		// selector: String
		//		The CSS selector
		// node: DOMNode
		//		The node to server as root for the query

		return Array.prototype.slice.call(node.querySelectorAll(selector));
	}

	return {
		_clear: function () {
			// summary:
			//		Used in performance testing to clear caches

			ctorMap = {};
		},

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
			options.contextRequire = options.contextRequire = require;

			var instances = objects.map(function (obj) {
				if (!obj.ctor) {
					obj.ctor = getCtor(obj.types, options.contextRequire);  // Get ctor will now throw if it cannot be resolved
					obj.proto = obj.ctor && obj.ctor.prototype;
				}

				var propsAttr = obj.node.getAttribute(propsAttribute),
					dojoAttachPoint = obj.node.getAttribute(attachPointAttribute),
					dojoAttachEvent = obj.node.getAttribute(attachEventAttribute),
					props = getProps(obj);

				if (dojoAttachPoint) {
					props.dojoAttachPoint = dojoAttachPoint;
				}

				if (dojoAttachEvent) {
					props.dojoAttachEvent = dojoAttachEvent;
				}

				// Items from the data-dojo-props overrides anything derived from the attributes
				if (propsAttr) {
					props = lang.mixin(props, convertPropsString(propsAttr));
				}

				// If mixin is present, then it will override anything in props
				if (options.mixin) {
					props = lang.mixin(props, options.mixin);
				}

				// If a template, then property set on the properties
				if (options.template) {
					props.template = true;
				}

				var scripts = [];
				if (!((obj.ctor && obj.ctor._noScript) || (obj.proto && obj.proto._noScript))) {
					getScriptNodes(obj.node).forEach(function (script) {
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

			// setup rootNode and options if not provided
			rootNode = rootNode || win.body();
			options = options || {};
			options.contextRequire = options.contextRequire || require;

			if (typeof rootNode === 'string') {
				rootNode = dom.byId(rootNode);
			}

			// an array that may contain declarative require promises
			var dr = [];

			if (!options.noDeclarativeRequire) {
				// select node that are ``<script type="dojo/require">``
				qSA('script[type="dojo/require"]', rootNode).forEach(function (script) {
					// require in the modules inside the script object
					dr.push(declarativeRequire(script, options.contextRequire));

					// remove the node from the DOM so it isn't seen again
					script.parentNode.removeChild(script);
				});
			}

			return when(dr.length ? all(dr) : true).then(function () {
				var objects = [],
					mids = [],
					midHash = {};

				// querySelectorAll is more efficient than the getElementsByTagName, in both dense and sparse
				// decorated DOMs.
				qSA('[' + typeAttribute + ']', rootNode).forEach(function (node) {
					var mixins = node.getAttribute(mixinsAttribute),
						type = node.getAttribute(typeAttribute),
						types = mixins ? [type].concat(mixins.split(/\s*,\s*/)) : [type],
						ctor;

					try {
						ctor = getCtor(types, options.contextRequire);
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

				return when(options.noAutoRequire ? objects : promiseRequire(mids, options.contextRequire)
					.then(function () {
						return objects;
					}));
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
			//			mixin                | `undefined` | If present, this Object will be mixed into every Objects configuration object prior to instantiation.
			//			noDeclarativeRequire | `false`     | If `true` it disables scanning the DOM for declarative requires to increase performance
			//			noAutoRequire        | `false`     | If `true` disables the ability to auto-require modules.  If auto-require is disabled, any modules not already loaded will cause the parser to error when it attempts to instantiate the object.
			//			contextRequire       | `undefined` | Used to provide a context aware `require()` to be used for module resolution.  If not provided, defaults to the context of the parser module.
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

			var self = this,
				p = this.scan(rootNode, options).then(function (objects) {
					return self.instantiate(objects, options);
				});

			return p;
		}
	};

});