define([
	"teststack!tdd",
	"teststack/lib/assert",
	"../parser"
], function(test, assert, parser){

	test.suite("parser", function(){
		test.test("basic tests", function(){
			assert.isEqual(typeof parser.parse, "function", "parse present");
		});
	});

});