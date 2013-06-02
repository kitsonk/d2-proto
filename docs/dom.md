# dom

**dom** is a module that provides a concise DOM manipulation API.  It attempts to align addition and modification API
with the querying API, where most functions are CSS selector based.

## Usage

Using `dom` just requires that you to require the module:

```js
require([ 'd2-proto/dom' ], function (dom) {
	// Log a DOM node with the ID of `someId` to the console
	console.log(dom.get('someId'));

	// Add a <div> with and innerHTML of `test`
	dom.query('div').add('div[content=test]');
});
```

## API

### .get()

`.get()` provides a convenience function to retrieve a node by the Node's ID.  Given the following HTML:

```html
<div id="test">Hello World</div>
```

The following would work:

```js
require([ 'd2-proto/dom', 'dojo/domReady!' ], function (dom) {
	var text = dom.get('test').innerHTML;
	console.log(text);
	// Outputs: 'Hello World'
});
```

### .add()

`.add()` provides a mechanism to create DOM via CSS selectors.

### .modify()

`.modify()` provides a mechanism to modify the DOM via CSS selectors.

### .remove()

`.remove()` provides a mechanism for removing DOM nodes.

### .query()

`.query()` provides an interface to the DOM's `querySelectorAll` but with a couple of added features.  First, it
returns a JavaScript array that is then decorated with some syntactic sugar.  Second, it also "fast paths" queries that
could be better handled by other DOM functions.  Lastly, it handles rooted queries in a way that provide intuitive
results, instead of the unexpected results that can come from `querySelectorAll`.

It is expected that the module is running in an environment that provides sufficient support CSS selectors that it does
not provide a mechanism to replace the selector engine.

Using `.query()`, you simply provide it with a set of selectors and in return you get an array returned to you,
with additional decoration that can allow some advanced chaining:

```js
require([ 'd2-proto/dom', 'dojo/domReady!' ], function (dom) {
	// Log every <div> to the console
	dom.query('div').forEach(function (node) {
		console.log(node);
	});

	// Log every sibling of any node with calls of `foo` to the console
	dom.query('.foo~span').forEach(function (node) {
		console.log(node);
	});
});
```

As noted above, `.query()` uses the native CSS selector of the browser, therefore any selectors supported by the
environment the module is running in can be utilised to select nodes.

As mentioned, the results are a native JavaScript Array, meaning that in most environments you will get the following
functions available with the results: `.pop()`, `.push()`, `.reverse()`, `.shift()`, `.sort()`, `.splice()`,
`.unshift()`, `.concat()`, `.join()`, `.slice()`, `.toString()`, `.indexOf()`, `.lastIndexOf()`, `.forEach()`,
`.every()`, `.some()`, `.filter()`, `.map()`, `.reduce()` and `reduceRight()`.  In addition, there are several function
that are added to the return value, which are documented below.

#### .query().on()

Iterates over the results, providing a mechanism to attach event handlers via [d2-proto/on](./on.md).  It is
syntactically the same as:

```js
require([ 'd2-proto/dom', 'd2-proto/on' ], function (dom, on) {
	var nodes = dom.query('div');
	var handles = nodes.map(function (node) {
		return on(node, 'event', function () {
			// handler
		});
	});
});
```

Except the array of handles that is returned is decorated with a convenience function of `.remove()` which will remove
all the handles in the array.

If for example you wanted to log a message when every node that had class `.foo` was clicked, you would do the
following:

```js
require([ 'd2-proto/dom', 'dojo/domReady!' ], function (dom) {
	dom.query('.foo').on('click', function (evt) {
		console.log('I was clicked.', evt);
	});
});
```

#### .query().add()

Iterates through the results of the `.query()`, applying the arguments passed to each item and returning those results.
See `.add()` above for further information.

#### .query().modify()

Iterates through the results of the `.query()`, applying the arguments passed to each item and returning those results.
See `.modify()` above for further information.

#### .query().remove()

Iterates through the results of the `.query()` and removes them from the DOM.  See `.remove()` above for further
information.

## Modifying the "Node List"

When a list of nodes is returned from `.query()` and other chained functions, the return results are decorated with
additional syntactic sugar to enable chaining.  This sugar can be extended and modified by accessing the
`dom.nodeListDescriptors`.

The one exception to this is the `.doc` property, which points to the document object that this instance of the module
that the list applies for.  This is used to determine which document which document actions are performed against and
is copied over from the originator of the chain.

## Pseudo DOM

When loading the `dom` module, it will load the `doc` module which, when running on a non-browser platform, supplies
a pseudo document to be utilised by the module.  For more information see the [doc][./doc.md] documentation.

## Multiple Documents

The module is capable of providing the ability to handle multiple documents.  By default, the `dom` module will
operate on the main `document`.  In order to create an instance of `dom` that can operate on another document, you
simply pass it as an argument to the function.  For example, if you wanted to operate on a document of an `iframe` with
an ID of `foo` you would want to do something like this:

```js
require([ 'd2-proto/dom' ], function (dom) {
	var fooDocument = dom.get('foo').contentWindow.document,
		fooDom = dom(fooDocument),
		fooNodes = fooDom.query('*');
});
```
