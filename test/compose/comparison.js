define([
	'teststack!bench',
	'../../compose',
	'dojo/_base/declare'
], function (bench, compose, declare) {
	bench.benchmark('basic composition', function () {
		bench.test('compose', function () {
			var Class1 = compose(function (props) {
				this.props = props;
				this.objProp1 = {};
			}, {
				strProp1: 'text',
				strProp2: '',
				objProp1: null,
				props: null
			});

			var instance = new Class1({
				foo: 'bar'
			});
		});
		bench.test('declare', function () {
			var Class1 = declare(null, {
				constructor: function (props) {
					this.props = props;
					this.objProp1 = {};
				},
				strProp1: 'text',
				strProp2: '',
				objProp1: null,
				props: null
			});

			var instance = new Class1({
				foo: 'bar'
			});
		});
	});
	bench.benchmark('inheritance', function () {
		bench.test('compose', function () {
			var Class1 = compose(function (props) {
				this.props = props;
				this.objProp1 = {};
			}, {
				strProp1: 'text',
				strProp2: '',
				objProp1: null,
				props: null
			});

			var Class2 = compose(Class1, {
				funcProp1: function () {
					console.log('hello');
				}
			});

			var instance = new Class2({
				foo: 'bar'
			});
		});
		bench.test('declare', function () {
			var Class1 = declare(null, {
				constructor: function (props) {
					this.props = props;
					this.objProp1 = {};
				},
				strProp1: 'text',
				strProp2: '',
				objProp1: null,
				props: null
			});

			var Class2 = declare(Class1, {
				funcProp1: function () {
					console.log('hello');
				}
			});

			var instance = new Class2({
				foo: 'bar'
			});
		});
	});
	bench.benchmark('function inheritance', function () {
		bench.test('compose', function () {
			var Class1 = compose(function (props) {
				this.props = props;
			}, {
				counter: 0,
				incCounter: function () {
					this.counter++;
				}
			});

			var Class2 = compose(Class1, {
				incCounter: compose.after(function () {
					this.counter++;
				})
			});

			var instance = new Class2({
				foo: 'bar'
			});

			for (var i = 0; i < 1000; i++) {
				instance.incCounter();
			}
		});
		bench.test('declare', function () {
			var Class1 = declare(null, {
				constructor: function (props) {
					this.props = props;
				},
				counter: 0,
				incCounter: function () {
					this.counter++;
				}
			});

			var Class2 = declare(Class1, {
				incCounter: function () {
					this.inherited(arguments);
					this.counter++;
				}
			});

			var instance = new Class2({
				foo: 'bar'
			});

			for (var i = 0; i < 1000; i++) {
				instance.incCounter();
			}
		});
	});
});