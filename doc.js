define([
	'./compose',
	'./has'
], function (compose, has) {
	'use strict';

	if (has('host-browser')) {
		return document;
	}
	else {
		var emptyElements = {};
		[
			'base',
			'link',
			'meta',
			'hr',
			'br',
			'wbr',
			'img',
			'embed',
			'param',
			'source',
			'track',
			'area',
			'col',
			'input',
			'keygen',
			'command'
		].forEach(function (tag) {
			emptyElements[tag] = true;
		});

		var currentIndentation = '';

		var property = compose.property;

		var body;

		var Element = compose(function (tag) {
			this.tag = tag;
		}, {
			nodeType: 1,
			toString: function (noClose) {
				var tag = this.tag,
					emptyElement = emptyElements[tag];
				if (doc.indentation && !noClose) {
					// using pretty printing for indentation
					var lastIndentation = currentIndentation;
					currentIndentation += doc.indentation;
					var html = (tag === 'html' ? '<!DOCTYPE html>\n<html' : '\n' + lastIndentation + '<' + tag) +
						(this.attributes ? ' class="' + this.className + '"' : '') + '>' +
						(this.children ? this.children.join('') : '') +
						(!this.mixed && !emptyElement && this.children ? '\n' + lastIndentation : '') +
						(emptyElement ? '' : ('</' + tag + '>'));

					currentIndentation = lastIndentation;
					return html;
				}
				return (this.tag === 'html' ? '<!DOCTYPE html>\n<html' : '<' + this.tag) +
					(this.attributes ? this.attributes.join('') : '') +
					(this.className ? ' class="' + this.className + '"' : '') + '>' +
					(this.children ? this.children.join('') : '') +
					((noClose || emptyElement) ? '' : ('</' + tag + '>'));
			},
			sendTo: function (stream) {
				if (typeof stream === 'function') {
					stream = {
						write: stream,
						end: stream
					};
				}
				var active = this,
					streamIndentation = '';

				function pipe(element) {
					// TODO: Perhaps consider buffering if it is any faster and having a non-indentation version that is faster
					var closing = returnTo(this);
					if (closing) {
						stream.write(closing);
					}
					if (element.tag) {
						if (doc.indentation) {
							stream.write('\n' + streamIndentation + element.toString(true));
							streamIndentation += doc.indentation;
						}
						else {
							stream.write(element.toString(true));
						}
						this.children = true;
						active = element;
						element.pipe = pipe;
					}
					else {
						stream.write(element.toString());
					}
				}

				function returnTo(element) {
					var output = '';
					while (active !== element) {
						if (!active) {
							throw new Error('Can not add to an element that has already been streamed.');
						}
						var tag = active.tag,
							emptyElement = emptyElement[tag];

						if (doc.indentation) {
							streamIndentation = streamIndentation.slice(doc.indentation.length);
							if (!emptyElement) {
								output += ((active.mixed || !active.children) ? '' : '\n' + streamIndentation) +
									'</' + tag + '>';
							}
						}
						else if (!emptyElement) {
							output += '</' + tag + '>';
						}
						active = active.parentNode;
					}
					return output;
				}

				pipe.call(this, this);
				// add on end() to close all the tags and close the stream
				this.end = function (leaveStreamOpen) {
					stream[leaveStreamOpen ? 'write' : 'end'](returnTo(this) + '\n</' + this.tag + '>');
				};
				return this;
			},
			firstChild: property({
				get: function () {
					return this.children && this.children.length ? this.children[0] : null;
				},
				enumerable: true
			}),
			children: false,
			attributes: false,
			insertBefore: function (child, reference) {
				child.parentNode = this;
				if (this.pipe) {
					return this.pipe(child);
				}
				var children = this.children;
				if (!children) {
					children = this.children = [];
				}
				if (reference) {
					for (var i = 0; i < children.length; i++) {
						if (reference === children[i]) {
							child.nextSibling = reference;
							if (i > 0) {
								children[i - 1].nextSibling = child;
							}
							return children.splice(i, 0, child);
						}
					}
				}
				if (children.length > 0) {
					children[children.length - 1].nextSibling = child;
				}
				children.push(child);
			},
			appendChild: function (child) {
				if (typeof child === 'string') {
					this.mixed = true;
				}
				if (this.pipe) {
					return this.pipe(child);
				}
				var children = this.children;
				if (!children) {
					children = this.children = [];
				}
				children.push(child);
			},
			removeChild: function (child) {
				if (this.children && this.children.length) {
					var idx = this.children.indexOf(child);
					if (~idx) {
						return this.children.splice(idx, 1);
					}
				}
				throw new Error('Not a child of node.');
			},
			setAttribute: function (name, value/*, escape*/) {
				var attributes = this.attributes || (this.attributes = []);
				attributes.push(' ' + name + '="' + value + '"');
			},
			removeAttribute: function (name) {
				var attributes = this.attributes;
				if (!attributes) {
					return;
				}
				var match = ' ' + name + '=',
					matchLength = match.length;
				for (var i = 0; i < attributes.length; i++) {
					if (attributes[i].slice(0, matchLength) === match) {
						return attributes.splice(i, 1);
					}
				}
			},
			querySelectorAll: function (selector) {
				// TODO
			},
			matches: function (selector) {
				// TODO
			},
			innerHTML: property({
				get: function () {
					return this.children.join('');
				},
				set: function (value) {
					this.mixed = true;
					if (this.pipe) {
						return this.pipe(value);
					}
					this.children = [value];
				}
			})
		});

		var DocumentFragment = compose(Element, {
			toString: function () {
				return this.children ? this.children.join('') : '';
			}
		});

		var lessThanRE = /</g,
			ampersandRE = /&/g,
			namespacePrefixes = {};

		var doc = Object.create(Object.prototype, {
			createElement: {
				value: function (tag) {
					return new Element(tag);
				},
				enumerable: true
			},
			createElementNS: {
				value: function (uri, tag) {
					return new Element(namespacePrefixes[uri] + ':' + tag);
				},
				enumerable: true
			},
			createTextNode: {
				value: function (value) {
					return (typeof value === 'string' ? value : ('' + value)).replace(lessThanRE, '&lt;')
						.replace(ampersandRE, '&amp;');
				},
				enumerable: true
			},
			createDocumentFragment: {
				value: function () {
					return new DocumentFragment();
				},
				enumerable: true
			},
			getElementById: {
				value: function (id) {
					// TODO
				},
				enumerable: true
			},
			querySelectorAll: {
				value: function (selector) {
					// TODO
				},
				enumerable: true
			},
			body: {
				get: function () {
					if (!body) {
						body = new Element('body');
					}
					return body;
				},
				enumerable: true
			},
			indentation: {
				value: '    ',
				writable: true
			}
		});

		return doc;
	}
});