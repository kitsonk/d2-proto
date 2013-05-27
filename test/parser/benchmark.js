define([
	'intern!bench',
	'../../parser',
	'../../put',
	'd2-proto/test/resources/AMDClass1',
	'd2-proto/test/resources/AMDClass2',
	'd2-proto/test/resources/AMDMixin',
	'd2-proto/test/resources/Container'
], function (bench, parser, put) {

	function createLargeDom(node) {
		var i = 0, j, tbody;
		for (; i < 50; i++) {
			tbody = put(node, 'table tbody');
			for (j = 0; j < 50; j++) {
				put(tbody, 'tr td div[class=test]');
			}
		}
		return node;
	}

	function createBasicDom(node) {
		var i = 0;
		for (; i < 50; i++) {
			var obj = put(node, 'div[data-dojo-type=d2-proto/test/resources/AMDClass1]');
			obj.setAttribute('data-dojo-props', 'strProp1: "foo", strProp2: "bar", arrProp1: [1, 2, 3], arrProp2: [], '
					+ 'objProp1: {}, objProp2: { foo: "bar" }, boolProp1: true, boolProp2: false, numProp1: 1, '
					+ 'numProp2: 2, funcProp1: function () { console.log("hello"); }');
			put(obj, 'script[type=dojo/after][data-dojo-method=funcProp2]', {
				innerHTML: 'console.log("hello");'
			});
			put(node, 'div[data-dojo-type=d2-proto/test/resources/AMDClass1][strProp1=foo][strProp2=bar]'
				+ '[arrProp1=1,2,3][boolProp1=true][boolProp2=false][numProp1=1][numProp2=2]');
			put(node, 'div[data-dojo-type=d2-proto/test/resources/AMDClass2]'
				+ '[data-dojo-mixins=d2-proto/test/resources/AMDMixin]');
		}
		return node;
	}

	function createSparseDom(node) {
		var i = 0;
		for (; i < 50; i++) {
			put(node, 'div div div div');
			put(node, 'div div div div');
			put(node, 'div div div div');
			put(node, 'div div div div div[data-dojo-type=d2-proto/test/resources/AMDClass1] div div div');
			put(node, 'div div div div');
			put(node, 'div div div div');
			put(node, 'div div div div');
			put(node, 'div div div div div[data-dojo-type=d2-proto/test/resources/AMDClass2] div div div');
		}
	}

	function createContainerDom(node) {
		var i = 0, container;
		for (; i < 50; i++) {
			container = put(node, 'div div[data-dojo-type=d2-proto/test/resources/Container]');
			put(container, 'div[data-dojo-type=d2-proto/test/resources/AMDClass1]');
			put(container, 'div div div div [data-dojo-type=d2-proto/test/resources/AMDClass2]');
		}
	}

	function emptyDom(node) {
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
		return node;
	}

	bench.baseline('parser performance', function () {
		bench.test('no widget scan', {
			'defer': true,
			'setup': function () {
				parser._clear();
				createLargeDom(document.body);
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				parser.parse().then(function () {
					dfd.resolve();
				});
			}
		});
		bench.test('basic parser with scripts', {
			'defer': true,
			'setup': function () {
				parser._clear();
				createBasicDom(document.body);
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				parser.parse().then(function () {
					dfd.resolve();
				});
			}
		});
		bench.test('basic parser with sparse nodes', {
			'defer': true,
			'setup': function () {
				parser._clear();
				createSparseDom(document.body);
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				parser.parse().then(function () {
					dfd.resolve();
				});
			}
		});
		bench.test('container nodes with stopParser', {
			'defer': true,
			'setup': function () {
				parser._clear();
				createContainerDom(document.body);
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				parser.parse().then(function () {
					dfd.resolve();
				});
			}
		});
		bench.test('no auto-require/declarative require', {
			'defer': true,
			'setup': function () {
				parser._clear();
				createBasicDom(document.body);
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				parser.parse({
					noDeclarativeRequire: true,
					noAutoRequire: true
				}).then(function () {
					dfd.resolve();
				});
			}
		});
		bench.test('no custom attributes', {
			'defer': true,
			'setup': function () {
				parser._clear();
				createBasicDom(document.body);
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				parser.parse({
					noCustomAttributes: true
				}).then(function () {
					dfd.resolve();
				});
			}
		});
	});

});