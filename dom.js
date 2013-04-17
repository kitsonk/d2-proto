define([
	'./doc',
	'./has'
], function (doc, has) {
	'use strict';

	has.add('dom-element-matches', function () {
		// This is slightly more robust than what is in dojo/selector/lite in that it returns the function name out of
		// the prototype, which can then be used as a key on Elements directly.

		// Also, currently the has API doesn't recognise the pseudo DOM and therefore the passed arguments to the
		// function to detect the capabilities
		var element = doc.createElement('div'),
			matchesFunctionName = 'matches' in element ? 'matches' : false;
		if (!matchesFunctionName) {
			['moz', 'webkit', 'ms', 'o'].some(function (vendorPrefix) {
				return vendorPrefix + 'MatchesSelector' in element ?
					matchesFunctionName = vendorPrefix + 'MatchesSelector' : false;
			});
		}
		return matchesFunctionName;
	});

	has.add('css-user-select', function (global, doc, element) {
		if (!element) {
			return false;
		}

		var style = element.style,
			prefixes = ['Khtml', 'O', 'ms', 'Moz', 'Webkit'],
			i = prefixes.length,
			name = 'userSelect';

		do {
			if (typeof style[name] !== 'undefined') {
				return name;
			}
		}
		while (i-- && (name = prefixes[i] + 'UserSelect'));

		return false;
	});

	// if it has any of these combinators, it is probably going to be faster with a document fragment
	var fragmentFasterHeuristicRE = /[-+,> ]/,

		selectorRE = /(?:\s*([-+ ,<>]))?\s*(\.|!\.?|#)?([-\w%$|]+)?(?:\[([^\]=]+)=?['"]?([^\]'"]*)['"]?\])?/g,
		namespaces = false,
		namespaceIndex,

		// This matches query selectors that are faster to handle via other methods than qSA
		fastPathRE = /^([\w]*)#([\w\-]+$)|^(\.)([\w\-\*]+$)|^(\w+$)/,

		// Used to split union selectors into separate entities
		unionSplitRE = /([^\s,](?:"(?:\\.|[^"])+"|'(?:\\.|[^'])+'|[^,])*)/g;

	function insertTextNode(doc, node, text) {
		node.appendChild(doc.createTextNode(text));
	}

	function get(id) {
		return ((typeof id === 'string') ? this.doc.getElementById(id) : id) || null;
	}

	function put(node/*, selectors...*/) {
		var args = arguments,
			// use the first argument as the default return value in case only a DOM Node is passed in
			returnValue = node,
			argument;

		var thisDoc = this.doc,
			fragment,
			referenceNode,
			currentNode,
			nextSibling,
			lastSelectorArg,
			leftoverCharacters;

		function insertLastNode() {
			if (currentNode && referenceNode && currentNode !== referenceNode) {
				(referenceNode === node &&
					(fragment ||
						(fragment = fragmentFasterHeuristicRE.test(argument) && thisDoc.createDocumentFragment()))
						|| referenceNode).insertBefore(currentNode, nextSibling || null);
			}
		}

		function parseSelector(t, combinator, prefix, value, attrName, attrValue) {
			var currentNodeClassName,
				removed,
				method;

			if (combinator) {
				insertLastNode();
				if (combinator === '-' || combinator === '+') {
					// TODO: add support for a >- as a means of indicating before the next child?
					referenceNode = (nextSibling = (currentNode || referenceNode)).parentNode;
					currentNode = null;
					if (combinator === '+') {
						nextSibling = nextSibling.nextSibling;
					}
					// else a - operator, again not in CSS, but obvious in it's meaning (create next element before
					// the currentNode/referenceNode)
				}
				else {
					if (combinator === '<') {
						referenceNode = currentNode = (currentNode || referenceNode).parentNode;
					}
					else {
						if (combinator === ',') {
							referenceNode = node;
						}
						else if (currentNode) {
							referenceNode = currentNode;
						}
						currentNode = null;
					}
					nextSibling = 0;
				}
				if (currentNode) {
					referenceNode = currentNode;
				}
			}
			var tag = !prefix && value;
			if (tag || (!currentNode && (prefix || attrName))) {
				if (tag === '$') {
					insertTextNode(thisDoc, referenceNode, args[++i]);
				}
				else {
					tag = tag || dom.defaultTag;
					currentNode = namespaces && ~(namespaceIndex = tag.indexOf('|')) ?
						thisDoc.createElementNS(namespaces[tag.slice(0, namespaceIndex)], tag.slice(namespaceIndex + 1)) :
						thisDoc.createElement(tag);
				}
			}
			if (prefix) {
				if (value === '$') {
					value = args[++i];
				}
				if (prefix === '#') {
					currentNode.id = value;
				}
				else {
					currentNodeClassName = currentNode.className;
					removed = currentNodeClassName && (' ' + currentNodeClassName + ' ').replace(' ' + value + ' ', ' ');
					if (prefix === '.') {
						currentNode.className = currentNodeClassName ? (removed + value).substring(1) : value;
					}
					else {
						if (argument === '!') {
							currentNode.parentNode.removeChild(currentNode);
						}
						else {
							removed = removed.substring(1, removed.length - 1);
							if (removed !== currentNodeClassName) {
								currentNode.className = removed;
							}
						}
					}
				}
			}
			if (attrName) {
				if (attrValue === '$') {
					attrValue = args[++i];
				}
				if (attrName === 'style') {
					currentNode.style.cssText = attrValue;
				}
				if (attrName === 'content' || attrName === '!content') {
					while (currentNode.firstChild !== null) {
						currentNode.removeChild(currentNode.firstChild);
					}
					if (attrName === 'content') {
						currentNode.appendChild(doc.createTextNode(attrValue));
					}
				}
				else {
					method = attrName.charAt(0) === '!' ? (attrName = attrName.substring(1)) && 'removeAttribute'
						: 'setAttribute';
					attrValue = attrValue === '' ? attrName : attrValue;
					namespaces && ~(namespaceIndex = attrName.indexOf('|')) ?
						currentNode[method + 'NS'](namespaces[attrName.slice(0, namespaceIndex)],
							attrName.slice(namespaceIndex + 1), attrValue) :
						currentNode[method](attrName, attrValue);
				}
			}
			return '';
		}

		var i = 0,
			key;
		for (; i < args.length; i++) {
			argument = args[i];
			if (typeof argument === 'object') {
				lastSelectorArg = false;
				if (argument instanceof Array) {
					// an Array
					currentNode = thisDoc.createDocumentFragment();
					var self = this;
					argument.forEach(function (item) {
						currentNode.appendChild(put.call(self, item));
					});
					argument = currentNode;
				}
				if (argument.nodeType) {
					currentNode = argument;
					insertLastNode();
					referenceNode = argument;
					nextSibling = 0;
				}
				else {
					// an object hash
					for (key in argument) {
						currentNode[key] = argument[key];
					}
				}
			}
			else if (lastSelectorArg) {
				lastSelectorArg = false;
				insertTextNode(thisDoc, currentNode, argument);
			}
			else {
				if (i < 1) {
					node = null;
				}
				lastSelectorArg = true;
				leftoverCharacters = argument.replace(selectorRE, parseSelector);
				if (leftoverCharacters) {
					throw new SyntaxError('Unexpected char "' + leftoverCharacters + '" in "' + argument + '"');
				}
				insertLastNode();
				referenceNode = returnValue = currentNode || referenceNode;
			}
		}
		if (node && fragment) {
			node.appendChild(fragment);
		}
		return returnValue;
	}

	function query(/*selectors...*/) {
		var args = arguments,
			argument,
			results = [],
			node = this.doc,
			thisDoc = this.doc,
			self = this,
			fastPath,
			fastPathResults,
			i;

		function rootQuerySelectorAll(root, selector) {
			var origRoot = root,
				rQSA = root.querySelectorAll,
				oldId = root.getAttribute('id'),
				newId = oldId || '__dojo__',
				hasParent = root.parentNode,
				relativeHierarchySelector = /^\s*[+~]/.test(selector),
				selectors,
				i = 0;

			if (relativeHierarchySelector && !hasParent) {
				// This is a "bad" query that simply won't return anything, so why even try
				return [];
			}
			if (!oldId) {
				// If the node doesn't have an ID, let's give it one
				root.setAttribute('id', newId);
			}
			else {
				newId = newId.replace(/'/g, '\\$&');
			}
			if (relativeHierarchySelector && hasParent) {
				root = root.parentNode;
			}
			selectors = selector.match(unionSplitRE);
			for (; i < selectors.length; i++) {
				selectors[i] = '[id=\'' + newId + '\'] ' + selectors[i];
			}
			selector = selectors.join(',');

			try {
				return Array.prototype.slice.call(rQSA.call(root, selector));
			}
			finally {
				if (!oldId) {
					origRoot.removeAttribute('id');
				}
			}
		}

		function fastPathQuery(root, selectorMatch) {
			var parent,
				found;

			if (selectorMatch[2]) {
				// Looks like we are selecting and ID
				found = get.call(self, selectorMatch[2]);
				if (!found || (selectorMatch[1] && selectorMatch[1] !== found.tagName.toLowerCase())) {
					// Either ID wasn't found or there was a tag qualified it didn't match
					return [];
				}
				if (root !== thisDoc) {
					// There is a root element, let's make sure it is in the ancestry try
					parent = found;
					while (parent !== node) {
						parent = parent.parentNode;
						if (!parent) {
							// Ooops, silly person tried selecting an ID that isn't a descendent of the root node
							return [];
						}
					}
				}
				// if there is part of the selector that hasn't been resolved, then we have to pass it back to
				// query to further resolve, otherwise we append it to the results
				return selectorMatch[3] ? query(found, selectorMatch[3]) : [ found ];
			}
			if (selectorMatch[3] && root.getElementsByClassName) {
				// a .class selector
				return Array.prototype.slice.call(root.getElementsByClassName(selectorMatch[4]));
			}
			if (selectorMatch[5]) {
				// a tag
				return Array.prototype.slice.call(root.getElementsByTagName(selectorMatch[5]));
			}
		}

		for (i = 0; i < args.length; i++) {
			argument = args[i];
			if ((typeof argument === 'object' && argument && argument.nodeType) || !argument) {
				// this argument is a node and is now the subject of subsequent selectors
				node = argument;
				continue;
			}
			if (!node) {
				// There is no subject node at the moment, continue consuming arguments
				continue;
			}
			if (typeof argument === 'string') {
				// It is assumed all strings are selectors
				fastPath = fastPathRE.exec(argument);
				if (fastPath) {
					// Quicker to not use qSA
					fastPathResults = fastPathQuery(node, fastPath);
				}
				if (fastPathResults) {
					// There were results returned from fastPathQuery
					results = results.concat(fastPathResults);
				}
				else {
					// qSA should be faster
					if (node === thisDoc) {
						// This is a non-rooted query, just use qSA
						results = results.concat(Array.prototype.slice.call(node.querySelectorAll(argument)));
					}
					else {
						// This is a rooted query, and qSA is really strange in its behaviour, in that it will return
						// nodes that match the selector, irrespective of the context of the root node
						results = results.concat(rootQuerySelectorAll(node, argument));
					}
				}
			}
			else if (argument) {
				throw new TypeError('Invalid argument type of: "' + typeof argument + '"');
			}
		}

		return results;
	}

	function remove(node/*, selectors...*/) {

	}

	// This all probably needs to be moved somewhere else, but it exists in dojo/dom and doesn't have another home at
	// the moment.
	var cssUserSelect = has('css-user-select');

	var setSelectable = cssUserSelect ? function (node, selectable) {
		// css-user-select returns a (possibly vendor-prefixed) CSS property name
		get(node).style[cssUserSelect] = selectable ? '' : 'none';
	} : function (node, selectable) {
		node = get(node);

		var nodes = node.getElementsByTagName('*'),
			i = nodes.length;

		// (IE < 10 / Opera) Fall back to setting/removing the unselectable attribute on the element and all its
		// children
		if (selectable) {
			node.removeAttribute('unselectable');
			while (i--) {
				nodes[i].removeAttribute('unselectable');
			}
		}
		else {
			node.setAttribute('unselectable', 'on');
			while (i--) {
				nodes[i].setAttribute('unselectable', 'on');
			}
		}
	};

	var descriptors = {
		get: {
			value: get,
			enumerable: true
		},
		put: {
			value: put,
			enumerable: true
		},
		query: {
			value: query,
			enumerable: true
		},
		remove: {
			value: remove,
			enumerable: true
		},
		setSelectable: {
			value: setSelectable,
			enumerable: true
		},
		defaultTag: {
			value: 'div',
			writable: true,
			enumerable: true
		},
		addNamespace: {
			value: function (name, uri) {
				(namespaces || (namespaces = {}))[name] = uri;
			},
			enumerable: true
		},
		doc: {
			value: doc,
			writable: true,
			enumerable: true
		}
	};

	var proto = Object.create(Object.prototype, descriptors);

	function Dom(doc) {
		this.doc = doc;
	}

	proto.constructor = Dom;

	Dom.prototype = proto;

	var dom = function (doc) {
		return new Dom(doc);
	};

	Object.defineProperties(dom, descriptors);
	dom.prototype = proto;

	return dom;
});