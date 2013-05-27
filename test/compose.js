define([
	'intern!tdd',
	'intern/chai!assert',
	'../compose'
], function (test, assert, compose) {

	var required = compose.required,
		before = compose.before,
		around = compose.around,
		after = compose.after,
		from = compose.from,
		Widget, MessageWidget, SpanishWidget;

	test.suite('compose core functionality', function () {
		test.test('compose', function () {
			Widget = compose({
				render: function (node) {
					node.innerHTML = '<div>hi</div>';
				}
			});

			var node = {},
				widget = new Widget();

			widget.render(node);
			assert.equal(node.innerHTML, '<div>hi</div>');
		});
		test.test('compose with construct', function () {
			Widget = compose(function (node) {
				this.node = node;
			}, {
				render: function () {
					this.node.innerHTML = '<div>hi</div>';
				},
				getNode: function () {
					return this.node;
				}
			});

			var node = {},
				widget = new Widget(node);

			widget.render();
			assert.equal(node.innerHTML, '<div>hi</div>');
		});
		test.test('inheritance', function () {
			MessageWidget = compose(Widget, {
				message: 'Hello, World',
				render: function () {
					this.node.innerHTML = '<div>' + this.message + '</div>';
				}
			});

			var node = {},
				widget = new MessageWidget(node);

			widget.render();
			assert.equal(node.innerHTML, '<div>Hello, World</div>');
		});
		test.test('inheritance via extend', function () {
			MessageWidget = Widget.extend({
				message: 'Hello, World',
				render: function () {
					this.node.innerHTML = '<div>' + this.message + '</div>';
				}
			});

			var node = {},
				widget = new MessageWidget(node);

			widget.render();
			assert.equal(node.innerHTML, '<div>Hello, World</div>');
		});
		test.test('inheritance 2nd generation', function () {
			SpanishWidget = compose(MessageWidget, {
				message: 'Hola'
			});

			var node = {},
				widget = new SpanishWidget(node);

			widget.render();
			assert.equal(node.innerHTML, '<div>Hola</div>');
		});
		test.test('multiple inheritance', function () {
			var Renderer = compose(Widget, {
				render: function () {
					this.node.innerHTML = 'test';
				}
			});
			var RendererSpanishWidget = compose(Renderer, SpanishWidget),
				SpanishWidgetRenderer = compose(SpanishWidget, Renderer),
				EmptyWidget = compose(Widget, {}),
				MessageWidget2 = compose(MessageWidget, EmptyWidget);

			var node = {},
				widget = new RendererSpanishWidget(node);

			widget.render();
			// assert.throws(function () {
			// 	widget.render();
			// }, 'Property \'render\' of object #<Constructor> is not a function');

			widget = new SpanishWidgetRenderer(node);
			widget.render();
			assert.equal(node.innerHTML, 'test');
			assert.equal(widget.getNode(), node, 'proper node returned');

			widget = new MessageWidget2(node);
			widget.render();
			assert.equal(node.innerHTML, '<div>Hello, World</div>');
		});
		test.test('around', function () {
			var WithTitleWidget = compose(MessageWidget, {
				message: 'Hello, World',
				render: around(function (baseRender) {
					return function () {
						baseRender.apply(this);
						node.innerHTML = '<h1>Title</h1>' + node.innerHTML;
					};
				})
			});

			var node = {},
				widget = new WithTitleWidget(node);

			widget.render();
			assert.equal(node.innerHTML, '<h1>Title</h1><div>Hello, World</div>');
		});
		test.test('required', function () {
			var logged,
				Logger = compose({
					logAndRender: function () {
						logged = true;
						this.render();
					},
					render: required
				}),
				LoggerMessageWidget = compose(Logger, MessageWidget);

			var node = {},
				widget = new LoggerMessageWidget(node);

			widget.logAndRender();
			assert.equal(node.innerHTML, '<div>Hello, World</div>');
			assert.isTrue(logged);

			var MessageWidgetLogger = compose(MessageWidget, Logger);
			node = {};
			widget = new MessageWidgetLogger(node);
			logged = false;
			widget.logAndRender();
			assert.equal(node.innerHTML, '<div>Hello, World</div>');
			assert.isTrue(logged);

			widget = new Logger(node);
			assert.throws(function () {
				widget.render();
			});
		});
		test.test('create', function () {
			var widget = compose.create({
				render: function (node) {
					node.innerHTML = '<div>hi</div>';
				}
			});
			var node = {};
			widget.render(node);
			assert.equal(node.innerHTML, '<div>hi</div>', 'node set properly');
		});
		test.test('inheritance create', function () {
			var widget = compose.create(Widget, {
				message: 'Hello, World',
				render: function () {
					this.node.innerHTML = '<div>' + this.message + '</div>';
				}
			}, { foo: 'bar' });
			widget.node = {};
			widget.render();
			assert.equal(widget.node.innerHTML, '<div>Hello, World</div>', 'widget.node.innerHTML');
			assert.equal(widget.foo, 'bar', 'widget.foo');
		});
		test.test('nested compose', function () {
			var ComposingWidget = compose(compose, {
					foo: 'bar'
				}),
				widget = ComposingWidget({
					bar: 'foo'
				});
			assert.equal(widget.foo, 'bar', 'widget.foo');
			assert.equal(widget.bar, 'foo', 'widget.bar');
		});
		test.test('from alias', function () {
			var AliasedWidget = compose(Widget, MessageWidget, {
				baseRender: from(Widget, 'render'),
				messageRender: from('render'),
				render: function () {
					this.baseRender();
					var base = this.node.innerHTML;
					this.messageRender();
					var message = this.node.innerHTML;
					this.node.innerHTML = base + message;
				}
			});

			var node = {},
				widget = new AliasedWidget(node);

			widget.render(node);
			assert.equal(node.innerHTML, '<div>hi</div><div>Hello, World</div>');
		});
		test.test('from exclude', function () {
			var ExcludeWidget = compose(Widget, MessageWidget, {
					render: from(Widget)
				}),
				node = {},
				widget = new ExcludeWidget(node);

			widget.render();
			assert.equal(node.innerHTML, '<div>hi</div>');
		});
		test.test('complex hierarchy', function () {
			var order = [];
			var Widget = compose(function (args) {
					this.id = args.id;
				}, {
					render: function () {
						order.push(1);
					}
				}),
				SubMixin1 = compose({
					render: after(function () {
						order.push(2);
					})
				}),
				SubMixin2 = compose(function () {}, {
					render: after(function () {
						order.push(3);
					})
				}),
				Mixin = compose(SubMixin1, SubMixin2, {
					render: after(function () {
						order.push(4);
					})
				}),
				Mixin2 = compose({
					render: around(function (baseRender) {
						return function () {
							baseRender.apply(this, arguments);
							order.push(5);
						};
					})
				}),
				Button = compose(Widget, Mixin, Mixin2, function () {}, {
					render: around(function (baseRender) {
						return function () {
							baseRender.apply(this, arguments);
							order.push(6);
						};
					})
				});

			var myButton = new Button({ id: 'myId' });

			myButton.render();
			assert.deepEqual(order, [1, 2, 3, 4, 5, 6], 'methods called in proper order');
		});
		test.test('extend error', function () {
			var CustomError = compose(Error, function (message) {
				this.message = message;
			}, {
				name: 'CustomError'
			});

			var error = new CustomError('test');
			assert.equal(error.name, 'CustomError', 'error set properly');
			assert.equal(error.toString(), 'CustomError: test', 'toString works');
			assert.isTrue(error instanceof CustomError, 'error descends from CustomError');
			assert.isTrue(error instanceof Error, 'error descends from Error');
			assert.equal(error.constructor, CustomError, 'constructor is correct');
		});
		test.test('after nothing', function () {
			var fooCount = 0,
				barCount = 0,
				Base = compose({
					foo: after(function () {
						fooCount++;
					})
				}),
				Sub1 = compose(Base, {
					bar: after(function () {
						barCount++;
					})
				});

			var sub = new Sub1();
			sub.foo();
			sub.bar();
			assert.equal(fooCount, 1, 'count of foo correct');
			assert.equal(barCount, 1, 'count of bar correct');
		});
		test.test('diamond inheritance', function () {
			var baseCallCount = 0,
				sub1CallCount = 0,
				sub2CallCount = 0,
				fooCallCount = 0,
				fooSub1Count = 0,
				fooSub2Count = 0,
				Base = compose(function () {
					baseCallCount++;
				}, {
					foo: function () {
						fooCallCount++;
					}
				}),
				Sub1 = compose(Base, function () {
					sub1CallCount++;
				}, {
					foo: after(function () {
						fooSub1Count++;
					})
				}),
				Sub2 = compose(Base, function () {
					sub2CallCount++;
				}, {
					foo: after(function () {
						fooSub2Count++;
					})
				}),
				Combined = Sub1.extend(Sub2),
				combined = new Combined();

			assert.equal(baseCallCount, 1, 'base called once');
			assert.equal(sub1CallCount, 1, 'sub1 called once');
			assert.equal(sub2CallCount, 1, 'sub2 called twice');

			combined.foo();
			assert.equal(fooCallCount, 1, 'base.foo() called');
			assert.equal(fooSub1Count, 1, 'Sub1.foo() called');
			assert.equal(fooSub2Count, 1, 'Sub2.foo() called');
		});
		test.test('null', function () {
			assert.throws(function () {
				compose(null, {});
			}, 'compose arguments must be functions or objects', 'compose throws properly when using null');
		});
		test.test('advice', function () {
			var order = [],
				obj = {
					foo: function (value) {
						order.push(value);
						return 6;
					},
				};

			var Advised = compose(obj, {
				'foo': around(function (base) {
					return function () {
						order.push(2);
						try {
							return base.apply(this, arguments);
						} finally {
							order.push(4);
						}
					};
				})
			});
			Advised = compose(Advised, {
				'foo': after(function () {
					order.push(5);
				})
			});
			Advised = compose(Advised, {
				'foo': before(function (value) {
					order.push(value);
					return [3];
				})
			});

			obj = new Advised();
			order.push(obj.foo(1));
			assert.deepEqual(order, [1, 2, 3, 4, 5, 6], 'advised functions called in order');
			order = [];
			Advised = compose(Advised, {
				'foo': before(function () {
					order.push(0);
					return compose.stop;
				})
			});
			obj = new Advised();
			obj.foo(1);
			assert.deepEqual(order, [0]);
		});
		test.test('decorator', function () {
			var order = [],
				overrides = function (method) {
					return new compose.Decorator(function (key) {
						var baseMethod = this[key];
						if (!baseMethod) {
							throw new Error('No method ' + key + ' exists to override');
						}
						this[key] = method;
					});
				};

			Widget = compose({
				render: function () {
					order.push('render');
				}
			});
			var SubWidget = compose(Widget, {
				render: overrides(function () {
					order.push('sub render');
				})
			});
			var widget = new SubWidget();
			widget.render();
			assert.deepEqual(order, ['sub render']);
		});
	});

	test.suite('compose with ES5 properties', function () {
		var property = compose.property,
			PropertyWidget;
		test.test('basic property installer', function () {
			PropertyWidget = compose(function (node) {
				if (node) {
					this.node = node;
				}
			}, {
				node: property({
					enumerable: true,
					writable: true
				}),
				foo: property({
					value: 'bar',
					enumerable: true
				})
			});

			var widget = new PropertyWidget();
			assert.equal(widget.foo, 'bar', 'widget.foo');
			widget.foo = 'qat';
			assert.deepEqual(Object.keys(widget), [], 'no enumerable owned properties');
		});
		test.test('enumerable properties', function () {
			var node = {},
				widget = new PropertyWidget(node);

			widget.foo = 'qat';
			assert.equal(widget.node, node, 'node was assigned');
			assert.deepEqual(Object.keys(widget), ['node'], 'One enumerable owned key');
		});
		test.test('accessors properties', function () {
			var fooValue = 'bar',
				getCall = 0,
				setCall = 0,
				AccessorWidget = compose(Widget, {
					foo: property({
						get: function () {
							getCall++;
							return fooValue;
						},
						set: function (value) {
							setCall++;
							fooValue = value;
						}
					})
				});

			var widget = new AccessorWidget();
			assert.equal(widget.foo, 'bar', 'widget.foo');
			widget.foo = 'baz';
			assert.equal(widget.foo, 'baz', 'widget.foo');
			assert.equal(getCall, 2, 'getCall');
			assert.equal(setCall, 1, 'setCall');
			assert.equal(fooValue, 'baz', 'fooValue');
		});
		test.test('accessors called in constructor', function () {
			var nodeValue = null,
				getCall = 0,
				setCall = 0,
				AccessorWidget = compose(function (node) {
					this.node = node;
				}, {
					node: property({
						get: function () {
							getCall++;
							return nodeValue;
						},
						set: function (value) {
							setCall++;
							nodeValue = value;
						}
					})
				});

			var node = {},
				widget = new AccessorWidget(node);
			assert.equal(nodeValue, node, 'node set properly');
			assert.equal(getCall, 0, 'get was not called');
			assert.equal(setCall, 1, 'set was called');
		});
		test.test('accessors decorators', function () {
			var nodeValue = null,
				getCall = 0,
				setCall = 0,
				SuperWidget = compose(function (node) {
					this.node = node;
				}, {
					node: property({
						get: function () {
							return nodeValue;
						},
						set: function (value) {
							nodeValue = value;
						}
					})
				}),
				SubWidget = compose(SuperWidget, {
					node: property({
						get: after(function () {
							getCall++;
						}),
						set: after(function () {
							setCall++;
						})
					})
				});

			var node = {},
				widget = new SubWidget(node);
			assert.equal(nodeValue, node, 'node set properly');
			widget.node.innerHTML = '<div>accessors rule</div>';
			assert.equal(nodeValue.innerHTML, '<div>accessors rule</div>', 'direct property access works');
			assert.equal(getCall, 1, 'get aspect after');
			assert.equal(setCall, 1, 'set aspect after');
		});
	});

});