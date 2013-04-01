define([
	'teststack!bench',
	'../../parser',
	'dojo/parser',
	'dojox/mobile/parser',
	'../../put',
	'd2-proto/test/resources/AMDClass1',
	'd2-proto/test/resources/AMDClass2',
	'd2-proto/test/resources/Container'
], function (bench, parser, dparser, mparser, put) {

	function createLargeDom(node) {
		var i = 0, j, tbody;
		for (; i < 100; i++) {
			tbody = put(node, 'table tbody');
			for (j = 0; j < 100; j++) {
				put(tbody, 'tr td div[class=test]');
			}
		}
		return node;
	}

	function createBasicDom(node) {
		var i = 0;
		for (; i < 100; i++) {
			var obj = put(node, 'div[data-dojo-type=d2-proto/test/resources/AMDClass1]');
			obj.setAttribute('data-dojo-props', 'strProp1: "foo", strProp2: "bar", arrProp1: [1, 2, 3], arrProp2: [], '
					+ 'objProp1: {}, objProp2: { foo: "bar" }, boolProp1: true, boolProp2: false, numProp1: 1, '
					+ 'numProp2: 2, funcProp1: function () { console.log("hello"); }');
			put(node, 'div[data-dojo-type=d2-proto/test/resources/AMDClass1][strProp1=foo][strProp2=bar]'
				+ '[arrProp1=1,2,3][boolProp1=true][boolProp2=false][numProp1=1][numProp2=2]');
		}
		return node;
	}

	function createSparseDom(node) {
		var i = 0;
		for (; i < 100; i++) {
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
		for (; i < 200; i++) {
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

	bench.benchmark('basic parser comparison', function () {
		bench.test('d2-proto/parser', {
			'defer': true,
			'setup': function () {
				createBasicDom(document.body);
				parser._clear();
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

		bench.test('dojo/parser', {
			'defer': true,
			'setup': function () {
				createBasicDom(document.body);
				dparser._clearCache();
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				dparser.parse().then(function () {
					dfd.resolve();
				});
			}
		});

		bench.test('dojox/mobile/parser', {
			'defer': true,
			'setup': function () {
				createBasicDom(document.body);
				mparser._clear();
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				mparser.parse();
				dfd.resolve();
			}
		});
	});

	bench.benchmark('large DOM scanning', function () {
		bench.test('d2-proto/parser', {
			'defer': true,
			'setup': function () {
				createLargeDom(document.body);
				parser._clear();
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

		bench.test('dojo/parser', {
			'defer': true,
			'setup': function () {
				createLargeDom(document.body);
				dparser._clearCache();
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				dparser.parse().then(function () {
					dfd.resolve();
				});
			}
		});

		bench.test('dojox/mobile/parser', {
			'defer': true,
			'setup': function () {
				createLargeDom(document.body);
				mparser._clear();
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				mparser.parse();
				dfd.resolve();
			}
		});
	});

	bench.benchmark('sparse DOM scanning', function () {
		bench.test('d2-proto/parser', {
			'defer': true,
			'setup': function () {
				createSparseDom(document.body);
				parser._clear();
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

		bench.test('dojo/parser', {
			'defer': true,
			'setup': function () {
				createSparseDom(document.body);
				dparser._clearCache();
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				dparser.parse().then(function () {
					dfd.resolve();
				});
			}
		});

		bench.test('dojox/mobile/parser', {
			'defer': true,
			'setup': function () {
				createSparseDom(document.body);
				mparser._clear();
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				mparser.parse();
				dfd.resolve();
			}
		});
	});

	bench.benchmark('stopParser DOM scanning', function () {
		bench.test('d2-proto/parser', {
			'defer': true,
			'setup': function () {
				createContainerDom(document.body);
				parser._clear();
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

		bench.test('dojo/parser', {
			'defer': true,
			'setup': function () {
				createContainerDom(document.body);
				dparser._clearCache();
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				dparser.parse().then(function () {
					dfd.resolve();
				});
			}
		});

		bench.test('dojox/mobile/parser', {
			'defer': true,
			'setup': function () {
				createContainerDom(document.body);
				mparser._clear();
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				mparser.parse();
				dfd.resolve();
			}
		});
	});

});