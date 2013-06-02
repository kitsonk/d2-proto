define([
	'./has!host-browser?dojo/request',
	'./has!host-node?./node!fs',
	'require',
	'./doc',
	'./dom',
	'./has',
	'./lang' // lang.clone
], function (request, fs, require, doc, dom, has, lang) {
	'use strict';

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

	var notFound = {},
		pending = {},
		cache = {},
		indentationRE = /^(\t|\s)+/;

	function Template(text) {
		if (text) {
			this.text = text;
		}
	}

	function compile(text) {
		var lines,
			line,
			current,
			parent,
			parentIndentation = null,
			indentation,
			indentationStack = [],
			parentStack = [],
			root = { c: [] };

		var i;

		function getItem(selector, parent) {
			return {
				s: selector,
				p: parent
			};
		}

		function processLine() {
			if (!indentation && parent !== root) {
				parent = root;
				indentationStack = [];
				parentStack = [];
				parentIndentation = null;
			}
			if (indentation) {
				if (!parentIndentation || (indentation[0].length > parentIndentation[0].length)) {
					parent = current;
					parentIndentation = indentation;
					parentStack.push(parent);
					indentationStack.push(parentIndentation);
				}
				else if (parentIndentation && (indentation[0].length < parentIndentation[0].length)) {
					while ((parentIndentation = indentationStack.pop())) {
						parent = parentStack.pop();
						if (indentation[0].length === parentIndentation[0].length) {
							indentationStack.push(parentIndentation);
							parentStack.push(parent);
							break;
						}
					}
				}
			}
			current = getItem(line, parent);
			if (!('c' in parent)) {
				parent.c = [];
			}
		}

		if (text) {
			lines = text.split('\n');
			parent = root;
			for (i = 0; i < lines.length; i++) {
				line = lines[i];
				indentation = indentationRE.exec(line);
				if (indentation) {
					// strip indentation from start of line
					line = line.substring(indentation[0].length);
				}
				if (line) {
					processLine();
					parent.c.push(current);
				}
			}
		}

		return root.c;
	}

	function generate(template, node, vars) {

		function generateChild(template, parentNode) {
			var i,
				item,
				itemNode;

			for (i = 0; i < template.length; i++) {
				item = template[i];
				itemNode = dom.add(parentNode, item.s);
				if (item.c && item.c.length) {
					generateChild(item.c, itemNode);
				}
			}
			return parentNode;
		}

		return generateChild(template, node);
	}

	/**
	 * Take a template Array, create a clone without any circular references so it can be properly converted into a
	 * JSON string.
	 * @param  {Array}  template The input template
	 * @return {Array}           The template array without parent properties
	 */
	function dereference(template) {
		var i,
			child,
			key,
			result = [];

		for (i = 0; i < template.length; i++) {
			child = {};
			for (key in template[i]) {
				if (key === 'c') {
					child[key] = dereference(template[i].c);
					continue;
				}
				if (key !== 'p') {
					child[key] = template[i][key];
				}
			}
			result.push(child);
		}
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
			result += new Array(depth + 1).join('\t') + item.s + '\n';
			if (item.c && item.c.length) {
				result = toTmpl(item.c, result, depth + 1);
			}
		}

		return result;
	}

	Object.defineProperties(Template.prototype, {
		generate: {
			value: function (node, vars) {
				if (!this.template) {
					this.compile();
				}
				vars = vars || {};
				node = node || doc.body;
				return generate(this.template, node, vars);
			},
			enumerable: true
		},
		compile: {
			value: function (text) {
				text = text || this.text;
				/* jshint boss:true */
				return (this.template = compile(text));
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
					this.compile();
				}
				return JSON.stringify(dereference(this.template));
			}
		},
		toTmpl: {
			value: function (vars) {
				if (!this.template) {
					this.compile();
				}
				return toTmpl(this.template);
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

	function tmpl(text) {
		return new Template(text);
	}

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

	return tmpl;
});