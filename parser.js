define([
	'require',
	'./debug', // debug.warn
	'./lang', // lang.getObject, lang.setObject, lang.mixin, lang.hitch
	'./aspect', // aspect.before, aspect.around, aspect.after
	'dojo/Deferred', // Deferred
	'./dom', // dom.get
	'./on', // on
	'dojo/promise/all', // all
	'dojo/when' // when
], function (require, debug, lang, aspect, Deferred, dom, on, all, when) {

	var scopeBase = 'dojo',
		attributeBase = 'data-' + scopeBase + '-',
		typeAttribute = attributeBase + 'type',
		typeSelector,  // this is assigned in the scan function
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
		scriptTypeRE = new RegExp('^' + scopeBase + '\\/\\w', 'i');

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
		'use strict';

		var ts = types.join();
		if (!ctorMap[ts]) {
			var mixins = types.map(function (t) {
				// The assignment on the return is intentional
				/*jshint boss:true */
				return ctorMap[t] = ctorMap[t] || (~t.indexOf('/') && contextRequire(t)) || lang.getObject(t);
			});
			if (mixins.length > 1) {
				var ctor = mixins.shift();
				ctorMap[ts] = ctor.createSubclass ? ctor.createSubclass(mixins) : ctor.extend.apply(ctor, mixins);
			}
		}
		return ctorMap[ts];
	}

	var uid = 0;

	function promiseRequire(mids, contextRequire) {
		// summary:
		//		Performs a context require on an array of module IDs, but returns as a promise
		//		which is fulfilled by the array of modules.
		// mids: String[]
		//		The modules to be required in and returned.
		// contextRequire: Function
		//		The context `require()` to be used for resolving the modules.
		// returns: dojo/promise/Promise
		'use strict';

		var dfd = new Deferred();
		if (mids && mids.length) {
			debug.warn('WARNING: Auto-requiring modules: ' + mids.join(', '));
			try {
				contextRequire(mids, function () {
					dfd.resolve(Array.prototype.slice.call(arguments, 0));
				});
			}
			catch (e) {
				dfd.reject(e);
			}
		}
		else {
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
		'use strict';

		var dfd = new Deferred();

		// Using eval is the only way to convert an non-JSON arbitrary text string to a JavaScript object
		/*jshint evil:true */
		var midHash = eval('({' + node.innerHTML + '})'),
			vars = [],
			mids = [];

		for (var name in midHash) {
			vars.push(name);
			mids.push(midHash[name]);
		}

		try {
			contextRequire(mids, function () {
				var args = arguments;
				vars.forEach(function (name, idx) {
					lang.setObject(name, args[idx]);
				});
				dfd.resolve(args);
			});
		}
		catch (e) {
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
			args = script.getAttribute(scriptArgsAttribute),
			w = script.getAttribute(scriptWithAttribute),
			fn;

		if (w) {
			w.split(/\s*,\s*/).forEach(function (part) {
				prefix += 'with(' + part + ') {';
				suffix += '}';
			});
		}

		try {
			// This is the only way to convert declarative scripting into a function
			/*jshint evil:true */
			fn = new Function(args ? args.split(/\s*,\s*/) : [], prefix + script.innerHTML + suffix);
		}
		catch (e) {
			if (e instanceof SyntaxError) {
				throw new SyntaxError('Error in declarative script: ' + e.message + '\nArguments: ' + args +
					'\nContent:\n' + prefix + script.innerHTML + suffix);
			}
			else {
				throw e;
			}
		}

		return fn;
	}

	function convertPropsString(value) {
		// summary:
		//		eval is evil, except when it isn't.  There is no other way to take a text string and convert it into a
		//		JavaScript object.
		'use strict';

		var props;

		try {
			// This is the only way to convert a non-JSON string into a JavaScript object
			/*jshint evil:true */
			props = eval('({' + value + '})');
		}
		catch (e) {
			throw new SyntaxError('Error in attribute to object conversion: ' + e.message + '\nAttribute Value: "' +
				value + '"');
		}
		return props;
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
		'use strict';

		var props = {};
		if (obj.node && obj.proto) {
			var p, v, t;
			for (p in obj.proto) {
				// Should report `null` on supported browsers if attribute not found.
				// Note that DOM3 spec does state it should be an empty string, but this should not be an issue in
				// supported browsers and avoids that necessity of a .hasAttribute() call.
				v = obj.node.getAttribute(p);
				if (v === null) {
					continue;
				}
				t = typeof obj.proto[p];
				switch (t) {
				case 'string':
					props[p] = v;
					break;
				case 'number':
					props[p] = v - 0;
					break;
				case 'boolean':
					props[p] = v !== 'false';
					break;
				case 'object':
					if (obj.proto[p] instanceof Array) {
						props[p] = v ? v.split(/\s*,\s*/) : [];
					}
					else {
						props[p] = convertPropsString(v);
					}
					break;
				case 'function':
					// This is the only way to convert a string passed as a function argument into a function
					/*jshint evil:true */
					props[p] = lang.getObject(v, false) || new Function(v);
					obj.node.removeAttribute(p);
					break;
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
		'use strict';

		var scripts = [],
			child = node.firstChild,
			type;
		while (child) {
			if (child.nodeType === 1) {
				if (child.nodeName.toLowerCase() === 'script') {
					type = child.getAttribute('type');
					if (type && scriptTypeRE.test(type)) {
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
		'use strict';

		// Because the default selector "[data-dojo-type]" does not return unexpected results for rooted queries, we
		// can just use qSA directly.
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
			'use strict';

			options = options || {};
			options.contextRequire = options.contextRequire = require;

			// These can be overriden by passing them in the options hash.  Once they are set, they are persisted
			// on subsequent parses until changed again.
			propsAttribute = options.propsAttribute || propsAttribute;
			jsIdAttribute = options.jsIdAttribute || jsIdAttribute;

			var instances,
				propsAttr,
				dojoAttachPoint,
				dojoAttachEvent,
				props,
				scripts,
				scriptType,
				adaptor,
				instance,
				jsId,
				fn;

			function resolveCtor(obj) {
				// summary:
				//		When the constructor is not available, try one more time to resolve the constructor.  This is
				//		here to reduce the cyclomatic complexity of the instantiate function.
				// obj: Object
				//		This is the hash of the parsed object
				// returns: Object

				obj.ctor = getCtor(obj.types, options.contextRequire);  // Get ctor will now throw if it cannot be resolved
				if (!obj.ctor) {
					throw new Error('Cannot resolve constructor function for type(s): ' + obj.types.join());
				}
				return obj;
			}

			instances = objects.map(function (obj) {
				// This is a complex function, it could be broken down further, but that would only add to confusion
				// regarding the code.
				/*jshint maxcomplexity:12 */

				// If still don't have constructor, this is our last chance to resolve it
				if (!obj.ctor) {
					obj = resolveCtor(obj);
				}
				obj.proto = obj.ctor && obj.ctor.prototype;

				// Attempts to map individual attributes to properties of the prototype which can be disabled by setting
				// the noCustomAttributes option
				props = options.noCustomAttributes ? {} : getProps.call(options.propsThis, obj);

				dojoAttachPoint = obj.node.getAttribute(attachPointAttribute);
				if (dojoAttachPoint) {
					props.dojoAttachPoint = dojoAttachPoint;
				}

				dojoAttachEvent = obj.node.getAttribute(attachEventAttribute);
				if (dojoAttachEvent) {
					props.dojoAttachEvent = dojoAttachEvent;
				}

				// Handling of special node attributes
				if (obj.node.className && !props['class']) {
					props['class'] = obj.node.className;
				}
				if (obj.node.style.cssText && !props.style) {
					props.style = obj.node.style.cssText;
				}

				// Items from the data-dojo-props override anything derived from the attributes, by convention the value
				// of propsAttribute is a JavaScript object without the enclosing { }
				propsAttr = obj.node.getAttribute(propsAttribute);
				if (propsAttr) {
					props = lang.mixin(props, convertPropsString.call(options.propsThis, propsAttr));
				}

				// If mixin is present, then it will override anything in props
				if (options.mixin) {
					props = lang.mixin(props, options.mixin);
				}

				// If a template, then property set on the properties
				if (options.template) {
					props.template = true;
				}

				scripts = [];
				// The constructor can turn off declarative scripting by setting the ._noScript flag in either the
				// constructor or the prototype
				if (!((obj.ctor && obj.ctor._noScript) || (obj.proto && obj.proto._noScript))) {
					getScriptNodes(obj.node).forEach(function (script) {
						// Removing a script node from the DOM so it isn't seen again
						obj.node.removeChild(script);
						scriptType = script.getAttribute('type');
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

				// If a constructor has an adaptor function, this will be used to return an instance of the object
				adaptor = (obj.ctor && obj.ctor.adaptor) || (obj.proto && obj.proto.adaptor);

				// Create the new instance
				instance = adaptor ? adaptor(props, obj.node, obj.ctor) : new obj.ctor(props, obj.node);

				// Add the instance to the global scope if jsID attribute is set
				jsId = obj.node.getAttribute(jsIdAttribute);
				if (jsId) {
					lang.setObject(jsId, instance);
				}

				// Loop through the scripts, post the instantiation of the object and set them up
				scripts.forEach(function (script) {
					fn = functionFromScript(script.node);
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
			//		an array of Objects that contain information about how the nodes should be instantiated.
			// rootNode: DOMNode?
			//		The DOMNode that should serve as the base for the scan.  If null or undefined, defaults to the
			//		body of the window.
			// options: Object?
			//		A hash of options.  See .parse() for details.
			// returns: dojo/promise/Promise
			'use strict';

			// setup rootNode and options if not provided
			rootNode = rootNode || document.body;
			options = options || {};
			options.contextRequire = options.contextRequire || require;

			// These can be overriden by passing them in the options hash.  Once they are set, they are persisted
			// on subsequent parses until changed again.
			typeAttribute = options.typeAttribute || typeAttribute;
			typeSelector = options.typeSelector || '[' + typeAttribute + ']';
			mixinsAttribute = options.mixinsAttribute || mixinsAttribute;

			if (typeof rootNode === 'string') {
				rootNode = dom.get(rootNode);
			}

			// an array that may contain declarative require promises
			var dr;

			if (!options.noDeclarativeRequire) {
				// select node that are ``<script type="dojo/require">``
				dr = qSA('script[type="dojo/require"]', rootNode).map(function (script) {
					// remove the node from the DOM so it isn't seen again
					script.parentNode.removeChild(script);

					// require in the modules inside the script object
					return declarativeRequire(script, options.contextRequire);
				});
			}

			return when(dr && dr.length ? all(dr) : true).then(function () {
				var objects = {},
					mids = [],
					midHash = {};

				// querySelectorAll is more efficient than the getElementsByTagName, in both dense and sparse
				// decorated DOMs.
				qSA(typeSelector, rootNode).forEach(function (node) {
					var mixins = node.getAttribute(mixinsAttribute),
						type = node.getAttribute(typeAttribute),
						types = mixins ? [type].concat(mixins.split(/\s*,\s*/)) : [type],
						ctor;

					try {
						ctor = getCtor(types, options.contextRequire);
					}
					catch (e) {
						types.forEach(function (mid) {
							if (~mid.indexOf('/') && !midHash[mid]) {
								mids.push(mid);
								midHash[mid] = true;
							}
						});
					}

					// Generate a unique ID for each node we "see" to make it easier to access the nodes.
					// IE supports uniqueID, but we have to generate for other browsers.
					node.__uid = node.__uid || node.uniqueID || uid++;

					objects[node.__uid] = {
						node: node,
						types: types,
						ctor: ctor,
						instantiate: true
					};
				});

				return when(options.noAutoRequire ? objects : promiseRequire(mids, options.contextRequire)
					.then(function (modules) {
						// Attempt to find constructors for modules after an auto-require
						if (modules.length) {
							var id, obj;
							for (id in objects) {
								obj = objects[id];
								try {
									obj.ctor = obj.ctor || getCtor(obj.types, options.contextRequire);
								}
								catch (e) {}
							}
						}
						return objects;
					})).then(function (objects) {
						// Iterate through all the objects, and with those who have a constructor with a `stopParser`
						// flag = `true`, remove them the list of objects.
						var id, obj,
							o = [];
						for (id in objects) {
							obj = objects[id];
							if (!(options.template) && obj.ctor && obj.ctor.prototype &&
									obj.ctor.prototype.stopParser) {
								qSA(typeSelector, obj.node).forEach(function (node) {
									objects[node.__uid].instantiate = false;
								});
							}
							o.push(obj);
						}
						return o.filter(function (obj) {
							return obj.instantiate;
						});
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
			//			propsThis            | `undefined` | What to use for ``this`` when evaluating a property attribute string.  This is specifically designed for templates that contain widgets.
			//			mixin                | `undefined` | If present, this Object will be mixed into every Objects configuration object prior to instantiation.
			//			noDeclarativeRequire | `false`     | If `true` it disables scanning the DOM for declarative requires to increase performance
			//			noAutoRequire        | `false`     | If `true` disables the ability to auto-require modules.  If auto-require is disabled, any modules not already loaded will cause the parser to error when it attempts to instantiate the object.
			//			noCustomAttributes   | `false`     | If `true` disables the ability to use custom attributes to set properties on instantiation of the object.  Only recognises `data-dojo-props` to set instantiation properties.
			//			contextRequire       | `undefined` | Used to provide a context aware `require()` to be used for module resolution.  If not provided, defaults to the context of the parser module.
			//			typeAttribute        | `undefined` | If supplied, this will be the attribute used to identify what type of object needs to be instantiated.  Once supplied it overrides the default of "data-dojo-type" for the lifetime of the instance of the parser.
			//			typeSelector         | `undefined` | If supplied, this will be the CSS selector for identifying nodes to be instantiated.  Once supplied it overrides the default of "[data-dojo-type]" for the lifetime of the instance of the parser.
			//
			// returns: dojo/promise/Promise
			'use strict';

			// For backwards compatibility with Dijit 1.X at the moment, we need to adjust arguments, because it will
			// sometimes pass a single argument of options instead of a `parse(null, {})`.
			if (!options && rootNode && typeof rootNode === 'object') {
				if ('nodeType' in rootNode) {
					options = {};
				}
				else {
					options = rootNode;
					rootNode = options.rootNode || document.body;
				}
			}
			else {
				rootNode = rootNode || document.body;
				options = options || {};
			}

			// In the future this should just be simplified to:
			// rootNode = rootNode || document.body;
			// options = options || {};

			var self = this;
			return this.scan(rootNode, options).then(function (objects) {
				return self.instantiate(objects, options);
			});
		}
	};

});