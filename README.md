# d2-proto

This is a prototype of some modules that might be considered for Dojo 2.0.  This is a working repository of highly
*experimental* code.  It is not intended for production use, nor does it indicate or imply any final APIs or direction
of Dojo 2.0.  Things will change and move around!  *Use at your own risk.*

## Modules

The following modules are of interest in this repository:

* [d2-proto/parser](parser.js) - A "modern" version of the ``dojo/parser``.  It is intended to only
  support ES5 compliant user agents.  A demonstration test can be found [here](d2-proto/blob/master/test/parser.html).
* [d2-proto/lang](lang.js) - Some enhancements changes to the ``dojo/_base/lang`` that are designed
  to behave better in an ES5 world.
* [d2-proto/properties](properties.js) - Functions to make it easier to work with ES5 properties.
* [d2-proto/compose](compose.js) - An Object compositing and prototyping utility based on
  [ComposeJS][compose], a potential alternative to `dojo/_base/declare`.
* [d2-proto/Observable](Observable.js) - A class that provides "Harmony-like" `Object.observe`
  functionality that is specifically designed to be offloaded to the native functionality that is planned for ES6.
* [d2-proto/debug](debug.js) - A "stub" of what might be required in a Dojo 2.0 debug API.

## Requirements

``d2-proto`` currently depends upon:

* [dojo][dojo] 1.8+
* [dojo2-teststack][teststack] - for unit testing
* [chai](http://chaijs.com) - for unit testing assertion

Also, until `teststack` is feature complete, there are some additional tests based off of D.O.H. in the `tests` folder,
with the experimental `teststack` tests in `test`.

Some of the tests require the following:

* [dijit](/dojo/dijit) 1.8+
* [dojox](/dojo/dojox) 1.8+

## Documentation

Experimental documentation is available [here](docs/index.md).

## License

This is licensed under the ["New" BSD License](LICENSE).

## Contributing

Contributions are welcome in the form of pull requests, but must be covered under the Dojo Foundation CLA.  See
[CONTRIBUTING.md](CONTRIBUTING.md) for further information.

[compose]: /kriszyp/compose
[dojo]: /dojo/dojo
[teststack]: /csnover/dojo2-teststack
