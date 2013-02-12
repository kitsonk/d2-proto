# d2-proto/compose

`compose` is a robust object/class composition module built on native JavaScript mechanisms.  It tries to embrace the
native concepts in JavaScript of prototype inheritance, closures, object literals.  It does not try to mangle concepts
in other languages to try to fit them into a JavaScript world.

This module is based directly on Kris Zyp's [ComposeJS][composejs] but it varies in in that it utilises property
definition introduced in EcmaScript 5.  This means it is not designed in user agents that do not fully support
`Object.defineProperty()`.

## Usage

Basic usage is to use `compose` to generate an object constructor:

```js
require(['d2-proto/compose'], function(compose){
	var Widget = compose({
		render: function (node) {
			node.innerHTML = 'hi';
		}
	});

	var widget = new Widget(),
		node = {};

	widget.render(node);
});
```

[composejs]: https://github.com/kriszyp/compose