define([
	'teststack!tdd',
	'chai/chai',
	'dojo/on',
	'../../widget/Widget',
	'../../compose',
	'../../put',
], function (test, chai, on, Widget, compose, put) {

	var assert = chai.assert,
		after = compose.after;

	var TestWidget = compose(Widget, {
		declaredClass: 'MyWidget',
		baseClass: 'widget',
		build: after(function () {
			put(this.node, '> div', {
				innerHTML: 'TestWidget'
			});
		})
	});

	put(window.document.body, '> #testWidget');

	test.suite('widget/Widget', function () {
		test.test('basic', function () {
			var clicked = 0;
			var testWidget = new TestWidget({
				onclick: function () {
					clicked++;
				}
			}, 'testWidget');
			assert.equal(clicked, 0, 'not yet clicked');
			on.emit(testWidget.node, 'click', {});
			assert.equal(clicked, 1, 'clicked once');
		});
	});
});