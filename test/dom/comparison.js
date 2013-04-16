define([
	'teststack!bench',
	'../../put'
], function (bench, put) {

	var matchesSelectorKey = 'mozMatchesSelector' in Element.prototype ? 'mozMatchesSelector' :
		'webkitMatchesSelector' in Element.prototype ? 'webkitMatchesSelector' :
		'msMatchesSelector' in Element.prototype ? 'msMatchesSelector' :
		'oMatchesSelector' in Element.prototype ? 'oMatchesSelector' : 'matchesSelector';

	function createLargeDom(node) {
		var i = 0, j, tbody;
		for (; i < 100; i++) {
			tbody = put(node, 'table tbody');
			for (j = 0; j < 100; j++) {
				put(tbody, 'tr td div.test');
			}
		}
		return node;
	}

	function emptyDom(node) {
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
		return node;
	}

	bench.benchmark('basic DOM selection', function () {
		bench.test('qSA', {
			'defer': true,
			'setup': function () {
				createLargeDom(document.body);
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				var results = Array.prototype.slice.call(document.body.querySelectorAll('.test'));
				if (!results.length) {
					throw new Error('wrong!');
				}
				dfd.resolve();
			}
		});
		bench.test('matchesSelector', {
			'defer': true,
			'setup': function () {
				createLargeDom(document.body);
			},
			'teardown': function () {
				emptyDom(document.body);
			},
			'fn': function (dfd) {
				var results = document.body.getElementsByTagName('*');
				var nodes = [];
				var i = 0, node;
				for (; i < results.length; i++) {
					node = results[i];
					if (node[matchesSelectorKey]('.test')) {
						nodes.push(node);
					}
				}
				if (!nodes.length) {
					throw new Error('wrong!');
				}
				dfd.resolve();
			}
		});
	});

});