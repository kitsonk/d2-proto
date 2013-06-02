define([
	'intern!tdd',
	'intern/chai!assert',
	'../../dom'
], function (test, assert, dom) {
	// function domElementMatches() {
	// 	var matchesFunctionName = 'matches' in Element.prototype || false;
	// 	['moz', 'webkit', 'ms', 'o'].some(function (vendorPrefix) {
	// 		console.log(Element.prototype);
	// 		return vendorPrefix + 'MatchesSelector' in Element.prototype ? matchesFunctionName = vendorPrefix + 'MatchesSelector'
	// 			: false;
	// 	});
	// 	return matchesFunctionName;
	// }

	function putDom() {
		dom.add(document.body, 'div#test1[data-dojo-type=test] div#test2[data-dojo-type=test]');
	}

	test.suite('querying the DOM', function () {
		test.test('dom stuff', function () {
			putDom();
			var nodes = Array.prototype.slice.call(document.body.querySelectorAll('div'));
			console.log(nodes);
			var root = dom.get('test1');
			nodes = Array.prototype.slice.call(root.querySelectorAll('div'));
			console.log(nodes);
		});
	});
});