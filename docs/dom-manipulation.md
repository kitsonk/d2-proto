# DOM Manipulation

One of the items that I am proposing for Dojo 2 is that the main API for DOM manipulation is CSS selector based.  It is a matter of a fact that for "web" developers, CSS selectors are not optional.  If you are going to style a web page or query the DOM you *have* to know about CSS selectors.  What then happens is that many JavaScript libraries, including Dojo, then force you to remember another API in order to manipulate the DOM.  While CSS selectors can be obscure and obtuse at times, but they are also quite powerful and do get the job done of selecting DOM nodes.

Kris Zyp has developed [put-selector][put], which is a DOM manipulation library based on CSS selectors plus a few other features.  It is a bit of a swiss army knife and combines DOM creation, modification and deletion all in one function call.  While I *really* like put-selector, I do feel that you can end up in a situation where you can get confused if you are creating or manipulating the DOM as well as I feel the remval functionality is somewhat limited.

In addition, Dojo has introduced a very simple "CRUD" API for items like `dojo/store` that provide a few simple function calls: `get()`, `put()`, `add()`, `query()` and `remove()`.  This simple, straight forward API, I believe, could also serve as a foundation for a DOM manipulation API.

By combining the familiarity of CSS selectors with the simplicity of an effective CRUD based API, I believe there can be a step change in DOM manipulation in Dojo 2.0.

## Examples

The following are some examples of the way that I see the API working.  I am going to dispense with required functionality of requiring in the AMD module and implying that for each example the module will be loaded as follows:

```js
require(['d2-proto/dom'], function (dom) {
  // dom contains the API
});
```

Also, I am yet undecided if the return values should be decorated with the DOM manipulation API or not.  I know a lot of developers are fans of chaining, but I am not, because it means, in a lot of cases, spraying syntactic sugar all over the place and modifying objects in ways that could potentially interfere with other libraries.

### Getting Stuff

```js
// Get a single node from the DOM
var someNode = dom.get('someNode');

// Getting all the DIVs that are children of a node
var someNodes = dom.query('#someNode >');
```

### Adding Stuff

```js
// Using our previous someNode
var childNode1 = dom.add(someNode, 'div#childNode1.childClass');
// would do something like <div><div id="childNode1" class="childClass"></div></div>

// and
var childNode2 = dom.add(someNode, '#childNode2.childClass');
// would do something like <div><div id="childNode2" class="childClass"></div></div>

// and
var childNode3 = dom.add(someNode, '.childClass');
// would do something like <div><div class="childClass"></div></div>
```

This is a difference from put-selector in that `.add()` implies that you are going to be adding nodes no matter what.  This, in my opinion, is one of the confusing things with put selector is that you can think you are adding children nodes, but end up modifying them instead, or the reverse.

## Comparisons

I am going to compare this proposed API against the Dojo 1.x DOM manipulation APIs and jQuery.  Again, I will be dispensing with the AMD module loading for Dojo and will assume the the following modules are loaded as:

| MID                      | Variable |
|--------------------------|----------|
| dojo/dom                 | dom      |
| dojo/dom-attr            | domAttr  |
| dojo/dom-class           | domClass |
| dojo/dom-construct       | domConst |
| dojo/dom-prop            | domProp  |
| dojo/dom-style           | domStyle |
| dojo/query               | query    |
| dojo/NodeList-manipulate | *N/A*    |

Also, in the examples, I will be assuming when giving a Dojo 1.x example in the same block as this proposed API that they are actually separate scope, since they will share the same module variable of `dom`.

(You might already get a sense of why I feel the Dojo 1.X DOM API might need to be addressed, 7 modules to cover off what I am proposing is one module)

### Getting Stuff

Basically, there isn't anything interesting here...

```js
// Getting a Node by ID

// In Dojo 1.X
var someNode = dom.byId('someNode');
// or
var someNodeList = query('#someNode');

// In jQuery
$('#someID');

// In Proposal
var someNode = dom.get('someNode');
// or
var someNodeArray = dom.query('#someNode');
```

```js
// General querying

// In Dojo 1.X
var nodeList = query('.someClass');

// In jQuery
$('.someClass');

// In Proposal
var nodeArray = dom.query('.someClass');
```

### Adding Stuff

```js
// Adding a row to a table

// In Dojo 1.X
var row = domConst.create('tr');
domConst.create('td', {
	innerHTML: 'test'
}, row);
domConst.place(row, query('#aTable tbody')[0]);
// or
domConst.place('<tr><td>test</td></td>', query('#aTable tbody')[0]);
// or
query('#aTable tbody').place('<tr><td>test</td></td>');

// In jQuery
$('#aTable tbody')
  .append('<tr><td>test</td></td>');

// In Proposal
var tableBody = dom.query('#aTable tbody');
dom.add(tableBody, 'td tr', {
	innerHTML: 'test'
});
// and if chaining were to be added
dom.query('#aTable tbody').add('td tr', {
	innerHTML: 'test'
});
```

[put]: https://github.com/kriszyp/put-selector