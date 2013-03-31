define([
	'teststack!bench',
	'../../parser',
	'../../put',
	'd2-proto/test/resources/AMDClass1'
], function (bench, parser, put) {

	function createDom(node) {
		put(node, 'div[data-dojo-type=d2-proto/test/resources/AMDClass1]')
			.setAttribute('data-dojo-props', 'strProp1: "foo", strProp2: "bar", arrProp1: [1, 2, 3], arrProp2: [], '
				+ 'objProp1: {}, objProp2: { foo: "bar" }, boolProp1: true, boolProp2: false, numProp1: 1, '
				+ 'numProp2: 2, funcProp1: function () { console.log("hello"); }');
		return node;
	}

	createDom(document.body);

	bench.benchmark('benchmark parsers', function () {
		bench.test('d2-proto/parser', {
			'defer': true,
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

		// Currently can't load dojo/parser

		// bench.test('dojo/parser', {
		// 	'defer': true,
		// 	'fn': function (dfd) {
		// 		dparser.parse().then(function (instances) {
		// 			if (instances.length !== 1) {
		// 				throw new Error('Not all instances returned.');
		// 			}
		// 			if (instances[0].strProp1 !== 'foo') {
		// 				throw new Error('Improperly parsed.');
		// 			}
		// 			dfd.resolve();
		// 		});
		// 	}
		// });

		// Currently can't load dojox/mobile/parser

		// bench.test('dojox/mobile/parser', {
		// 	'defer': true,
		// 	'fn': function (dfd) {
		// 		var instances = mparser.parse();
		// 		if (instances.length !== 1) {
		// 			throw new Error('Not all instances returned.');
		// 		}
		// 		if (instances[0].strProp1 !== 'foo') {
		// 			throw new Error('Improperly parsed.');
		// 		}
		// 		dfd.resolve();
		// 	}
		// });
	});

});