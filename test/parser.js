define([
	'require',
	'teststack!tdd',
	'teststack/chai!assert',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/dom',
	'dojo/Evented',
	'dojo/Stateful',
	'../parser',
	'../put',
	'./resources/AMDClass1',
	'./resources/AMDClass2',
	'dojo/domReady!'
], function (require, test, assert, declare, lang, dom, Evented, Stateful, parser, put) {

	// Because there are many variables created in the global scope that are not present for the tests, turning off
	// the undefined warning for jshint:
	/*jshint undef: false*/

	// Create test DOM
	function createDom(body) {
		put(body, 'h1', { innerHTML: 'Parser Unit Test' });
		put(body, 'script[type=text/javascript]', {
			innerHTML: 'function foo(){ this.fooCalled=true; }'
		});
		var basic = put(body, 'div#basic');
		var obj1 = put(basic, 'div#obj1[data-dojo-type=Class1][data-dojo-id=obj1][strProp1=text][strProp2=]' +
			'[intProp1=5][arrProp1=foo, bar, baz][arrProp2=][boolProp1=true][boolProp2=false][funcProp2=foo]' +
			'[funcProp3=this.func3Called=true;]');
		obj1.setAttribute('strProp2', '');
		obj1.setAttribute('arrProp2', '');
		put(obj1, 'script[type=dojo/method]', {
			innerHTML: 'this.deepProp = deepTestProp;'
		});
		put(obj1, 'script[type=dojo/before][data-dojo-method=method1][data-dojo-args=result]', {
			innerHTML: '\nif (result) {\n\treturn [ "before" ];\n}\n'
		});
		put(obj1, 'script[type=dojo/around][data-dojo-method=method2][data-dojo-args=origFn]', {
			innerHTML: '\nreturn function () {\n\tif (!this.method2ran) {\n\t\tthis.method2before = true;\n\t}' +
				'\n\torigFn.call(this);\n\tif (this.method2ran) {\n\t\tthis.method2after = true;\n\t}\n};\n'
		});
		put(obj1, 'script[type=dojo/after][data-dojo-method=method3]', {
			innerHTML: '\nif (this.method3ran) {\n\tthis.method3after = true;\n}\n'
		});
		put(basic, 'div#obj2[data-dojo-type=Class1][data-dojo-id=obj2]')
			.setAttribute('data-dojo-props', 'strProp1:"text", strProp2:"", intProp1:5, arrProp1:["foo", "bar", "baz"],' +
				'arrProp2:[], boolProp1:true, boolProp2:false, funcProp2:foo, funcProp3:"this.func3Called=true;"');
		var checkedObj = put(basic, 'input[data-dojo-type=InputClass][data-dojo-id=checkedObj][type=checkbox]');
		checkedObj.setAttribute('checked', '');
		var disabledObj = put(basic, 'button[data-dojo-type=InputClass][data-dojo-id=disabledObj]', {
			innerHTML: 'hi'
		});
		disabledObj.setAttribute('disabled', '');
		put(body, 'div #toParse[data-dojo-type=Class1][data-dojo-id=obj3]');
		var stateful = put(body, 'div#stateful [data-dojo-type=StatefulClass][data-dojo-id=stateful1]');
		put(stateful, 'script[type=dojo/watch][data-dojo-prop=strProp1][data-dojo-args=prop,oldValue,newValue]', {
			innerHTML: 'this.set("objProp1", { prop: prop, oldValue: oldValue, newValue: newValue });'
		});
		put(stateful, 'script[type=dojo/on][data-dojo-event=click][data-dojo-args=e]', {
			innerHTML: 'this.set("boolProp1", true);'
		});
		var amd = put(body, 'div#amd');
		put(amd, 'div[data-dojo-type=d2-proto/test/resources/AMDClass1][data-dojo-id=amd1]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		put(amd, 'div[data-dojo-type=./test/resources/AMDClass2][data-dojo-id=amd2]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		put(amd, 'div[data-dojo-type=d2-proto/test/resources/AMDClass3][data-dojo-id=amd3]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		put(amd, 'div[data-dojo-type=./test/resources/AMDClass4][data-dojo-id=amd4]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		var contextRequire = put(body, 'div#contextRequire');
		put(contextRequire, 'div[data-dojo-type=./resources/AMDClass1][data-dojo-id=context1]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		put(contextRequire, 'div[data-dojo-type=./resources/AMDClass5][data-dojo-id=context2]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		var declarativeRequire = put(body, 'div#declarativeRequire');
		put(declarativeRequire, 'script[type=dojo/require]', {
			innerHTML: '\nAMDClass1: "d2-proto/test/resources/AMDClass1",\nAMDClass2: "./test/resources/AMDClass2",\n'
				+ '"classes.AMDClass3": "d2-proto/test/resources/AMDClass3"\n'
		});
		put(declarativeRequire, 'div[data-dojo-type=AMDClass1][data-dojo-id=declarative1]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		put(declarativeRequire, 'div[data-dojo-type=AMDClass2][data-dojo-id=declarative2]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		put(declarativeRequire, 'div[data-dojo-type=classes.AMDClass3][data-dojo-id=declarative3]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
	}

	createDom(document.body);

	var MyNonDojoClass = function () {};
	MyNonDojoClass.extend = function () {
		var args = arguments;
		return function () {
			this.expectedClass = true;
			this.params = args;
		};
	};

	// Necessary to declare in the global scope, because the parser evaluates everything in the global scope
	lang.setObject('Class1', declare(null, {
		constructor: function (args/*, node*/) {
			this.params = args;
			lang.mixin(this, args);
		},
		preambleTestProp: 1,
		preamble: function () {
			this.preambleTestProp++;
		},
		intProp1: 1,
		callCount1: 0, // for connect testing
		callInc: function () { this.callCount1++; },
		callCount2: 0, // for assignment testing
		strProp1: 'original1',
		strProp2: 'original2',
		arrProp1: [],
		arrProp2: ['foo'],
		boolProp1: false,
		boolProp2: true,
		boolProp3: false,
		boolProp4: true,
		funcProp1: function () {},
		funcProp2: function () {},
		funcProp3: function () {},
		method1: function (value) {
			this.method1ran = value;
		},
		method2: function () {
			this.method2ran = true;
		},
		method3: function () {
			this.method3ran = true;
		},
		onclick: function () { this.prototypeOnclick = true; }
	}));

	lang.setObject('InputClass', declare(null, {
		constructor: function (args/*, node*/) {
			this.params = args;
			lang.mixin(this, args);
		},

		// these attributes are special in HTML and may not specify a value
		disabled: false,
		readonly: false,
		checked: false,

		// other attributes native to HTML
		value: 'default value',
		title: 'default title',
		tabIndex: '0', // special because mixed case

		// custom widget attributes
		custom1: 123,
		custom2: 456
	}));

	lang.setObject('StatefulClass', declare([Evented, Stateful], {
		strProp1: '',
		objProp1: {},
		boolProp1: false,
		prototypeOnclick: false,
		onclick: function () {
			this.prototypeOnclick = true;
		}
	}));

	lang.setObject('deepTestProp', {
		blah: {
			thinger: 1
		}
	});

	test.suite('parser basic tests', function () {
		test.test('parse()', function () {
			return parser.parse(dom.byId('basic'));
		});
		test.test('data-dojo-id', function () {
			assert.equal('object', typeof obj1);
		});
		test.test('data-dojo-type', function () {
			assert.isTrue(obj1 instanceof Class1);
		});
		test.test('string property', function () {
			assert.equal('string', typeof obj1.strProp1);
			assert.equal('text', obj1.strProp1, 'obj1.strProp1');
			assert.equal('string', typeof obj1.strProp2);
			assert.equal('', obj1.strProp2);
		});
		test.test('integer property', function () {
			assert.equal('number', typeof obj1.intProp1);
			assert.strictEqual(5, obj1.intProp1);
		});
		test.test('array property', function () {
			assert.equal(3, obj1.arrProp1.length);
			assert.deepEqual(['foo', 'bar', 'baz'], obj1.arrProp1);

			assert.deepEqual([], obj1.arrProp2);
		});
		test.test('boolean property', function () {
			assert.equal('boolean', typeof obj1.boolProp1);
			assert.isTrue(obj1.boolProp1);
			assert.equal('boolean', typeof obj1.boolProp2);
			assert.isFalse(obj1.boolProp2);
			assert.equal('boolean', typeof obj1.boolProp3);
			assert.isFalse(obj1.boolProp3);
			assert.equal('boolean', typeof obj1.boolProp4);
			assert.isTrue(obj1.boolProp4);
		});
		test.test('unwanted parameters', function () {
			for (var param in obj1.params) {
				assert(~['strProp1', 'strProp2', 'intProp1', 'arrProp1', 'arrProp2', 'boolProp1', 'boolProp2',
					'dateProp1', 'dateProp2', 'dateProp3', 'funcProp2', 'funcProp3', 'preamble', 'callInc1',
					'callInc2'].indexOf(param));
			}
		});
		test.test('data-dojo-props', function () {
			assert.equal('object', typeof obj2);
			assert.equal('string', typeof obj2.strProp1);
			assert.equal('text', obj2.strProp1, 'obj2.strProp1');
			assert.equal('string', typeof obj2.strProp2);
			assert.strictEqual('', obj2.strProp2, 'obj2.strProp2');
			assert.equal('number', typeof obj2.intProp1);
			assert.strictEqual(5, obj2.intProp1);
			assert(obj2.arrProp1 instanceof Array);
			assert.deepEqual(['foo', 'bar', 'baz'], obj2.arrProp1);
			assert(obj2.arrProp2 instanceof Array);
			assert.deepEqual([], obj2.arrProp2);
			assert.equal('boolean', typeof obj2.boolProp1, 'typeof obj2.boolProp1');
			assert.isTrue(obj2.boolProp1, 'obj2.boolProp1');
			assert.equal('boolean', typeof obj2.boolProp2, 'typeof obj2.boolProp2');
			assert.isFalse(obj2.boolProp2, 'obj2.boolProp2');
			assert.equal('boolean', typeof obj2.boolProp3, 'typeof obj2.boolProp3');
			assert.isFalse(obj2.boolProp3, 'obj2.boolProp3');
			assert.equal('boolean', typeof obj2.boolProp4, 'typeof obj2.boolProp4');
			assert.isTrue(obj2.boolProp4, 'obj2.boolProp4');
		});
		test.test('disabled flag', function () {
			assert.equal('boolean', typeof disabledObj.disabled);
			assert.isTrue(disabledObj.disabled, 'disabledObj.disabled');
			assert.isFalse(disabledObj.checked, 'disabledObj.checked');
		});
		test.test('checked flag', function () {
			assert.equal('boolean', typeof checkedObj.checked);
			assert.isFalse(checkedObj.disabled, 'checkedObj.disabled');
			assert.isTrue(checkedObj.checked, 'checkedObj.checked');
		});
		test.test('function property', function () {
			obj1.onclick();
			assert(obj1.prototypeOnclick, 'obj1.prototypeOnclick');

			obj1.funcProp2();
			assert(obj1.fooCalled, 'obj1.fooCalled');

			obj1.funcProp3();
			assert(obj1.func3Called, 'obj1.func3Called');
		});
		test.test('dojo/method', function () {
			assert.strictEqual(deepTestProp, obj1.deepProp);
		});
		test.test('dojo/before', function () {
			assert.equal(undefined, obj1.method1ran, 'obj1.method1ran before');
			obj1.method1('test');
			assert.equal('before', obj1.method1ran, 'obj1.method1ran after');
		});
		test.test('dojo/around', function () {
			assert.equal(undefined, obj1.method2ran, 'obj1.method2ran before');
			obj1.method2();
			assert(obj1.method2ran, 'obj1.method2ran after');
			assert(obj1.method2before, 'obj1.method2before');
			assert(obj1.method2after, 'obj1.method2after');
		});
		test.test('dojo/after', function () {
			assert.equal(undefined, obj1.method3ran, 'obj1.method3ran before');
			obj1.method3();
			assert(obj1.method3ran, 'obj1.method3ran after');
			assert(obj1.method3after, 'obj1.method3after');
		});
		test.test('parse sub-node', function () {
			assert.isFalse(lang.exists('obj3'), 'obj3 does not exist');
			return parser.parse(dom.byId('toParse').parentNode).then(function () {
				assert(obj3);
				assert(obj3 instanceof Class1);
			});
		});
	});

	test.suite('parser stateful tests', function () {
		test.test('parse()', function () {
			return parser.parse('stateful');
		});
		test.test('dojo/watch', function () {
			assert(stateful1, 'stateful1');
			stateful1.set('strProp1', 'newValue1');
			assert.equal('newValue1', stateful1.objProp1.newValue);
		});
		test.test('dojo/on', function () {
			stateful1.emit('click');
			assert(stateful1.prototypeOnclick);
			assert(stateful1.boolProp1);
		});
	});

	test.suite('AMD MID parsing', function () {
		test.test('parse()', function () {
			return parser.parse('amd');
		});
		test.test('absolute MID', function () {
			assert(amd1);
			assert.equal('text', amd1.strProp1);
		});
		test.test('relative MID', function () {
			assert(amd2);
			assert.equal('text', amd2.strProp1);
		});
		test.test('auto-require absolute MID', function () {
			assert(amd3);
			assert.equal('text', amd3.strProp1);
		});
		test.test('auto-require relative MID', function () {
			assert(amd4);
			assert.equal('text', amd4.strProp1);
		});
	});

	test.suite('context require', function () {
		test.test('parse()', function () {
			return parser.parse('contextRequire', {
				contextRequire: require
			});
		});
		test.test('relative MID', function () {
			assert(context1);
			assert.equal('text', context1.strProp1);
		});
		test.test('auto-require relative MID', function () {
			assert(context2);
			assert.equal('text', context2.strProp1);
		});
	});

	test.suite('declarative require', function () {
		test.test('parse()', function () {
			return parser.parse('declarativeRequire');
		});
		test.test('require absolute MID', function () {
			assert(declarative1);
			assert.equal('text', declarative1.strProp1);
		});
		test.test('require relative MID', function () {
			assert(declarative2);
			assert.equal('text', declarative2.strProp1);
		});
		test.test('set "deep" object', function () {
			assert(declarative3);
			assert.equal('text', declarative3.strProp1);
		});
	});
});