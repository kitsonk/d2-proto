# d2-proto

This is a prototype of some modules that might be considered for Dojo 2.0.  This is a working repository of highly
*experimental* code.  It is not intended for production use, nor does it indicate or imply any final APIs or direction
of Dojo 2.0.  Things will change and move around!  *Use at your own risk.*

## Modules

The following modules are of interest in this repository:

* [d2-proto/parser](d2-proto/blob/master/parser.js) - A "modern" version of the ``dojo/parser``.  It is intended to only
  support ES5 compliant user agents.  A demonstration test can be found [here](d2-proto/blob/master/test/parser.html).
* [d2-proto/lang](d2-proto/blob/master/lang.js) - Some enhancements changes to the ``dojo/_base/lang`` that are designed
  to behave better in an ES5 world.
* [d2-proto/compose](d2-proto/blob/master/compose.js) - A Object compositing and prototyping utility based on
  [ComposeJS][compose], a potential alternative to `dojo/_base/declare`.
* [d2-proto/debug](d2-proto/blob/master/debug.js) - A "stub" of what might be required in a Dojo 2.0 debug API.

## Requirements

``d2-proto`` currently depends upon:

* [dojo](/dojo/dojo) 1.8+
* [dojo2-teststack](/csnover/dojo2-teststack) - for unit testing
* [chai][http://chaijs.com] - for unit testing assertion

Also, until `teststack` is feature complete, there are some additional tests based off of D.O.H. in the `tests` folder,
with the experimental `teststack` tests in `test`.

Some of the tests require the following:

* [dijit](/dojo/dijit) 1.8+
* [dojox](/dojo/dojox) 1.8+

## Documentation

Experimental documentation is available [here](d2-proto/blob/master/docs/index.md).

## License

This is licensed under the ["New" BSD License](d2-proto/blob/master/LICENSE).

## Contributing

Contributions are welcome in the form of pull requests, but must be covered under the Dojo Foundation CLA.  See
[CONTRIBUTING.md](d2-proto/blob/master/CONTRIBUTING.md) for further information.

[compose]: /kriszyp/compose