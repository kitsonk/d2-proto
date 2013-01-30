define([
	'teststack!tdd',
	'chai/chai',
	'../compose'
], function (test, chai, compose) {

	var assert = chai.assert;

	var required = compose.required,
		around = compose.around,
		from = compose.from,
		create = compose.create,
		Widget, MessageWidget, SpanishWidget;

	test.suite('compose', function () {
		test.test('compose', function () {
			Widget = compose({
				render: function (node) {
					node.innerHTML = '<div>hi</div>';
				}
			});

			var node = {},
				widget = new Widget();

			widget.render(node);
			assert(node.innerHTML === '<div>hi</div>');
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
			assert(node.innerHTML, '<div>hi</div>');
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
			assert(node.innerHTML === '<div>Hello, World</div>');
		});
	});

});