define([
	'dojo/_base/array', // array.forEach
	'dojo/_base/declare', // declare
	'dojo/parser' // parser.parse
], function (array, declare, parser) {

	// module:
	//		dijit/_WidgetsInTemplateMixin

	return declare('dijit._WidgetsInTemplateMixin', null, {
		// summary:
		//		Mixin to supplement _TemplatedMixin when template contains widgets

		// _earlyTemplatedStartup: Boolean
		//		A fallback to preserve the 1.0 - 1.3 behavior of children in
		//		templates having their startup called before the parent widget
		//		fires postCreate. Defaults to 'false', causing child widgets to
		//		have their .startup() called immediately before a parent widget
		//		.startup(), but always after the parent .postCreate(). Set to
		//		'true' to re-enable to previous, arguably broken, behavior.
		_earlyTemplatedStartup: false,

		// widgetsInTemplate: [protected] Boolean
		//		Should we parse the template to find widgets that might be
		//		declared in markup inside it?  (Remove for 2.0 and assume true)
		widgetsInTemplate: true,

		// contextRequire: Function
		//		Used to provide a context require to the dojo/parser in order to be
		//		able to use relative MIDs (e.g. `./Widget`) in the widget's template.
		contextRequire: null,

		_beforeFillContent: function () {
			if (this.widgetsInTemplate) {
				// Before copying over content, instantiate widgets in template
				var node = this.domNode;

				var self = this,
					cw = parser.parse(node, {
						noStart: !this._earlyTemplatedStartup,
						template: true,
						inherited: {dir: this.dir, lang: this.lang, textDir: this.textDir},
						propsThis: this,	// so data-dojo-props of widgets in the template can reference 'this' to refer to me
						contextRequire: this.contextRequire,
						scope: 'dojo'	// even in multi-version mode templates use dojoType/data-dojo-type
					});

				// Because the parser only returns a promise, even when operating in async mode, therefore the promise
				// has to be handled.
				cw.then(function (instances) {
					self._startupWidgets = instances;
					if (!cw.isFulfilled()) {
						throw new Error(self.declaredClass + ': parser returned unfilled promise (probably waiting for module auto-load), ' +
							'unsupported by _WidgetsInTemplateMixin.   Must pre-load all supporting widgets before instantiation.');
					}

					// _WidgetBase::destroy() will destroy any supporting widgets under this.domNode.
					// If we wanted to, we could call this.own() on anything in this._startupWidgets that was moved outside
					// of this.domNode (like Dialog, which is moved to <body>).

					self._attachTemplateNodes(instances, function (n, p) {
						return n[p];
					});
				});
			}
		},

		startup: function () {
			array.forEach(this._startupWidgets, function (w) {
				if (w && !w._started && w.startup) {
					w.startup();
				}
			});
			this._startupWidgets = null;
			this.inherited(arguments);
		}
	});
});
