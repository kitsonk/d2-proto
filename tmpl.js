define([
	'exports',
	'./has!host-browser?dojo/request',
	'./has!host-node?./node!fs',
	'require',
	'./doc',
	'./dom',
	'./has',
	'./lang',
	'./properties'
], function (exports, request, fs, require, doc, dom, has, lang, properties) {
	'use strict';

	var notFound = {},
		pending = {},
		cache = {},
		varsRE = /\$\{([^\s\}]+)\}/g,
		indentationRE = /^(\t|\s)+/,
		idPseudoSelectorRE = /:id\(([^\)]+)\)/,
		selectorRE = /^([^\[\s]+(?:\[[^\]]+\])*)(?: (.+))?$/,
		keywordRE = /^(if|else|elseif|unless|each|has)(?: (.+))?$/,
		eachRE = /^(\S+)(?:, *(\S+))? in (\S+)/;

	/**
	 * Parse variables, marked up in the format of `${name}` out of a template string and bind changes to them to the
	 * listener.  The map provides initial values for the any parsed variables which then are then replaced with the
	 * bound variables.  The function returns a hash of all parsed variables.
	 * @param  {[type]} listener [description]
	 * @param  {[type]} map      [description]
	 * @param  {[type]} text     [description]
	 * @return {[type]}          [description]
	 */
	function bindVars(listener, map, text) {

		function parseVarNames(text) {
			var match,
				unique = {},
				varNames = [];

			while ((match = varsRE.exec(text))) {
				if (!unique[match[1]]) {
					unique[match[1]] = 1;
					varNames.push(match[1]);
				}
			}

			return varNames;
		}

		function installObservableProperty(target, name, listener, descriptor) {

			function getListenerDescriptor(listener, oldDescriptor) {
				oldDescriptor = oldDescriptor || { value: undefined, enumerable: true };
				var value = oldDescriptor.value;
				return {
					get: function () {
						return value;
					},
					set: function (newValue) {
						if (value !== newValue) {
							listener({
								type: 'update',
								target: this,
								name: name,
								value: newValue,
								oldValue: value
							});
							value = newValue;
						}
					},
					enumerable: oldDescriptor.enumerable,
					configurable: true
				};
			}

			return Object.defineProperty(target, name, getListenerDescriptor(listener, descriptor));
		}

		function uninstallObservableProperty(target, name) {
			if (name in target) {
				var oldDescriptor = properties.getDescriptor(target, name);
				Object.defineProperty(target, name, {
					value: oldDescriptor.get(),
					writable: true,
					enumerable: oldDescriptor.enumerable,
					configurable: true
				});
			}
			return target[name];
		}

		function decorateListener(listener) {
			if (!('remove' in listener)) {
				listener.remove = function () {
					var i, property;
					for (i = 0; i < this.properties.length; i++) {
						property = this.properties[i];
						uninstallObservableProperty(property.target, property.name);
					}
				};
			}
			if (!('properties' in listener)) {
				listener.properties = [];
			}
			return listener;
		}

		var boundVars = {},
			varNames = parseVarNames(text),
			property,
			i;

		decorateListener(listener);

		for (i = 0; i < varNames.length; i++) {
			property = varNames[i];
			installObservableProperty(boundVars, property, listener, properties.getDescriptor(map, property));
			listener.properties.push({
				target: boundVars,
				name: property
			});
			if (property in map) {
				Object.defineProperty(map, property, properties.getDescriptor(boundVars, property));
				listener.properties.push({
					target: map,
					name: property
				});
			}
		}

		return boundVars;
	}

	/**
	 * Compile a `tmpl` formatted template string
	 * @param  {String} text [description]
	 * @param  {Object} vars [description]
	 * @return {[type]}      [description]
	 */
	function compile(text, vars) {
		var lines,
			line,
			current,
			parent,
			parentIndentation = null,
			indentation,
			idPseudoSelector,
			selector,
			keyword,
			indentationStack = [],
			parentStack = [],
			root = { c: [] };

		var i;

		/**
		 * Take the current line, determine hierarchy and add to template
		 */
		function processLine() {
			if (!indentation && parent !== root) {
				// We have gone to the top of the template, need to reset back to the root
				parent = root;
				indentationStack = [];
				parentStack = [];
				parentIndentation = null;
			}

			if (indentation) {
				// This line is indented, need to set the appropriate depth of the template
				if (!parentIndentation || (indentation[0].length > parentIndentation[0].length)) {
					// We are intended deeper than the previous line, descend further
					parent = current;
					parentIndentation = indentation;
					parentStack.push(parent);
					indentationStack.push(parentIndentation);
				}
				else if (parentIndentation && (indentation[0].length < parentIndentation[0].length)) {
					// We are outdented, need to ascend up the template until we hit our sibling (or the root)
					while ((parentIndentation = indentationStack.pop())) {
						parent = parentStack.pop();
						if (indentation[0].length === parentIndentation[0].length) {
							// Need to put back our level of indentation into the stack
							indentationStack.push(parentIndentation);
							parentStack.push(parent);
							break;
						}
					}
				}
			}

			// If parent doesn't have the child array, add it.
			if (!('c' in parent)) {
				parent.c = [];
			}

			// Identify any logic keywords
			if ((keyword = keywordRE.exec(line))) {
				current = {
					k: keyword[1]
				};
				if (keyword[2]) {
					current.e = keyword[2];
				}
			}
			else {
				// This line should be a selector line

				// Check to see if this line has an `:id()` pseudo selector and if so, parse it out.
				if ((idPseudoSelector = idPseudoSelectorRE.exec(line))) {
					line = line.replace(idPseudoSelector[0], '');
				}

				// Check to see if the line is a selector followed by some text.
				selector = selectorRE.exec(line);
				// If so, then strip the text out of the line
				if (selector && selector[2]) {
					line = line.replace(selector[2], '');
				}

				// Create the current object.
				current = {
					s: line
				};

				// If this contains a return ID, attach it.
				if (idPseudoSelector) {
					current.id = idPseudoSelector[1];
				}

				// Provide the text following the selector as property `t`
				if (selector && selector[2]) {
					current.t = selector[2];
				}
			}

			// Add this line as a child of the parent
			parent.c.push(current);
		}

		if (text) {
			// Process the template by splitting its lines
			lines = text.split('\n');
			parent = root;

			// Iterate over the lines, processing each one as appropriate
			for (i = 0; i < lines.length; i++) {
				line = lines[i];
				indentation = indentationRE.exec(line);
				if (indentation) {
					// strip indentation from start of line
					line = line.substring(indentation[0].length);
				}
				if (line) {
					processLine();
				}
			}
		}

		// Return the template, it should be just the array of children of the root.
		return root.c;
	}

	/**
	 * Create a Function that evaluates the expression and passes the supplied `vars`
	 * @param  {String}  expression The expression that should be evaluated
	 * @param  {Object}  vars       The hash of values that should be passed as arguments to the expression
	 * @return {Boolean}            The result of evaluating the expression
	 */
	function checkExpression(expression, vars) {

		vars = vars || {};

		/**
		 * A proxy Function constructor function that allows the creation of a function via Function.apply
		 * @param {Array} args The array of arguments to be passed to the Function constructor
		 */
		function F(args) {
			return Function.apply(this, args);
		}
		F.prototype = Function.prototype;

		var args = Object.keys(vars),
			vals = [],
			i;

		// Create a snippet of code that returns a boolean value for the supplied expression and add it to the argument
		// array
		args.push('return !!(' + expression + ')');

		// Create a new function that takes each one of the vars as a named argument
		var fn = new F(args);

		// Each of the values of each of the properties of the vars needs to be added to the applied arguments of the
		// newly created function
		for (i = 0; i < args.length; i++) {
			vals.push(vars[args[i]]);
		}

		// Call the function with the supplied vars as arguments
		return fn.apply(this, vals);
	}

	/**
	 * Render the template as a child of the passed node.
	 * @param  {Object}  template A compiled `tmpl` template
	 * @param  {DOMNode} node     The node to be the parent of the template
	 * @param  {Object}  vars     A hash of values used for evaluating logic and substitution
	 * @return {Array}            An array of nodes that have been identified in the template to be returned
	 */
	function render(template, node, vars) {

		var result = {},
			logicStack = [];

		/**
		 * Take an array of template nodes and render them
		 * @param  {Array}   template   An array of 'nodes' to render
		 * @param  {DOMNode} parentNode The DOMNode which any created DOMNodes should be created as children
		 * @param  {Integer} depth      How deep in the template are we to allow for resolution of template logic
		 */
		function renderTemplate(template, parentNode, depth) {
			var i,
				item,
				itemNode,
				eachItems,
				target,
				key,
				valueKey,
				indexKey;

			for (i = 0; i < template.length; i++) {
				item = template[i];
				if (item.s) {
					itemNode = dom.add(parentNode, item.s);
					if (item.t) {
						itemNode.innerHTML = item.t;
					}
					if (item.id) {
						result[item.id] = itemNode;
					}
					if (item.c && item.c.length) {
						renderTemplate(item.c, itemNode, depth + 1);
					}
				}
				else if (item.c) {
					switch (item.k) {
					case 'has':
						if ((logicStack[depth] = has(item.e))) {
							renderTemplate(item.c, parentNode, depth + 1);
						}
						break;
					case 'if':
						logicStack[depth] = false;
						if ((logicStack[depth] = checkExpression(item.e, vars))) {
							renderTemplate(item.c, parentNode, depth + 1);
						}
						break;
					case 'unless':
						logicStack[depth] = false;
						if ((logicStack[depth] = !checkExpression(item.e, vars))) {
							renderTemplate(item.c, parentNode, depth + 1);
						}
						break;
					case 'elseif':
						if (!logicStack[depth]) {
							if ((logicStack[depth] = checkExpression(item.e, vars))) {
								renderTemplate(item.c, parentNode, depth + 1);
							}
						}
						break;
					case 'else':
						if (!logicStack[depth]) {
							renderTemplate(item.c, parentNode, depth + 1);
						}
						break;
					case 'each':
						eachItems = eachRE.exec(item.e);
						if (eachItems) {
							target = lang.getObject(eachItems[3], false, vars);
							valueKey = eachItems[1];
							indexKey = eachItems[2];
							if (target !== null && typeof target === 'object') {
								if (target.length) {
									console.log('array like');
									for (key = 0; key < target.length; key++) {
										vars[valueKey] = target[key];
										if (indexKey) {
											vars[indexKey] = key;
										}
										renderTemplate(item.c, parentNode, depth + 1);
									}
								}
								else {
									console.log('object');
									for (key in target) {
										vars[valueKey] = target[key];
										if (indexKey) {
											vars[indexKey] = key;
										}
										renderTemplate(item.c, parentNode, depth + 1);
									}
								}
								delete vars[valueKey];
								delete vars[indexKey];
							}
							else {
								throw new TypeError('Cannot iterate over non-object.');
							}
						}
						else {
							SyntaxError('"each" keyword not properly formatted');
						}
						break;
					default:
						throw new SyntaxError('Unknown template keyword: ' + item.k);
					}
				}
			}
		}

		renderTemplate(template, node, 0);

		return result;
	}

	/**
	 * Convert a template object into a tmpl string
	 * @param  {Array}  template The source template
	 * @param  {String} result   The result to concatenate onto
	 * @param  {Number} depth    The depth of indentation for strings being added
	 * @return {String}          The tmpl formatted string
	 */
	function toTmpl(template, result, depth) {
		var i,
			item;

		result = result || '';
		depth = depth || 0;

		for (i = 0; i < template.length; i++) {
			item = template[i];
			// TODO: Handle logic nodes
			result += new Array(depth + 1).join('\t') + item.s + '\n';
			if (item.c && item.c.length) {
				result = toTmpl(item.c, result, depth + 1);
			}
		}

		return result;
	}

	/**
	 * The constructor function for the Template object
	 * @param {String} text The `tmpl` formatted template string
	 */
	function Template(text) {
		if (text) {
			this.text = text;
		}
	}

	// Define the Template prototype
	Object.defineProperties(Template.prototype, {
		bindVars: {
			value: function (listener, map, text) {
				text = text || this.text;
				map = map || {};
				return bindVars(listener, map, text);
			},
			enumerable: true
		},
		render: {
			value: function (node, vars) {
				if (!this.template) {
					this.compile();
				}
				vars = vars || {};
				node = node || doc.body;
				return render(this.template, node, vars);
			},
			enumerable: true
		},
		compile: {
			value: function (text, vars) {
				text = text || this.text;
				vars = vars || {};

				/* jshint boss:true */
				return (this.template = compile(text, vars));
			},
			enumerable: true
		},
		text: {
			value: '',
			writable: true,
			enumerable: true
		},
		template: {
			value: null,
			writable: true
		},
		toString: {
			value: function (vars) {
				if (!this.template) {
					this.compile(null, vars);
				}
				return JSON.stringify(this.template);
			}
		},
		toTmpl: {
			value: function (vars) {
				if (!this.template) {
					this.compile(null, vars);
				}
				return toTmpl(this.template, vars);
			}
		},
		fromJson: {
			value: function (json) {
				// TODO
			}
		},
		fromTmpl: {
			value: function (text) {
				// TODO
			}
		}
	});

	/**
	 * Based on environment, retrieve the appropriate functions to be able to load the template and normalize the MID
	 */
	var getText,
		pathUtil;

	if (has('host-browser')) {
		getText = function (url, load) {
			request(url).then(load);
		};
	}
	else if (has('host-node')) {
		getText = function (url, load) {
			fs.readFile(url, 'utf8', function (err, text) {
				if (err) {
					throw new Error(err);
				}
				load(text);
			});
		};
		if (require.nodeRequire) {
			pathUtil = require.nodeRequire('path');
		}
		else {
			throw new Error('Plugin failed to load because it cannot find the original Node.js require');
		}
	}
	else {
		throw new Error('Non-supported environment.');
	}

	/**
	 * The "root" function of the module, which creates a new instance of Template when invoke
	 * @param  {[type]} text [description]
	 * @return {[type]}      [description]
	 */
	function tmpl(text) {
		return new Template(text);
	}

	// Decorate the `tmpl` function with the AMD plug-in API
	Object.defineProperties(tmpl, {
		dynamic: {
			value: true
		},

		normalize: {
			value: function (id, normalize) {
				if (id.charAt(0) === '.') {
					if (has('host-browser')) {
						var parts = id.split('!'),
							url = parts[0];
						id = (/^\./.test(url) ? normalize(url) : url) + (parts[1] ? '!' + parts[1] : '');
					}
					else {
						var referenceModuleDirname = require.toUrl(normalize('.')).replace('/', pathUtil.sep),
							segments = id.split('/');
						segments.unshift(referenceModuleDirname);

						id = pathUtil.join.apply(pathUtil, segments);
					}
				}
				return id;
			}
		},

		load: {
			value: function (id, require, load) {
				var parts = id.split('!'),
					absMid = parts[0],
					url = require.toUrl(absMid),
					requireCacheUrl = 'url:' + url,
					text = notFound,
					template = notFound,
					finish = function (template) {
						load(template);
					},
					pendingList, i;

				if (absMid in cache) {
					template = cache[absMid];
				}
				else if (requireCacheUrl in require.cache) {
					text = require.cache[requireCacheUrl];
				}
				if (text !== notFound && template === notFound) {
					template = new Template(text);
				}
				if (template === notFound) {
					if (pending[url]) {
						pending[url].push(finish);
					}
					else {
						pendingList = pending[url] = [ finish ];
						getText(url, function (text) {
							template = cache[absMid] = new Template(text);
							for (i = 0; i < pendingList.length; i++) {
								pendingList[i](template);
							}
							delete pending[url];
						});
					}
				}
				else {
					finish(template);
				}
			}
		}
	});

	/* jshint boss:true */
	return exports = tmpl;
});