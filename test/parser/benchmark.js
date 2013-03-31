define([
	'teststack!bench',
	'../../parser',
	'../../put',
	'd2-proto/test/resources/AMDClass1',
	'd2-proto/test/resources/AMDClass2'
], function (bench, parser, put) {

	function createBasicDom(node) {
		var obj = put(node, 'div[data-dojo-type=d2-proto/test/resources/AMDClass1]');
		obj.setAttribute('data-dojo-props', 'strProp1: "foo", strProp2: "bar", arrProp1: [1, 2, 3], arrProp2: [], '
				+ 'objProp1: {}, objProp2: { foo: "bar" }, boolProp1: true, boolProp2: false, numProp1: 1, '
				+ 'numProp2: 2, funcProp1: function () { console.log("hello"); }');
		put(obj, 'script[type=dojo/after][data-dojo-method=funcProp2]', {
			innerHTML: 'console.log(this);'
		});
		return node;
	}

	function createSparseDom(node) {
		put(node, 'div div div div');
		put(node, 'div div div div');
		put(node, 'div div div div');
		put(node, 'div div div div div[data-dojo-type=d2-proto/test/resources/AMDClass1]');
		put(node, 'div div div div');
		put(node, 'div div div div');
		put(node, 'div div div div');
		put(node, 'div div div div div[data-dojo-type=d2-proto/test/resources/AMDClass2]');
		put(node, 'div div div div');
		put(node, 'div div div div');
		put(node, 'div div div div');
	}

	function emptyDom(node) {
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
		return node;
	}

	bench.baseline('parser performance', function () {
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
	});

	/* Currently cannot load old parsers
	bench.benchmark('benchmark parsers', function () {
		bench.test('d2-proto/parser', {
			'defer': true,
			'setup': function () {
				createDom(document.body);
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				parser.parse().then(function (instances) {
					if (instances.length !== 1) {
						throw new Error('Not all instances returned.');
					}
					if (instances[0].strProp1 !== 'foo') {
						throw new Error('Improperly parsed.');
					}
					dfd.resolve();
				});
			}
		});

		bench.test('dojo/parser', {
			'defer': true,
			'fn': function (dfd) {
				dparser.parse().then(function (instances) {
					if (instances.length !== 1) {
						throw new Error('Not all instances returned.');
					}
					if (instances[0].strProp1 !== 'foo') {
						throw new Error('Improperly parsed.');
					}
					dfd.resolve();
				});
			}
		});

		bench.test('dojox/mobile/parser', {
			'defer': true,
			'fn': function (dfd) {
				var instances = mparser.parse();
				if (instances.length !== 1) {
					throw new Error('Not all instances returned.');
				}
				if (instances[0].strProp1 !== 'foo') {
					throw new Error('Improperly parsed.');
				}
				dfd.resolve();
			}
		});
	});*/

});