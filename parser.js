define([
	"require",
	"./debug", // debug.warn
	"dojo/_base/lang", // lang.getObject, lang.mixin
	"dojo/_base/window", // win.document
	"dojo/Deferred",
	"dojo/query",
	"dojo/domReady!"
], function(require, debug, lang, win, Deferred, query) {

	var typeAttribute = "data-dojo-type",
		propsAttribute = "data-dojo-props",
		mixinsAttribute = "data-dojo-mixins",
		jsIdAttribute = "data-dojo-id",
		attachPointAttribute = "data-dojo-attach-point",
		attachEventAttribute = "data-dojo-attach-event";

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
		if(!ctorMap[ts]) {
			var mixins = types.map(function(t){
				return ctorMap[t] = ctorMap[t] || (~t.indexOf("/") && require(t)) || lang.getObject(t);
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
			if(mids && mids.length){
				debug.warn("Auto-requiring modules");
				try {
					require(mids, function(){
						dfd.resolve(Array.prototype.slice.call(arguments, 0));
					});
				} catch(e) {
					dfd.reject(e);
				}
			} else {
				dfd.resolve([]);
			}
			return dfd.promise;
	}

	function convertPropsString(props){
		// summary:
		//		eval is evil, except when it isn't.  There is no other way to take a text string and convert it into a
		//		JavaScript object.
		return eval("({" + props + "})");
	}

	return {
		instantiate: function(objects, options) {
			// summary:
			//		Instantiate an array of objects and return the instantiated instances
			// objects: Array
			//		An array of objects to instantiate, where are objects are a hash in the format of:
			//	|	{
			//	|		node: DOMNode, // A DOM node that is associated with the Object
			//	|		types: ["module/id", "mixin/module"], // A string array of modules to derive a constructor
			//	|		ctor: function() {} // Optional constructor function to use or ``null``
			//	|	}
			// options: Object?
			//		A hash of options.  See .parse() for details
			// returns: Array

			options = options || {};

			var instances = objects.map(function(obj){
				if(!obj.ctor){
					obj.ctor = getCtor(obj.types);
				}
				var props = obj.node.getAttribute(propsAttribute);
				if(props) props = convertPropsString(props);
				var instance = new obj.ctor(props, obj.node);
				return instance;
			});

			if(!options.noStart) {
				instances.forEach(function(instance) {
					if(typeof instance.startup == "function" && !instance.started) {
						instance.startup();
					}
				});
			}

			return instances;
		},

		scan: function(rootNode, options) {
			rootNode = rootNode || win.body();
			options = options || {};

			var objects = [],
				mids = [],
				midHash = {};

			query("[" + typeAttribute + "]", rootNode).forEach(function(node) {
				var mixins = node.getAttribute(mixinsAttribute),
					type = node.getAttribute(typeAttribute),
					types = mixins ? [type].concat(mixins.split(/\s*,\s*/)) : [type],
					ctor;

				try {
					ctor = getCtor(types);
				} catch(e) {
					types.forEach(function(mid) {
						if(~mid.indexOf("/")){
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

			return promiseRequire(mids).then(function(){
				return objects;
			});
		},

		parse: function(rootNode, options) {
			rootNode = rootNode || win.body();
			options = options || {};

			var self = this,
				p = this.scan(rootNode, options).then(function(objects) {
					return self.instantiate(objects, options);
				});

			return p;
		}
	};

});