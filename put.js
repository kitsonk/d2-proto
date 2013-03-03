define([
	'dojo/has'
], function (has) {
	'use strict';

	var forDocument,
		fragmentFasterHeuristic = /[-+,> ]/;

	var selectorParse = /(?:\s*([-+ ,<>]))?\s*(\.|!\.?|#)?([-\w%$|]+)?(?:\[([^\]=]+)=?['"]?([^\]'"]*)['"]?\])?/g,
		namespaceIndex,
		namespaces = false,
		doc = document;

	has.add('ie-createlement', typeof document.createElement === 'object');

	function insertTextNode(element, text) {
		element.appendChild(doc.createTextNode(text));
	}

	function put(topReferenceElement) {
		var fragment, lastSelectorArg, nextSibling, referenceElement, current, key,
			args = arguments,
			returnValue = args[0]; // use the first argument as the default return value in case only an element is passed in

		function insertLastElement() {
			if (current && referenceElement && current !== referenceElement) {
				(referenceElement === topReferenceElement &&
					(fragment ||
						(fragment = fragmentFasterHeuristic.test(argument) && doc.createDocumentFragment()))
						|| referenceElement).insertBefore(current, nextSibling || null);
			}
		}

		for (var i = 0; i < args.length; i++) {
			var argument = args[i];
			if (typeof argument === 'object') {
				lastSelectorArg = false;
				if (argument instanceof Array) {
					// an array
					current = doc.createDocumentFragment();
					for (key = 0; key < argument.length; key++) {
						current.appendChild(put(argument[key]));
					}
					argument = current;
				}
				if (argument.nodeType) {
					current = argument;
					insertLastElement();
					referenceElement = argument;
					nextSibling = 0;
				}
				else {
					// an object hash
					for (key in argument) {
						current[key] = argument[key];
					}
				}
			}
			else if (lastSelectorArg) {
				lastSelectorArg = false;
				insertTextNode(current, argument);
			}
			else {
				if (i < 1) {
					topReferenceElement = null;
				}
				lastSelectorArg = true;
				var leftoverCharacters = argument.replace(selectorParse, function (t, combinator, prefix, value, attrName, attrValue) {
					if (combinator) {
						insertLastElement();
						if (combinator === '-' || combinator === '+') {
							// TODO: add support for a >- as a means of indicating before the next child?
							referenceElement = (nextSibling = (current || referenceElement)).parentNode;
							current = null;
							if (combinator === '+') {
								nextSibling = nextSibling.nextSibling;
							}// else a - operator, again not in CSS, but obvious in it's meaning (create next element before the current/referenceElement)
						}
						else {
							if (combinator === '<') {
								referenceElement = current = (current || referenceElement).parentNode;
							}
							else {
								if (combinator === ',') {
									referenceElement = topReferenceElement;
								}
								else if (current) {
									referenceElement = current;
								}
								current = null;
							}
							nextSibling = 0;
						}
						if (current) {
							referenceElement = current;
						}
					}
					var tag = !prefix && value;
					if (tag || (!current && (prefix || attrName))) {
						if (tag === '$') {
							insertTextNode(referenceElement, args[++i]);
						}
						else {
							tag = tag || put.defaultTag;
							var ieInputName = has('ie-createlement') && args[i + 1] && args[i + 1].name;
							if (ieInputName) {
								tag = '<' + tag + ' name="' + ieInputName + '">';
							}
							current = namespaces && ~(namespaceIndex = tag.indexOf('|')) ?
								doc.createElementNS(namespaces[tag.slice(0, namespaceIndex)], tag.slice(namespaceIndex + 1)) :
								doc.createElement(tag);
						}
					}
					if (prefix) {
						if (value === '$') {
							value = args[++i];
						}
						if (prefix === '#') {
							current.id = value;
						} else {
							var currentClassName = current.className;
							var removed = currentClassName && (' ' + currentClassName + ' ').replace(' ' + value + ' ', ' ');
							if (prefix === '.') {
								current.className = currentClassName ? (removed + value).substring(1) : value;
							}
							else {
								if (argument === '!') {
									var parentNode;
									if (has('ie-createlement')) {
										put('div', current, '<').innerHTML = '';
									}
									else if (parentNode = current.parentNode) { //intentional assignment
										parentNode.removeChild(current);
									}
								}
								else {
									removed = removed.substring(1, removed.length - 1);
									if (removed !== currentClassName) {
										current.className = removed;
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
							current.style.cssText = attrValue;
						}
						else {
							var method = attrName.charAt(0) === '!' ? (attrName = attrName.substring(1)) && 'removeAttribute' : 'setAttribute';
							attrValue = attrValue === '' ? attrName : attrValue;
							namespaces && ~(namespaceIndex = attrName.indexOf('|')) ?
								current[method + 'NS'](namespaces[attrName.slice(0, namespaceIndex)], attrName.slice(namespaceIndex + 1), attrValue) :
								current[method](attrName, attrValue);
						}
					}
					return '';
				});
				if (leftoverCharacters) {
					throw new SyntaxError('Unexpected char ' + leftoverCharacters + ' in ' + argument);
				}
				insertLastElement();
				referenceElement = returnValue = current || referenceElement;
			}
		}
		if (topReferenceElement && fragment) {
			topReferenceElement.appendChild(fragment);
		}
		return returnValue;
	}

	Object.defineProperties(put, {
		addNamespace: {
			value: function (name, uri) {
				(namespaces || (namespaces = {}))[name] = uri;
			},
			enumerable: true
		},
		defaultTag: {
			value: 'div',
			writable: true,
			enumerable: true
		},
		forDocument: {
			value: forDocument,
			writable: true,
			enumerable: true
		}
	});

	return put;
});