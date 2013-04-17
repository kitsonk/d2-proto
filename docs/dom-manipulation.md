# DOM Manipulation

One of the items that I am proposing for Dojo 2 is that the main API for DOM manipulation is CSS selector based.  It is a matter of a fact that for "web" developers, CSS selectors are not optional.  If you are going to style a web page or query the DOM you *have* to know about CSS selectors.  What then happens is that many JavaScript libraries, including Dojo, then force you to remember another API in order to manipulate the DOM.  While CSS selectors can be obscure and obtuse at times, but they are also quite powerful and do get the job done of selecting DOM nodes.

Kris Zyp has developed [put-selector][put], which is a DOM manipulation library based on CSS selectors plus a few other features.  It is a bit of a swiss army knife and combines DOM creation, modification and deletion all in one function call.  While I *really* like put-selector, I do feel there are some areas for improvement:

* Ability to specify a selector that toggles a class.
* Attribute strings do not escape properly to support complex values.
* There is not "shortcut" for specifying the innerText of a node in a selector, which means that you always have to pass a configuration object.  Using the `[content=]` attribute selector could be used to specify this.
* Variable substitution is only supported in an ordered argument fashion versus a named argument fashion.
* If the selector creates multiple nodes, only the last node created can be modified with the object attributes.
* The removal API is limited and slightly confusing.  For example you cannot specify a selector that removes all the direct child nodes of a node.
* No support for pseudo-classes.  It would be useful to have support for `:first-child` and `:nth-child` as well as `:before` and `:after`.  In addition `:checked` and `:disabled` could be added.

In addition, put-selector has only focused on the manipulation of the DOM and leaves the querying and retrieval.  There are some parallels between the need to manipulate the DOM as well as perform other CRUD type functions.  Logical separation of the querying, addition and modification API could be very powerful.

## Examples

The following are some examples of the way that I see the API working.  I am going to dispense with required functionality of requiring in the AMD module and implying that for each example the module will be loaded as follows:

```js
require(['d2-proto/dom'], function (dom) {
  // dom contains the API
});
```

Also, I am yet undecided if the return values should be decorated with the DOM manipulation API or not.  I know a lot of developers are fans of chaining, but I am not, because it means, in a lot of cases, spraying syntactic sugar all over the place and modifying objects in ways that could potentially interfere with other libraries, but the more I work with the prototype, the more I think this might be needed.

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
var childNode1 = dom.put(someNode, 'div#childNode1.childClass');
// would do something like <div><div id="childNode1" class="childClass"></div></div>

// and
var childNode2 = dom.put(someNode, '#childNode2.childClass');
// would do something like <div><div id="childNode2" class="childClass"></div></div>

// and
var childNode3 = dom.put(someNode, '.childClass');
// would do something like <div><div class="childClass"></div></div>
```

### Removing Stuff

```js
// Removing using a selector
dom.remove('#someNode >');

// Removing using a node
dom.remove(node);

// Removing using a results of a query
var someNodes = dom.query('#someNode >');
dom.remove(someNodes);

// Potential chaining, maybe...
dom.query('#someNode >').remove();
// Of course, it could be expressed this way as well with only 3 extra characters
dom.remove(dom.query('#someNode >'));
```

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
| dojo/NodeList-dom        | *N/A*    |
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
// Adding a row to a table with styles

// In Dojo 1.X
var row = domConst.create('tr', {
	class: 'someRow'
});
domConst.create('td', {
	innerHTML: 'test',
	class: 'special'
}, row);
domConst.place(row, query('#aTable tbody')[0]);
// or
domConst.place('<tr class="someRow"><td class="special">test</td></tr>', query('#aTable tbody')[0]);
// or
query('#aTable tbody').place('<tr class="someRow"><td class="special">test</td></tr>');

// In jQuery
$('#aTable tbody')
  .append('<tr class="someRow"><td class="special">test</td></tr>');

// In Proposal
dom.put(dom.query('#aTable tbody'), 'td.someRow tr.special[content=test]');
// and if chaining were to be added
dom.query('#aTable tbody')
  .put('td.someRow tr.special[content=test]');
```

### Modifying Stuff

```js
//  Adding a class to nodes
query('p').addClass('myClass', 'yourClass');
// or
var nodes = query('p');
nodes.forEach(function (node) {
	domClass.add(node, 'myClass', 'yourClass');
});

// In jQuery
$('p')
  .addClass('myClass yourClass');

// In Proposal
dom.modify(dom.query('p'), '.myClass.yourClass');
// Or if chaining is added
dom.query('p')
  .modify('.myClass.yourClass');
```

[put]: https://github.com/kriszyp/put-selector