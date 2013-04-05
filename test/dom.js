define([
	'teststack!tdd',
	'teststack/chai!assert',
	'../dom'
], function (test, assert, dom) {

	test.suite('dom.put()', function () {
		var div;
		test.test('basic', function () {
			div = dom.put('div');
			assert.equal(div.tagName.toLowerCase(), 'div', 'basic selector works');
			assert.strictEqual(dom.put(div), div, 'passed nodes handled correctly');
		});
		var body = document.body;
		test.test('add test header', function () {
			dom.put(body, 'h1 $', 'Running dom.put() tests');
		});
		var parentDiv,
			span0, span1, span2, span3, span4, spanMinusTwo, spanWithId;
		test.test('class selectors', function () {
			parentDiv = div;
			span1 = dom.put(parentDiv, 'span.class-name-1.class-name-2[name=span1]');
			assert.equal(span1.className, 'class-name-1 class-name-2', 'span1.className');
			assert.equal(span1.getAttribute('name'), 'span1');
			assert.equal(span1.parentNode, div);

			dom.put(span1, '!class-name-1.class-name-3[!name]');
			assert.equal(span1.className, 'class-name-2 class-name-3');

			dom.put(span1, '!.class-name-3');
			assert.equal(span1.className, 'class-name-2');
			assert.equal(span1.getAttribute('name'), null);
			dom.put(span1, '[name=span1]'); // re-add the attribute
		});
		var defaultTag;
		test.test('element placement', function () {
			defaultTag = dom.put(parentDiv, ' .class');
			assert.equal(defaultTag.tagName.toLowerCase(), 'div');
			span3 = dom.put(span1, '+span[name=span2] + span[name=span3]');
			assert.equal(span3.getAttribute('name'), 'span3');
			assert.equal((span2 = span3.previousSibling).getAttribute('name'), 'span2');
			assert.equal(span3.previousSibling.previousSibling.getAttribute('name'), 'span1');
			span4 = dom.put(span2, '>', span3, 'span.$[name=$]', 'span3-child', 'span4');
			assert.equal(span3.parentNode, span2);
			assert.equal(span4.parentNode, span3);
			assert.equal(span4.className, 'span3-child');
			assert.equal(span4.getAttribute('name'), 'span4');
			dom.put(span2, '+', span3, '+', span4);
			assert.equal(span2.nextSibling, span3);
			assert.equal(span3.nextSibling, span4);
		});
		test.test('setting innerHTML', function () {
			parentDiv = dom.put('div.parent span.first $ + span.second $<', 'inside first', 'inside second');
			assert.equal(parentDiv.firstChild.innerHTML, 'inside first');
			assert.equal(parentDiv.lastChild.innerHTML, 'inside second');
		});
		test.test('destroy', function () {
			dom.put(span3, '!');
			assert.notEqual(span2.nextSibling, span3);
		});
		test.test('before', function () {
			span0 = dom.put(span1, '-span[name=span0]');
			assert.equal(span0.getAttribute('name'), 'span0');
			spanMinusTwo = dom.put(span0, '-span -span');
			assert.equal(spanMinusTwo.nextSibling.nextSibling, span0);
		});
		test.test('with id', function () {
			spanWithId = dom.put(parentDiv, 'span#with-id');
			assert.equal(spanWithId.id, 'with-id');
		});
		var table;
		test.test('table', function () {
			table = dom.put(parentDiv, 'table.class-name#id tr.class-name td[colSpan=2]<<tr.class-name td+td<<');
			assert.equal(table.tagName.toLowerCase(), 'table');
			assert.equal(table.childNodes.length, 2);
			assert.equal(table.firstChild.className, 'class-name');
			assert.equal(table.firstChild.childNodes.length, 1);
			assert.equal(table.lastChild.className, 'class-name');
			assert.equal(table.lastChild.childNodes.length, 2);
		});
		test.test('table rows', function () {
			dom.put(table, 'tr>td,tr>td+td');
			assert.equal(table.childNodes.length, 4);
			assert.equal(table.lastChild.childNodes.length, 2);
		});
		var checkbox;
		test.test('inputs', function () {
			checkbox = dom.put(div, 'input[type=checkbox][checked]');
			assert.equal(checkbox.type, 'checkbox');
			assert.equal(checkbox.getAttribute('checked'), 'checked');
		});
		var arrayFrag;
		test.test('array of fragments', function () {
			div = dom.put('div');
			arrayFrag = dom.put(div, ['span.c1', 'span.c2', 'span.c3']);
			assert.equal(arrayFrag.tagName.toLowerCase(), 'div');
			assert.equal(div.firstChild.className, 'c1');
			assert.equal(div.lastChild.className, 'c3');
		});
		test.test('encoded id', function () {
			dom.put(div, '#encode%3A%20d');
			assert.equal(div.id, 'encode%3A%20d');
		});
		test.test('styles', function () {
			var styled = dom.put('div.someClass[style=color:green;margin-left:10px]');
			assert.equal(styled.style.marginLeft.slice(0, 2), '10');
		});
		test.test('add namespace', function () {
			dom.addNamespace('put', 'http://github.com/kriszyp/dgrid');
			var namespaced = dom.put('put|foo[bar=test1][put|bar=test2]');
			assert.equal((namespaced.namespaceURI || namespaced.tagUrn), 'http://github.com/kriszyp/dgrid');
			assert.equal(namespaced.tagName, 'foo');
			assert.equal(namespaced.getAttribute('bar'), 'test1');
			assert.equal(namespaced.getAttributeNS('http://github.com/kriszyp/dgrid', 'bar'), 'test2');
		});
		test.test('svg', function () {
			dom.addNamespace('svg', 'http://www.w3.org/2000/svg');
			var svg = dom.put(document.body, 'svg|svg#svg-test');
			dom.put(svg, '!');
			assert.equal(document.getElementById('svg-test'), null);
		});
		test.test('finish', function () {
			dom.put(body, 'div', { innerHTML: 'finished tests, check console for errors' });
		});
	});

});