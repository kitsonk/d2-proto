define([
	'intern!tdd',
	'intern/chai!assert',
	'../dom',
	'../doc',
	'../has',
	'../lang'
], function (test, assert, dom, doc, has, lang) {

	// Currently these tests don't work against the pseudo DOM

	function emptyDom(root) {
		root = root || doc.body;
		while (root.firstChild) {
			root.removeChild(root.firstChild);
		}
		return root;
	}

	function setQueryTestDom(root) {
		root = root || doc.body;
		root.className = 'upperclass';
		root.innerHTML = '		<h1>Testing dojo/dom.query().</h1>' +
			'		<p>Something</p>' +
			'		<div id="t" class="lowerclass">' +
			'			<h3>h3 <span>span</span> endh3 </h3>' +
			'			<!-- comment to throw things off -->' +
			'			<div class="foo bar" id="_foo">' +
			'				<h3>h3</h3>' +
			'				<span id="foo"></span>' +
			'				<span></span>' +
			'			</div>' +
			'			<h3>h3</h3>' +
			'			<h3 class="baz foobar" title="thud">h3</h3>' +
			'			<span class="fooBar baz foo"></span>' +
			'			<span foo="bar"></span>' +
			'			<span foo="baz bar thud"></span>' +
			'			<!-- FIXME: should foo="bar-baz-thud" match? [foo$=thud] ??? -->' +
			'			<span foo="bar-baz-thudish" id="silly:id::with:colons"></span>' +
			'			<div id="container">' +
			'				<div id="child1" qux="true"></div>' +
			'				<div id="child2"></div>' +
			'				<div id="child3" qux="true"></div>' +
			'			</div>' +
			'			<div id="silly~id" qux="true"></div>' +
			'			<input id="notbug" name="bug" type="hidden" value="failed"> ' +
			'			<input id="bug" type="hidden" value="passed"> ' +
			'		</div>' +
			'		<div id="t2" class="lowerclass">' +
			'			<input type="checkbox" name="checkbox1" id="checkbox1" value="foo">' +
			'			<input type="checkbox" name="checkbox2" id="checkbox2" value="bar" checked>' +
			'			<input type="radio" disabled="true" name="radio" id="radio1" value="thinger">' +
			'			<input type="radio" name="radio" id="radio2" value="stuff" checked>' +
			'			<input type="radio" name="radio" id="radio3" value="blah">' +
			'		</div>' +
			'		<select id="t2select" multiple="multiple">' +
			'			<option>0</option>' +
			'			<option selected="selected">1</option>' +
			'			<option selected="selected">2</option>' +
			'		</select>' +
			'		<iframe id="t3" name="t3" src="../d2-proto/test/resources/blank.html"></iframe>' +
			'		<div id="t4">' +
			'			<div id="one" class="subDiv">' +
			'				<p class="one subP"><a class="subA">one</a></p>' +
			'				<div id="two" class="subDiv">' +
			'					<p class="two subP"><a class="subA">two</a></p>' +
			'				</div>' +
			'			</div>' +
			'		</div>' +
			'		<section></section>' +
			'		<div id="other">' +
			'		  <div id="abc55555"></div>' +
			'		  <div id="abd55555efg"></div>' +
			'		  <div id="55555abc"></div>' +
			'		  <div id="1"></div>' +
			'		  <div id="2c"></div>' +
			'		  <div id="3ch"></div>' +
			'		  <div id="4chr"></div>' +
			'		  <div id="5char"></div>' +
			'		  <div id="6chars"></div>' +
			'		</div>' +
			'		<div id="attrSpecialChars">' +
			'			<select name="special">' +
			'				<!-- tests for special characters in attribute values (characters that are part of query syntax) -->' +
			'				<option value="a+b">1</option>' +
			'				<option value="a~b">2</option>' +
			'				<option value="a^b">3</option>' +
			'				<option value="a,b">4</option>' +
			'			</select>' +
			'			<!-- tests for quotes in attribute values -->' +
			'			<a href="foo=bar">hi</a>' +
			'			<!-- tests for brackets in attribute values -->' +
			'			<input name="data[foo][bar]">' +
			'			<!-- attribute name with a dot, goes down separate code path -->' +
			'			<input name="foo[0].bar">' +
			'			<input name="test[0]">' +
			'		</div>';
	}

	function setGetTestDom(root) {
		root = root || doc.body;
		root.innerHTML = '<h1>testing Core DOM utils: dojo.byId</h1>' +
			'		<form name="foobar">' +
			'			<input type="text" name="baz" value="baz1">' +
			'			<input type="text" name="baz" value="baz2">' +
			'		</form>' +
			'		<form name="dude"></form>' +
			'		<form name="ranch">' +
			'			<input type="text" name="cattle" id="ranch" value="baz1">' +
			'		</form>' +
			'		<form name="ranch2">' +
			'			<input type="text" name="cattle2" value="baz1">' +
			'		</form>' +
			'		<form name="ranch3">' +
			'			<input type="text" name="cattle3" value="baz1">' +
			'			<input type="text" name="cattle3" id="cattle3" value="cattle3">' +
			'		</form>' +
			'		<form name="sea">' +
			'			<input type="text" name="fish" value="fish">' +
			'			<input type="text" name="turtle" value="turtle">' +
			'		</form>' +
			'		<span id="fish">Fish span</span>' +
			'		<form name="lamps">' +
			'			<input type="text" name="id" value="blue">' +
			'		</form>' +
			'		<form name="chairs" id="chairs">' +
			'			<input type="text" name="id" value="recliner">' +
			'		</form>' +
			'		<div id="start">a start node</div>';
	}

	function getIframeDoc(iframeNode) {
		if (iframeNode.contentDocument) {
			return iframeNode.contentDocument;
		}
		var name = iframeNode.name;
		if (name) {
			var iframes = doc.getElementsByTagName('iframe');
			if (iframeNode.document && iframes[name].contentWindow && iframes[name].contentWindow.document) {
				return iframes[name].contentWindow.document;
			}
			else if (doc.frames[name] && doc.frames[name].document) {
				return doc.frames[name].document;
			}
		}
		return null;
	}

	test.suite('dom.get()', function () {
		test.test('basic', function () {
			emptyDom();
			setGetTestDom();
			assert(!dom.get(null), 'dom.get(null)');
			assert(!dom.get(undefined), 'dom.get(undefined)');
			assert(!dom.get('baz'), 'dom.get("baz")');
			assert(!dom.get('foobar'), 'dom.get("foobar")');
			assert(!dom.get('dude'), 'dom.get("dude")');
			assert(!dom.get('cattle'), 'dom.get("cattle")');
			assert(!dom.get('cattle2'), 'dom.get("cattle2")');
			assert(!dom.get('lamps'), 'dom.get("lamps")');
			assert(!dom.get('blue'), 'dom.get("blue")');
			assert(dom.get('chairs'), 'dom.get("chairs")');
			assert(dom.get('ranch'), 'dom.get("ranch")');
			assert(dom.get('cattle3'), 'dom.get("cattle3")');
			assert.equal('span', dom.get('fish').nodeName.toLowerCase());
		});
		test.test('node cloning', function () {
			var startNode = dom.get('start');
			var clonedNode = lang.clone(startNode);
			clonedNode.id = 'clonedStart';
			clonedNode.innerText = 'This is a cloned div';
			doc.body.appendChild(clonedNode);
			assert.equal('This is a cloned div', dom.get('clonedStart').innerText);
		});
	});

	test.suite('dom.put()', function () {
		var div;
		test.test('basic', function () {
			emptyDom();
			div = dom.put('div');
			assert.equal(div.tagName.toLowerCase(), 'div', 'basic selector works');
			assert.strictEqual(dom.put(div), div, 'passed nodes handled correctly');
		});
		var body = doc.body;
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
			var svg = dom.put(doc.body, 'svg|svg#svg-test');
			dom.put(svg, '!');
			assert.equal(doc.getElementById('svg-test'), null);
		});
		test.test('content attribute', function () {
			var contentNode = dom.put(doc.body, 'div[content=testing]');
			assert.equal('testing', contentNode.innerHTML);
			dom.put(contentNode, '[content=change the text]');
			assert.equal('change the text', contentNode.innerHTML);
			dom.put(contentNode, '[!content]');
			assert.equal('', contentNode.innerHTML);
		});
	});

	test.suite('dom.query()', function () {
		test.test('basic', function () {
			emptyDom();
			setQueryTestDom();
			assert.equal(4, dom.query('h3').length, 'dom.query("h3")');
			assert.equal(1, dom.query('#t').length, 'dom.query("#t")');
			assert.equal(1, dom.query('#bug').length, 'dom.query("#bug")');
			assert.equal(4, dom.query('#t h3').length, 'dom.query("#t h3")');
			assert.equal(1, dom.query('div#t').length, 'dom.query("div#t")');
			assert.equal(4, dom.query('div#t h3').length, 'dom.query("div#t h3")');
			assert.equal(0, dom.query('span#t').length, 'dom.query("span#t")');
			assert.equal(0, dom.query('.bogus').length, 'dom.query(".bogus")');
			assert.equal(0, dom.query(dom.get('container'), '.bogus').length, 'dom.query(container, ".bogus")');
			assert.equal(0, dom.query('#bogus').length, 'dom.query("#bogus")');
			assert.equal(0, dom.query(dom.get('container'), '#bogus').length, 'dom.query(container, "#bogus")');
			assert.equal(1, dom.query('#t div > h3').length, 'dom.query("#t div > h3")');
			assert.equal(2, dom.query('.foo').length, 'dom.query(".foo")');
			assert.equal(1, dom.query('.foo.bar').length, 'dom.query(".foo.bar")');
			assert.equal(2, dom.query('.baz').length, 'dom.query(".baz")');
			assert.equal(3, dom.query('#t > h3').length, 'dom.query("#t > h3")');
			assert.equal(1, dom.query('section').length, 'dom.query("section")');
			assert.equal(0, dom.query(null).length, 'dom.query(null)');
		});
		test.test('syntactic equivalents', function () {
			assert.equal(12, dom.query('#t > *').length, 'dom.query("#t > *")');
			assert.equal(3, dom.query('.foo > *').length, 'dom.query(".foo > *")');
		});
		test.test('rooted queries', function () {
			var container = dom.get('container'),
				t = dom.get('t');
			assert.equal(3, dom.query(container, '> *').length, 'dom.query(container, "> *")');
			assert.equal(3, dom.query(container, '> *, > h3').length, 'dom.query(container, "> *"');
			assert.equal(3, dom.query(t, '> h3').length, 'dom.query(t, "> h3")');
		});
		test.test('compound queries', function () {
			assert.equal(2, dom.query('.foo, .bar').length, 'dom.query(".foo, .bar")');
			assert.equal(2, dom.query('.foo,.bar').length, 'dom.query(".foo,.bar")');
			assert.equal(2, dom.query('#baz,#foo,#t').length, 'dom.query("#baz,#foo,#t")');
			assert.equal(2, dom.query('#foo,#baz,#t').length, 'dom.query("#foo,#baz,#t")');
		});
		test.test('multiple class attribute', function () {
			assert.equal(1, dom.query('.foo.bar').length, 'dom.query(".foo.bar")');
			assert.equal(2, dom.query('.foo').length, 'dom.query(".foo")');
			assert.equal(2, dom.query('.baz').length, 'dom.query(".bar")');
		});
		test.test('case sensitivity', function () {
			assert.equal(1, dom.query('span.baz').length, 'dom.query("span.baz")');
			assert.equal(1, dom.query('sPaN.baz').length, 'dom.query("sPaN.baz")');
			assert.equal(1, dom.query('SPAN.baz').length, 'dom.query("SPAN.baz")');
			assert.equal(1, dom.query('.fooBar').length, 'dom.query(".fooBar")');
		});
		test.test('attribute selectors', function () {
			assert.equal(3, dom.query('[foo]').length, 'dom.query("[foo]")');
			assert.equal(1, dom.query('[foo$="thud"]').length, 'dom.query(\'[foo$="thud"]\')');
			assert.equal(1, dom.query('[foo$=thud]').length, 'dom.query(\'[foo$=thud]\')');
			assert.equal(1, dom.query('[foo$="thudish"]').length, 'dom.query(\'[foo$="thudish"]\')');
			assert.equal(1, dom.query('#t [foo$=thud]').length, 'dom.query("#t [foo$=thud]")');
			assert.equal(1, dom.query('#t [title$=thud]').length);
			assert.equal(0, dom.query('#t span[title$=thud ]').length);
			assert.equal(1, dom.query('[id$=\'55555\']').length);
			assert.equal(2, dom.query('[foo~="bar"]').length);
			assert.equal(2, dom.query('[ foo ~= "bar" ]').length);
			assert.equal(2, dom.query('[foo|="bar"]').length);
			assert.equal(1, dom.query('[foo|="bar-baz"]').length);
			assert.equal(0, dom.query('[foo|="baz"]').length);
		});
		test.test('descendent selectors', function () {
			var container = dom.get('container');
			assert.equal(3, dom.query(container, '> *').length, 'dom.query(container, "> *")');
			assert.equal(2, dom.query(container, '> [qux]').length, 'dom.query(container, "> [qux]")');
			assert.equal('child1', dom.query(container, '> [qux]')[0].id, 'dom.query(container, "> [qux]")[0]');
			assert.equal('child3', dom.query(container, '> [qux]')[1].id, 'dom.query(container, "> [qux]")[1]');
			assert.equal(3, dom.query(container, '> *').length, 'dom.query(container, "> *")');
			assert.equal(3, dom.query(container, '>*').length, 'dom.query(container, ">*")');
			assert.equal('passed', dom.query('#bug')[0].value, 'dom.query("#bug")[0].value');
		});
		test.test('complex node structures', function () {
			// These were regression tests for Dojo ticket #9071
			var t4 = dom.get('t4');
			assert.equal(2, dom.query(t4, 'a').length);
			assert.equal(2, dom.query(t4, 'p a').length);
			assert.equal(2, dom.query(t4, 'div p').length);
			assert.equal(2, dom.query(t4, 'div p a').length);
			assert.equal(2, dom.query(t4, '.subA').length);
			assert.equal(2, dom.query(t4, '.subP .subA').length);
			assert.equal(2, dom.query(t4, '.subDiv .subP').length);
			assert.equal(2, dom.query(t4, '.subDiv .subP .subA').length);
		});
		test.test('failed scope arg', function () {
			var thinger = dom.get('thinger');
			assert.equal(0, dom.query(thinger, '*').length, 'dom.query(thinger, "*")');
			assert.equal(0, dom.query('div#foo').length, 'dom.query("div#foo")');
		});
		test.test('selector engine regressions', function () {
			// These were additional regression tests for Dojo 1.X
			var attrSpecialChars = dom.get('attrSpecialChars');
			assert.equal(1, dom.query(attrSpecialChars, 'option[value="a+b"]').length);
			assert.equal(1, dom.query(attrSpecialChars, 'option[value="a~b"]').length);
			assert.equal(1, dom.query(attrSpecialChars, 'option[value="a^b"]').length);
			assert.equal(1, dom.query(attrSpecialChars, 'option[value="a,b"]').length);
			assert.equal(1, dom.query(attrSpecialChars, 'a[href*=\'foo=bar\']', 'attrSpecialChars').length);
			assert.equal(1, dom.query(attrSpecialChars, 'input[name="data[foo][bar]"]').length);
			assert.equal(1, dom.query(attrSpecialChars, 'input[name="foo[0].bar"]').length);
			assert.equal(1, dom.query(attrSpecialChars, 'input[name="test[0]"]').length);
			// escaping special characters with backslashes (http://www.w3.org/TR/CSS21/syndata.html#characters)
			// selector with substring that contains brackets (bug 9193, 11189, 13084)
			assert.equal(1, dom.query(attrSpecialChars, 'input[name=data\\[foo\\]\\[bar\\]]').length);
			assert.equal(1, dom.query(attrSpecialChars, 'input[name=foo\\[0\\]\\.bar]').length);
		});
		if (has('host-browser')) {
			test.test('cross document query', function () {
				var t3 = window.frames.t3,
					t3Doc = getIframeDoc(t3);
				t3Doc.open();
				t3Doc.write('<html><head>' +
					'<title>inner document</title>' +
					'</head>' +
					'<body>' +
					'<div id="st1"><h3>h3 <span>span <span> inner <span>inner-inner</span></span></span> endh3 </h3></div>' +
					'</body>' +
					'</html>');
				var t3Dom = dom(t3Doc);
				var st1 = t3Dom.get('st1');
				assert.equal(1, t3Dom.query('h3').length);
				assert.equal(1, t3Dom.query(st1, 'h3').length);
				// use a long query to force a test of the XPath system on FF.
				assert.equal(1, t3Dom.query(st1, 'h3 > span > span > span').length);
				assert.equal(1, t3Dom.query(t3Doc.body.firstChild, 'h3 > span > span > span').length);
			});
		}
		test.test('silly IDs', function () {
			assert(dom.get('silly:id::with:colons'), 'dom.get("silly:id::with:colons")');
			assert.equal(1, dom.query('#silly\\:id\\:\\:with\\:colons').length, 'query("#silly\\:id\\:\\:with\\:colons")');
			assert.equal(1, dom.query('#silly\\~id').length, 'query("#silly\\~id")');
		});
		// TODO XML tests
		test.test('css 2.1', function () {
			// first-child
			assert.equal(1, dom.query('h1:first-child').length);
			assert.equal(2, dom.query('h3:first-child').length);

			// + sibling selector
			assert.equal(1, dom.query('.foo+ span').length);
			assert.equal(1, dom.query('.foo+span').length);
			assert.equal(1, dom.query('.foo +span').length);
			assert.equal(1, dom.query('.foo + span').length);
		});
		test.test('css 3', function () {
			// sub-selector parsing
			assert.equal(1, dom.query('#t span.foo:not(:first-child)').length);

			// ~ sibling selector
			assert.equal(4, dom.query('.foo~ span').length);
			assert.equal(4, dom.query('.foo~span').length);
			assert.equal(4, dom.query('.foo ~span').length);
			assert.equal(4, dom.query('.foo ~ span').length);
			assert.equal(1, dom.query('#foo~ *').length);
			assert.equal(1, dom.query('#foo ~*').length);
			assert.equal(1, dom.query('#foo ~*').length);
			assert.equal(1, dom.query('#foo ~ *').length);

			// nth-child tests
			assert.equal(2, dom.query('#t > h3:nth-child(odd)').length);
			assert.equal(3, dom.query('#t h3:nth-child(odd)').length);
			assert.equal(3, dom.query('#t h3:nth-child(2n+1)').length);
			assert.equal(1, dom.query('#t h3:nth-child(even)').length);
			assert.equal(1, dom.query('#t h3:nth-child(2n)').length);
			assert.equal(1, dom.query('#t h3:nth-child(2n+3)').length);
			assert.equal(2, dom.query('#t h3:nth-child(1)').length);
			assert.equal(1, dom.query('#t > h3:nth-child(1)').length);
			assert.equal(3, dom.query('#t :nth-child(3)').length);
			assert.equal(0, dom.query('#t > div:nth-child(1)').length);
			assert.equal(7, dom.query('#t span').length);
			assert.equal(3, dom.query('#t > *:nth-child(n+10)').length);
			assert.equal(1, dom.query('#t > *:nth-child(n+12)').length);
			assert.equal(10, dom.query('#t > *:nth-child(-n+10)').length);
			assert.equal(5, dom.query('#t > *:nth-child(-2n+10)').length);
			assert.equal(6, dom.query('#t > *:nth-child(2n+2)').length);
			assert.equal(5, dom.query('#t > *:nth-child(2n+4)').length);
			assert.equal(5, dom.query('#t > *:nth-child(2n+4)').length);
			assert.equal(5, dom.query('#t> *:nth-child(2n+4)').length);
			assert.equal(12, dom.query('#t > *:nth-child(n-5)').length);
			assert.equal(12, dom.query('#t >*:nth-child(n-5)').length);
			assert.equal(6, dom.query('#t > *:nth-child(2n-5)').length);
			assert.equal(6, dom.query('#t>*:nth-child(2n-5)').length);
			assert.strictEqual(dom.get('_foo'), dom.query('.foo:nth-child(2)')[0]);
			// currently don't have the same head structure as the original Dojo 1.x tests...
			// assert.strictEqual(dom.query('style')[0], dom.query(':nth-child(2)')[0]);

			// :checked pseudo-selector
			assert.equal(2, dom.query('#t2 > :checked').length);
			assert.strictEqual(dom.get('checkbox2'), dom.query('#t2 > input[type=checkbox]:checked')[0]);
			assert.strictEqual(dom.get('radio2'), dom.query('#t2 > input[type=radio]:checked')[0]);
			// This :checked selector is only defined for elements that have the checked property, option elements are
			// not specified by the spec (http://www.w3.org/TR/css3-selectors/#checked) and not universally supported 
			//assert.equal(2, dom.query('#t2select option:checked').length);

			assert.equal(1, dom.query('#radio1:disabled').length);
			assert.equal(0, dom.query('#radio1:enabled').length);
			assert.equal(0, dom.query('#radio2:disabled').length);
			assert.equal(1, dom.query('#radio2:enabled').length);

			// :empty pseudo-selector
			assert.equal(4, dom.query('#t > span:empty').length);
			assert.equal(6, dom.query('#t span:empty').length);
			assert.equal(0, dom.query('h3 span:empty').length);
			assert.equal(1, dom.query('h3 :not(:empty)').length);
		});
	});

});