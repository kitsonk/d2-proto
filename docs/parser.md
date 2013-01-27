# d2-proto/parser

``d2-proto/parser`` is a module that scans the DOM for specially marked-up attributes and instantiates JavaScript
objects.

## Usage

Require in the module and parse the document for appropriately decorated widgets:

```js
require(['d2-proto/parser'], function (parser) {
	parser.parse();
});
```

To markup a DOM node to be instantiated as an object, provide the attribute ``data-dojo-type`` with the module ID (MID)
that should be used to instantiate it:

```xml
<div data-dojo-type="dijit/layout/ContentPane"></div>
```

The parser assumes that the constructor function for any object follows the signature of
``new Object(properties, node)`` where ``properties`` is a hash of configuration properties and ``node`` is the DOM node
that should serve as the "root" of any visual elements (e.g. widgets).

In order to pass properties to the constructor, they should be set in the ``data-dojo-props`` attribute, where the value
is a JavaScript object, without the enclosing curly brackets (``{ }``):

```xml
<div data-dojo-type="dijit/layout/ContentPane"
	data-dojo-props="title: 'Title'"></div>
```

The parser will also look for attributes that match the name of properties in the objects prototype.  This is intended
to match standard valid attributes.  Non-standard attributes should be avoided and instead added to the
``data-dojo-props`` attribute.

## Features

### Auto-Require

The parser will attempt to auto-load any modules

### Declarative Require

### Declarative Scripting

### Adapting the Constructor

If for whatever reason, the constructor function does not adhere to the above signature, or there needs to be other
functionality which needs to occur before construction, then you can provide an ``adaptor()`` function which will be
called with the signature of:

Argument   | Type      | Notes
-----------|-----------|-----------------------------------------------------------------------------------------------
properties | *Object*  | A hash of object properties that should be used for instance of the widget
node       | *DOMNode* | The DOM Node that should be the root of the document
ctor       | *Object*  | This will be the original constructor object that was resolved by the parser

## Examples

**TODO**
