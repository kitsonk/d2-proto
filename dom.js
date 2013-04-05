define([
	'./doc',
	'./has'
], function (doc, has) {
	'use strict';

	// if it has any of these combinators, it is probably going to be faster with a document fragment
	var fragmentFasterHeuristicRE = /[-+,> ]/,

		selectorRE = /(?:\s*([-+ ,<>]))?\s*(\.|!\.?|#)?([-\w%$|]+)?(?:\[([^\]=]+)=?['"]?([^\]'"]*)['"]?\])?/g,
		namespaces = false,
		namespaceIndex;

	function insertTextNode(node, text) {
		node.appendChild(doc.createTextNode(text));
	}

	function get(id) {
		return ((typeof id === 'string') ? doc.getElementById(id) : id) || null;
	}

	function put(node/*, selectors...*/) {
		var args = arguments,
			// use the first argument as the default return value in case only a DOM Node is passed in
			returnValue = args[0],
			argument;

		var fragment,
			referenceNode,
			currentNode,
			nextSibling,
			lastSelectorArg,
			leftoverCharacters;

		function insertLastNode() {
			if (currentNode && referenceNode && currentNode !== referenceNode) {
				(referenceNode === node &&
					(fragment ||
						(fragment = fragmentFasterHeuristicRE.test(argument) && doc.createDocumentFragment()))
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
					insertTextNode(referenceNode, args[++i]);
				}
				else {
					tag = tag || dom.defaultTag;
					currentNode = namespaces && ~(namespaceIndex = tag.indexOf('|')) ?
						doc.createElementNS(namespaces[tag.slice(0, namespaceIndex)], tag.slice(namespaceIndex + 1)) :
						doc.createElement(tag);
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
					currentNode = doc.createDocumentFragment();
					argument.forEach(function (item) {
						currentNode.appendChild(put(item));
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
				insertTextNode(currentNode, argument);
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

	function add(node/*, selectors...*/) {

	}

	function query(/*selectors.../) {

	}

	function remove(/*selectors...*/) {

	}

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
		} while (i-- && (name = prefixes[i] + 'UserSelect'));

		return false;
	});

	var cssUserSelect = has('css-user-select');

	var setSelectable = cssUserSelect ? function (node, selectable) {
		// css-user-select returns a (possibly vendor-prefixed) CSS property name
		byId(node).style[cssUserSelect] = selectable ? '' : 'none';
	} : function (node, selectable) {
		node = byId(node);

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

	var dom = Object.create(Object.prototype, {
		get: {
			value: get,
			enumerable: true
		},
		put: {
			value: put,
			enumerable: true
		},
		add: {
			value: add,
			enumerable: true
		},
		query: {
			value: query,
			enumerable: true
		},
		remove: {
			value: add,
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
		}
	});

	return dom;
});