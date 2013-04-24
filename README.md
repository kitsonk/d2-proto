# d2-proto

This is a prototype of some modules that might be considered for Dojo 2.0.  This is a working repository of highly
*experimental* code.  It is not intended for production use, nor does it indicate or imply any final APIs or direction
of Dojo 2.0.  Things will change and move around!  *Use at your own risk.*

## Modules

The following modules are of interest in this repository:

* [d2-proto/parser](parser.js) - A "modern" version of the ``dojo/parser``.  It is intended to only support ES5
  compliant user agents.  A demonstration test can be found [here](test/parser.html).
* [d2-proto/lang](lang.js) - Some enhancements changes to the ``dojo/_base/lang`` that are designed to behave better in
  an ES5 world.  It currently only contains the functions that I have needed to support the other modules in this
  repository.
* [d2-proto/properties](properties.js) - Functions to make it easier to work with ES5 properties.
* [d2-proto/compose](compose.js) - An Object compositing and prototyping utility based on
  [ComposeJS][compose], a potential alternative to `dojo/_base/declare`.  It is ES5 property descriptor safe plus it add
  the ability to define ES5 properties via the `compose.property()` function.
* [d2-proto/Observable](Observable.js) - A class that provides "Harmony-like" `Object.observe` functionality that is
  specifically designed to be offloaded to the native functionality that is planned for ES6.  It should be possible to
  delegate most of the functionality to ES6 in the future.
* [d2-proto/dom](dom.js) - A DOM management library the includes [put-selector][put] from Kris Zyp plus some
  enhancements.  Also includes the minimal parts of the dojo/selector/lite to get qSA "working" on 
* [d2-proto/doc](doc.js) - A module that either returns the browser's document or a pseudo-DOM in which the `dom` module
  can operate against for server side DOM generation and manipulation.
* [d2-proto/debug](debug.js) - A "stub" of what might be required in a Dojo 2.0 debug API.
* [d2-proto/widget/Widget](widget/Widget.js) - A "dijit-style" base widget based on compose and put.
* [d2-proto/base](base.js) - A module the requires other modules that provides a "base" similar to the "old" Dojo.

The [put](put.js) module is basically a re-factoring of [put-selector][put] and passes Kris' original unit tests, but
does not contain some of the feature enhancements that are currently in `dom.put()`.

I have brought in a few other modules from Dojo and refactored them, but this was to get around limitations of using
those modules from Dojo and there haven't been any significant functional enhancements.

## Requirements

``d2-proto`` currently depends upon:

* [dojo][dojo] 1.8+
* [dojo2-teststack][teststack] - for unit testing (although it currently needs my branch for performance benchmark
  tests).

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
[put]: https://github.com/kriszyp/put-selector