define([
	'../doc',
	'../aspect',
	'../dom',
	'../on',
	'../compose',
	'../lang',
	'../Evented',
	'./registry'
], function (doc, aspect, dom, on, compose, lang, put, Evented, registry) {
	'use strict';

	var property = compose.property,
		required = compose.required,
		around = compose.around;

	function getEventMap(object) {
		var eventMap = {},
			proto = object.constructor.prototype;
		for (var key in proto) {
			if (/^on.+/.test(key)) {
				eventMap[key.substring(2).toLowerCase()] = key;
			}
		}
		return eventMap;
	}

	function nodeEvent() {}

	return compose(function (parameters, sourceNode) {
		var nodeEvents = {},
			key;
		for (key in parameters) {
			if (this[key] === nodeEvent) {
				nodeEvents[key.replace(/^on/, '').toLowerCase()] = parameters[key];
				delete parameters[key];
			}
		}

		this.sourceNode = dom.get(sourceNode);

		if (parameters) {
			this.parameters = parameters;
			lang.mixin(this, parameters);
		}
		this.emit('parameters', { target: this });

		if (!this.id) {
			this.id = registry.getUID(this.declaredClass.replace(/\./g, '_'));
			if (this.parameters) {
				delete this.parameters.id;
			}
		}

		this.ownerDocument = this.ownerDocument || (this.sourceNode ? this.sourceNode.ownerDocument : doc);

		registry.add(this);

		this.build();

		this.emit('create', { target: this });

		for (key in nodeEvents) {
			this.on(key, nodeEvents[key]);
		}

		if (this.node) {
			var source = this.sourceNode;
			if (source && source.parentNode && this.node !== source) {
				source.parentNode.replaceChild(this.node, source);
				delete this.sourceNode;
			}
			this.node.widgetId = this.id;
		}

	}, Evented, {
		id: property({
			get: function () {
				return (this.node && (this.node.id || this.node.widgetId)) ||
					(this.parameters && this.parameters.id) ||
					(this.sourceNode && this.sourceNode.id) || undefined;
			},
			set: function (value) {
				this.node && (this.node.id = value);
				this.parameters && (this.parameters.id = value);
			},
			enumerable: true
		}),
		'class': property({
			get: function () {
				return this.node.class;
			},
			set: function (value) {
				this.node.class = value;
			},
			enumerable: true
		}),
		style: property({
			get: function () {
				return this.node.style;
			},
			set: function (value) {
				var node = this.node;
				if (typeof value === 'string') {
					if (node.style.cssText) {
						node.style.cssText += '; ' + value;
					}
					else {
						node.style.cssText = value;
					}
				}
				// TODO support object definition of style?
			},
			enumerable: true
		}),
		title: '',
		tooltip: '',

		baseClass: required,
		declaredClass: required,
		sourceNode: null,
		node: null,
		ownerDocument: null,

		eventMap: property({
			get: function () {
				if (!this.constructor.eventMap) {
					Object.defineProperty(this.constructor, 'eventMap', {
						value: getEventMap(this)
					});
				}
				return this.constructor.eventMap;
			}
		}),

		started: property({
			value: false,
			writable: true,
			enumerable: false,
			configurable: true,
		}),
		destroying: property({
			value: false,
			writable: true,
			enumerable: false,
			configurable: true
		}),
		destroyed: property({
			value: false,
			writable: true,
			enumerable: false,
			configurable: true
		}),

		parameters: property({
			value: null,
			writable: true,
			enumerable: false,
			configurable: true
		}),

		build: function () {
			if (!this.node) {
				this.node = this.sourceNode || dom.put('div');
			}

			if (this.baseClass) {
				var classes = '.' + this.baseClass.split(' ').join('.');
				dom.put(this.node, classes);
			}
		},

		startup: function () {
			if (this.started) {
				return;
			}
			this.started = true;
		},

		own: function () {

		},

		destroy: function (preserveDom) {
			this.destroying = true;

			function destroy(widget) {
				if (widget.destroyRecursive) {
					widget.destroyRecursive(preserveDom);
				}
				else if (widget.destroy) {
					widget.destroy(preserveDom);
				}
			}

			if (this.node) {
				registry.findWidgets(this.node, this.containerNode).forEach(destroy);
			}

			this.destroyRendering(preserveDom);
			registry.remove(this.id);
			this.destroyed = true;
		},

		destroyRendering: function (preserveDom) {
			if (this.bgIframe) {
				this.gbIframe.destroy(preserveDom);
				delete this.bgIframe;
			}

			if (this.node) {
				if (preserveDom) {
					delete this.node.widgetId;
				}
				else {
					dom.put(this.node, '!');
				}
			}

			if (this.sourceNode) {
				if (!preserveDom) {
					dom.put(this.sourceNode, '!');
				}
				delete this.sourceNode;
			}
		},

		toString: function () {
			return '[Widget ' + this.declaredClass + ', ' + (this.id || 'NO ID') + ']';
		},

		place: function (reference, position) {
			var referenceWidget = !reference.tagName && registry.byId(reference);
			if (referenceWidget && referenceWidget.addChild && (!position || typeof position === 'number')) {
				referenceWidget.addChild(this, position);
			}
			else {
				var ref = referenceWidget ?
					(referenceWidget.containerNode && !/after|before|replace/.test(position || '') ?
						referenceWidget.containerNode : referenceWidget.node) : dom.get(reference, this.ownerDocument);
				switch (position) {
				case 'after':
					dom.put(ref, '+', this.node);
					break;
				case 'before':
					dom.put(ref, '-', this.node);
					break;
				case 'replace':
					// TODO is there way to do this with put?
					ref.parentNode.replaceChild(this.node, ref);
					break;
				// TODO support 'first'
				// TODO support 'only'
				default:
					dom.put(ref, '>', this.node);
				}
			}
		},

		on: around(function (basefn) {
			return function (type, listener) {
				if (this[this.eventMap[type]] === nodeEvent) {
					listener = lang.hitch(this, listener);
					return on.parse(this.node, type, listener, function (target, type) {
						return aspect.after(target, 'on' + type, listener, true);
					});
				}
				else {
					return basefn.call(this, type, listener);
				}
			};
		}),

		onclick: nodeEvent,
		ondblclick: nodeEvent,
		onkeydown: nodeEvent,
		onkeypress: nodeEvent,
		onkeyup: nodeEvent,
		onmousedown: nodeEvent,
		onmousemove: nodeEvent,
		onmouseout: nodeEvent,
		onmouseover: nodeEvent,
		onmouseleave: nodeEvent,
		onmouseenter: nodeEvent,
		onmouseup: nodeEvent
	});
});