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
	'./resources/AMDMixin',
	'dojo/domReady!'
], function (require, test, assert, declare, lang, dom, Evented, Stateful, parser, put) {

	// Create test DOM
	function createDom(body) {
		put(body, 'h1', { innerHTML: 'Parser Unit Test' });

		// Script function used in tests
		put(body, 'script[type=text/javascript]', {
			innerHTML: 'function foo(){ this.fooCalled=true; }'
		});

		// DOM Structure for Basic tests
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
		put(basic, 'input[data-dojo-type=InputClass][data-dojo-id=mixedObj][title=native title][value=mixedValue]')
			.setAttribute('data-dojo-props', 'custom1: 999, title: "custom title"');
		var container1 = put(basic, 'div div#container1[data-dojo-type=NormalContainer][data-dojo-id=container1]');
		put(container1, 'div[data-dojo-type=Class1][data-dojo-id=contained1]');
		put(container1, 'div div[data-dojo-type=Class1][data-dojo-id=contained2]');
		var container2 = put(basic, 'div div#container2[data-dojo-type=ShieldedContainer][data-dojo-id=container2]');
		put(container2, 'div[data-dojo-type=Class1][data-dojo-id=contained3]');
		put(container2, 'div div[data-dojo-type=Class1][data-dojo-id=contained4]');

		// Parsing a sub-node
		put(body, 'div #toParse[data-dojo-type=Class1][data-dojo-id=obj3]');

		// DOM for stateful declarative scripts
		var stateful = put(body, 'div#stateful [data-dojo-type=StatefulClass][data-dojo-id=stateful1]');
		put(stateful, 'script[type=dojo/watch][data-dojo-prop=strProp1][data-dojo-args=prop,oldValue,newValue]', {
			innerHTML: 'this.set("objProp1", { prop: prop, oldValue: oldValue, newValue: newValue });'
		});
		put(stateful, 'script[type=dojo/on][data-dojo-event=click][data-dojo-args=e]', {
			innerHTML: 'this.set("boolProp1", true);'
		});

		// DOM for adaptor classes
		var adaptor = put(body, 'div#adaptor');
		put(adaptor, 'div[data-dojo-type=AdaptorClass][data-dojo-id=adaptor1][bar=qat]')
			.setAttribute('data-dojo-props', 'foo:"bar"');

		// DOM for startup tests
		put(body, 'div#start div[data-dojo-type=StartupClass][data-dojo-id=startup1]');
		put(body, 'div#nostart div[data-dojo-type=StartupClass][data-dojo-id=startup2]');
		var container3 = put(body, 'div#template div[data-dojo-type=ShieldedContainer][data-dojo-id=container3]');
		put(container3, 'div[data-dojo-type=Class1][data-dojo-id=contained5]');
		put(container3, 'div div[data-dojo-type=Class1][data-dojo-id=contained6]');

		// DOM for parser mixin tests
		put(body, 'div div#mixin div[data-dojo-type=Class1][data-dojo-id=mixin1]')
			.setAttribute('data-dojo-props', 'strProp1: "foo"');

		// DOM for propThis
		put(body, 'div#propThis div[data-dojo-type=Class1][data-dojo-id=propthis1]')
			.setAttribute('data-dojo-props', 'strProp1: this.baz, strProp2: this.bar');

		// DOM for AMD MID tests
		var amd = put(body, 'div#amd');
		put(amd, 'div[data-dojo-type=d2-proto/test/resources/AMDClass1][data-dojo-id=amd1]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		put(amd, 'div[data-dojo-type=./test/resources/AMDClass2][data-dojo-id=amd2]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		put(amd, 'div[data-dojo-type=d2-proto/test/resources/AMDClass3][data-dojo-id=amd3]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		put(amd, 'div[data-dojo-type=./test/resources/AMDClass4][data-dojo-id=amd4]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');

		// DOM for contextual require tests
		var contextRequire = put(body, 'div#contextRequire');
		put(contextRequire, 'div[data-dojo-type=./resources/AMDClass1][data-dojo-id=context1]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');
		put(contextRequire, 'div[data-dojo-type=./resources/AMDClass5][data-dojo-id=context2]')
			.setAttribute('data-dojo-props', 'strProp1: "text"');

		// DOM for declarative require tests
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

		// DOM for data-dojo-mixins tests
		var declarativeMixins = put(body, 'div#declarativeMixins');
		put(declarativeMixins, 'div[data-dojo-type=Class1][data-dojo-id=resultMixin1][data-dojo-mixins=Mixin1,Mixin2,./test/resources/AMDMixin]');
		put(declarativeMixins, 'div[data-dojo-type=ClassForMixins][data-dojo-id=resultMixin2][data-dojo-mixins=Mixin1, Mixin2, ./test/resources/AMDMixin]');
		put(declarativeMixins, 'div[data-dojo-type=MyNonDojoClass][data-dojo-id=resultMixin3][data-dojo-mixins=Mixin1,Mixin2]');

		// DOM for data-type tests
		var dataType = put(body, 'div#dataType');
		put(dataType, 'div[data-type=Class1][data-id=type1]').setAttribute('data-props', 'strProp1: "other"');
		put(dataType, 'div[data-dojo-type=Class1][data-dojo-id=type2]');

		// DOM for custom selector
		var customSelector = put(body, 'div#customSelector');
		put(customSelector, 'div[data-type=Class1][data-id=type3]');
		put(customSelector, 'div[data-type=Class1][data-custom][data-id=type4]');

		// DOM for parser error handling tests
		put(body, 'div#throwerror1 div[data-dojo-type=NonExistentClass][data-dojo-id=noclass1]');
		put(body, 'div#throwerror2 div[data-dojo-type=some/bad/MID][data-dojo-id=noclass2]');
		put(body, 'div#throwerror3 div[data-dojo-type=ThrowErrorClass][data-dojo-id=noclass3]');
	}

	createDom(document.body);

	lang.setObject('MyNonDojoClass', function () {});

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

	lang.setObject('NormalContainer', declare(null, {
		constructor: function (args/*, node*/) {
			lang.mixin(this, args);
		}
	}));

	lang.setObject('ShieldedContainer', declare(null, {
		constructor: function (args/*, node*/) {
			lang.mixin(this, args);
		},
		stopParser: true
	}));

	lang.setObject('AdaptorClass', declare(null, {
		constructor: function () {
			this.fromAdaptor = false;
		},
		fromAdaptor: false,
		adaptor: function (args, node, Ctor) {
			var i = new Ctor();
			i.fromAdaptor = true;
			i.params = args;
			i.bar = node.getAttribute('bar');
			return i;
		}
	}));

	lang.setObject('StartupClass', declare(null, {
		constructor: function (args/*, node*/) {
			lang.mixin(this, args);
		},
		started: false,
		startup: function () {
			this.started = true;
		}
	}));

	lang.setObject('ClassForMixins', declare(null, {
		classDone: true
	}));

	lang.setObject('Mixin1', declare(null, {
		mixin1Done: true
	}));

	lang.setObject('Mixin2', declare(null, {
		mixin2Done: true
	}));

	lang.setObject('ThrowErrorClass', declare(null, {
		constructor: function (/*args, node*/) {
			throw new Error('Error on construction!');
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
		test.test('mixed assignment', function () {
			assert(mixedObj, 'mixedObj');
			assert.equal('mixedValue', mixedObj.value, 'mixedObj.value');
			assert.equal(999, mixedObj.custom1, 'mixedObj.custom1');
			assert.equal('custom title', mixedObj.title, 'mixedObj.title');
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
		test.test('containers', function () {
			assert(container1, 'container1');
			assert(container1 instanceof NormalContainer);
			assert(contained1, 'contained1');
			assert(contained1 instanceof Class1);
			assert(contained2, 'contained2');
			assert(contained2 instanceof Class1);
			assert(container2, 'container2');
			assert(container2 instanceof ShieldedContainer);
			assert.isFalse(lang.exists('contained3'), 'contained3');
			assert.isFalse(lang.exists('contained4'), 'contained4');
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

	test.suite('adaptor', function () {
		test.test('parse()', function () {
			return parser.parse('adaptor');
		});
		test.test('adaptor construction', function () {
			assert(adaptor1);
			assert(adaptor1 instanceof AdaptorClass);
			assert.isTrue(adaptor1.fromAdaptor);
			assert.equal('bar', adaptor1.params.foo);
			assert.equal('qat', adaptor1.bar);
		});
	});

	test.suite('startup', function () {
		test.test('parse()', function () {
			return parser.parse('start');
		});
		test.test('startup called', function () {
			assert(startup1);
			assert(startup1 instanceof StartupClass);
			assert.isTrue(startup1.started);
		});
		test.test('parse() with noStart', function () {
			return parser.parse('nostart', { noStart: true });
		});
		test.test('startup not called', function () {
			assert(startup2);
			assert(startup2 instanceof StartupClass);
			assert.isFalse(startup2.started);
		});
	});

	test.suite('template', function () {
		test.test('parse() with template: true', function () {
			return parser.parse('template', { template: true });
		});
		test.test('stopParser ignored', function () {
			assert(container3, 'container3');
			assert(container3 instanceof ShieldedContainer);
			assert(contained5, 'contained5');
			assert(contained5 instanceof Class1);
			assert(contained6, 'contained6');
			assert(contained6 instanceof Class1);
		});
	});

	test.suite('parse mixin', function () {
		test.test('parse() with mixin', function () {
			return parser.parse('mixin', {
				mixin: {
					strProp1: 'bar',
					strProp2: 'foo'
				}
			});
		});
		test.test('mixed in properties', function () {
			assert(mixin1, 'mixin1');
			assert(mixin1 instanceof Class1);
			assert.equal('bar', mixin1.strProp1, 'mixin1.strProp1');
			assert.equal('foo', mixin1.strProp2, 'mixin1.strProp2');
		});
	});

	test.suite('parse propsThis', function () {
		test.test('parse() with propsThis', function () {
			return parser.parse('propThis', {
				propsThis: {
					baz: 'bar',
					bar: 'baz'
				}
			});
		});
		test.test('propsThis used', function () {
			assert(propthis1, 'propthis1');
			console.log(propthis1.strProp1);
			assert.equal('bar', propthis1.strProp1, 'propthis1.strProp1');
			assert.equal('baz', propthis1.strProp2, 'propthis1.strProp2');
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

	test.suite('declarative mixins', function () {
		test.test('parse()', function () {
			return parser.parse('declarativeMixins');
		});
		test.test('mixins', function () {
			assert(resultMixin1, 'resultMixin1');
			assert.isTrue(resultMixin1.mixin1Done);
			assert.isTrue(resultMixin1.mixin2Done);
			assert.isTrue(resultMixin1.amdMixinDone);
			assert(resultMixin2, 'resultMixin2');
			assert.isTrue(resultMixin2.mixin1Done);
			assert.isTrue(resultMixin2.mixin2Done);
			assert.isTrue(resultMixin2.amdMixinDone);
			assert(resultMixin3, 'resultMixin3');
			assert.isTrue(resultMixin3.expectedClass, 'resultMixin3.expectedClass');
			assert.equal(2, resultMixin3.params.length);
			assert.strictEqual(Mixin1, resultMixin3.params[0]);
			assert.strictEqual(Mixin2, resultMixin3.params[1]);
		});
	});

	test.suite('errors', function () {
		test.test('parse() with missing constructor', function () {
			return parser.parse('throwerror1').then(function () {
				throw new Error('Should not resolve promise.');
			}, function (e) {
				assert(e instanceof Error, 'promise returns error');
				assert.equal('Cannot resolve constructor function for type(s): NonExistentClass', e.message);
			});
		});
		// Currently, require is not producing a catchable error, therefore cannot reject the promise
		// test.test('parse() with missing MID', function () {
		// 	return parser.parse('throwerror2').then(function () {
		// 		throw new Error('Should not resolve promise.');
		// 	}, function (e) {
		// 		assert(e instanceof Error, 'promise returns error');
		// 	});
		// });
		test.test('parse() with constructor throwing an error', function () {
			return parser.parse('throwerror3').then(function () {
				throw new Error('Should not resolve promise.');
			}, function (e) {
				assert(e instanceof Error, 'promise returns error');
				assert.equal('Error on construction!', e.message);
			});
		});
	});

	test.suite('custom attributes and selectors', function () {
		test.test('parse() with custom attributes', function () {
			return parser.parse('dataType', {
				typeAttribute: 'data-type',
				propsAttribute: 'data-props',
				jsIdAttribute: 'data-id'
			});
		});
		test.test('validate custom attributes', function () {
			assert(type1, 'type1');
			assert(type1 instanceof Class1);
			assert.equal('other', type1.strProp1, 'type1.strProp1');
			assert.isFalse(lang.exists('type2'), 'type2');
		});
		test.test('parse() with custom selector', function () {
			return parser.parse('customSelector', {
				typeSelector: '[data-type][data-custom]'
			});
		});
		test.test('validate custom selector', function () {
			assert.isFalse(lang.exists('type3'), 'type3');
			assert(type4);
			assert(type4 instanceof Class1);
		});
	});
});