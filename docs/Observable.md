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

## Notes

* The current Harmony specification does not specify address accessor properties, while `Observable`

* The current Harmony specification is at the Object level, meaning any changes to the Object generate change records.
  Because of the overhead of a non-native code solution, the `Observable` implementation only provides change records
  for properties that are being specifically "observed", created or deleted via the implementation.

[harmony]: http://wiki.ecmascript.org/doku.php?id=harmony:observe#object.observe
