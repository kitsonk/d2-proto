# d2-proto/Observable

A class/module that is designed to provide `Object.observe()` like functionality based on the [ES6 Harmony][harmony]
concepts.  It is designed to provide change records for changes to instances of objects that include the `Observable`
class within the constructor chain.

Currently `Observable` is created using the `d2-proto/compose` object compositor.

## Usage

Basic usage would look like this:

```js
require(['d2-proto/Observable', 'd2-proto/compose'], function (Observable, compose) {
	var Example = compose(Observable, {
		foo: 'bar'
	});
	var instance = new Example();

	function recordLogger(records) {
		console.log(JSON.stringify(records));
	}

	instance.observeProperty('foo', recordLogger);

	instance.foo = 'qat';

	Observable.deliverChangeRecords(recordLogger);
});
```

[harmony]: http://wiki.ecmascript.org/doku.php?id=harmony:observe#object.observe
