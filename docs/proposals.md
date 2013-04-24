# Dojo 2 Proposals

This is a summary of the concepts and prototypes that I (Kitson Kelly) feel should be considered for Dojo 2.0.  While I
have garnered lots of feedback and inspiration from various sources.  The good ideas are from everyone and the bad ideas
solely my own.

A fair few of the modules that I have brought into my [repository][d2-proto] do not have any functional enhancements,
but are mainly there in order to get the code to stand on its own and for me to get a sense of what a built/minimised
version of the code would look like.

## Linting and Code Style

I have adopted Colin Snover's linting style.  In his [prototype][dojo2-core] he has laid out a well thought out coding
style and provides a `.jshintrc` which I have included in my repository.  While it differs from the Dojo 1.X standard
I have found it easier to read and more in line with current best practices.  JSHint also defaults to a cyclic
complexity of 11, of which I have tried to adhear to.  In some places I have raised the complexity when I felt that
the readability of the code outweighed the complexity "risk".  Not all the jshint inline hints are there to keep
warnings off yet.

## Packaging

I have tried to follow the guidelines that were laid out in the [dojo2-boilerplate-package][d2package].  While I might
not have followed it strictly, both are evolving.  As others have mentioned, packing is a secondary issue, although I
still feel we need a direction and general agreement so that there isn't a huge amount of re-factoring needed to get us
to the final state.

## Testing

I have also adopted Colin's [teststack][teststack] for testing and all the unit tests included in the repository are
based on teststack.  I have also added benchmarking/performance functionality to teststack and have submitted a
[pull request][benchmark] to the repo for inclusion.  My performance benchmark tests require this branch.

Dylan mentioned on the mailing list that this is being migrated over to "the Intern", I have yet to do the work to move
the unit tests over to that yet.

## User Agent Support

I am of the opinion that code the is specifically there to support unsupported user agents should be removed from the
modules.  In every module I have rewritten, I have tried to remove any logic that was specifically there for those
unsupported user agents.  In some cases, like with `on` where I didn't do a full rewrite, I may have left code in there,
especially if I wasn't 100% sure what it would break if removed, but I think going forward that any of this "cruft"
should be actively removed.  It leads to code maintainability issues and code bloat.

## Language Semantics

Dojo 2 should embrace ES5 and in particular property descriptors.  Dojo 1.X lacks any direct awareness of property
descriptors and the mixin type of functionality is not descriptor "safe" (and can cause issues when someone declares
an object with only a getter for example).  I have a [lang][lang] module in my repo which provides the parts of the
basic Dojo language semantics which I have had to pull in to support other modules.

## Parser

Dojo 2 should have a parser that allows a HTML based declarative syntax.  It is a tool that has brought a lot of people
to Dojo.  It is important though that this parser is efficient and ideally built in a way to work efficiently no matter
which user agent it is used on.  The [parser][parser] in the repo goes a long way to that goal.  With more effort and
consideration, it could be leveraged within the builder to fully optimise for its target platform at the sacrifice of
feature removal.

## Object Composition

I have long stated that I believe that imposing "traditional" OOP concepts onto JavaScript will lead to developers
getting the wrong idea about a prototype based language like JavaScript.  Especially those coming from Java often get
confused and talk about things like "static members".  I think there is an opportunity with Dojo 2 to look at something
that more fully embraces the core concepts of constructor functions and prototype inheritance.  I feel that Kris'
[ComposeJS][composejs] embraces those core concepts and adds on top of them.  I have taken his project, refactored the
code to be a bit more "readable" in my opinion but also made it ES5 property descriptor "safe" as well as added the
functionality for providing ES5 descriptors in the composition.  This is available in the [compose][compose] module.

I had a conversation with some of the wider Dojo community about [dcl][dcl], which I haven't had the time to properly
look at.  From the conversation I had with them, indications are that dcl solves some of the same "issues" that
Dojo 1.x `declare` has (like built in AOP support).  I do need to spend more time getting my mind around dcl and I
don't know if dcl, wholesale, is part of the heya prototype or if it solves that problem in other ways.

The one "drawback" that with ComposeJS (and my prototype) is that the constructor function is always named the same,
no matter what the "class" is.  I haven't had the head space to figure out if this is easily fixable.  There maybe other
features which need to be added too in order to work in all the ways expected by developers.

## Property Descriptors

Because my prototype fully leverages ES5 Property Descriptors and tries to ensure all code is descriptor "safe", I have
added a helper module called [properties][properties] which makes dealing with them a little easier.

## Object Observation

Dojo 1.X introduced `dojo/Stateful` and generally adopted the "watch" concept from Firefox/Mozilla.  In ES6, the
Harmony project introduces `object.Observe`.  I have developed the `Obserable` module to provide a base class that is
similar to `dojo/Stateful` but is designed to eventually sit on top of `object.Observe`.

There are two needs that `dojo/Stateful` could likely scratch.  One was data binding (e.g. watching properties/object
for changes and propagating those changes in another form somewhere else) and interdependent values within an object
(e.g. a widget where the `.checked` and `.value` are interdependent).  I feel that ES5 getters/setters should be used
to solve the later situation.  While in some cases it requires a significant code refactoring, it is far cleaner to
provide the derived values then it is to store different "flavours" of the same data within an object.

## DOM Manipulation

I still am of the opinion that Dojo 2 needs its own DOM manipulation library.  I also believe there is an opportunity
for adopting something innovative.  As many know I am a fan of [put-selector][put] and I won't re-hash all of my reasons
why I believe it is the right thing.

I have the [dom][dom] module included in my repository.  This unifies DOM creation, manipulation and removal.  It isn't
fully complete at this time, but it includes a refactored version of put-selector, which mainly makes the code, again,
more readable, but it also adds the feature of being able to set the inner text of node using the attribute selector
`[content=]`.  As I have stated in other discussions I think there is more that needs to be done around the
functionality of put-selector, but the basic concepts and functionality is right.

I have also integrated the basic parts of the lite selector into the `dom.query()` functionality.  It is really designed
to provide a simple selector interface to the DOM that fast paths some queries via other functions than qSA and "fixes"
the issue with rooted qSA queries.  Given the "freedom" of not having to support non-qSA browsers, I suspect there is
more we can do.

I have some examples comparing jQuery to Dojo 1.X to my prototype located in the [wiki][dom-manipulation].

Also, I am making the argument for not adopting another tool for DOM manipulation as the "standard" for Dojo.  A recent
tweet by David Walsh made me think and do some investigation.  He was indicating the jQuery 2.0 wasn't modularised
enough and at a minimised version of the "minimum" version being 83K it made me wonder how I was doing with this
proposal.  I had to refactor a few things, but I was able to produce a build ([base][base]) that was the AMD loader
(Dojo 1.9), DOM manipulation, object composition, basic language features, dojo/on, dojo/has and some ES5 property
helpers which came in at 27K minimized and 11K gzipped.  If we become dependent upon an external library to provide
basic functionality, my fear is that we will not be able to offer users the sort control/support they need to provide
these sort of optimized builds, and if anyone thinks that size doesn't really matter any-more need to understand the
mobile market better.

The problem with integrating 3rd part modules also comes in the reliance on "core" functionality.  For example, the
basic concept of "mixin" is still required in JavaScript libraries, as well as feature detection, event handling, etc.
These are some of the basic needs of most code and when you start using 3rd party modules, you will bring an unavoidable
level of duplication of some of this functionality, which in a lot of cases you can't optimise out.  Now in certain
situations, that barrier maybe acceptable, but it is far different from a end developer making a decision to integrate
certain 3rd party code, and far greater of a risk for a toolkit to force that condition upon its users.

## Server Side Rendering

Isomorphism, when applied to code, indicates something the behaves in the same fashion, but arrives at that via different
mechanisms.  Increasingly, there is a need for code to run transparently between the server and client, without the end
developer having to worry about it.

One of the features of put-selector was the ability to render a HTML string and stream it using the same API as if you
where working with the DOM directly.  This concept of a "pseudo-dom" I really liked.  What I have done in my prototype
is to create a [doc][doc] module that returns either the current document in a browser or returns this psuedo-dom which
can then be interfaced with in the same fashion as the standard DOM.  It isn't functionality complete at the moment
(for example, the document cannot be queried at the moment), but the idea is to continue to build what parts of the DOM
are needed to support the other parts of the API for execution on the server side.

While there are other pseudo-dom solutions out there for server side, in a lot of ways it is significantly more than is
needed to fit the purpose and would require a external dependency again.  While I think it is acceptable for end users
to make that decision, I think toolkits should limit any external dependencies (integration and compatibility are two
totally different things from dependency in my opinion).

Also, Bill and I have talked about the ability for the parser to be able to stitch together server side rendered DOM to
client side instantiated widgets.  While I haven't had the time to integrate this into my prototype of the parser yet,
I hope to in the very near future.  This would allow code to execute somewhere else, generate its DOM, pass it to the
browser and then be tied quickly to the appropriate client side code very quickly and efficiently.

## has() API

I probably haven't used this sufficiently in my prototype.  We need to do more of this and we need to do it in a way
that is consistent.  I would much rather "waste" a few more lines in setting up feature that can be built out of the
code.  Modularisation only goes so far, because the modules have to serve multiple user agents transparently, where as
the build process with has feature detection/expression is where real optimisation can be achieved.

## Debugging

I stubbed out a module called debug that I hope would evolve into something more robust that would allow better
instrumentation.

## Widgets

While this was far more of an experiment than even a prototype, I did develop a base widget based on the rest of the
proposals which is available in the [widget/Widget][widget] module.  I think the big points to take from this are if
we decide to change the foundations significantly, we should also take the opportunity to evaluate the widgets and see
if we can rationalise the widget API, and two, it should meet more of the objectives which were laid out previously in
mailing list, in particular about being more isomorphic aware/capable.  My opinion is that Dijit 1.X has absolutely
done its best to maintain parity with the modern concepts in the core, but it could really benefit from a clean sheet
and be built back up.

[dojo2-core]: https://github.com/csnover/dojo2-core
[teststack]: https://github.com/csnover/dojo2-teststack
[benchmark]: https://github.com/csnover/dojo2-teststack/pull/39
[composejs]: https://github.com/kriszyp/compose
[put]: https://github.com/kriszyp/put-selector
[d2package]: https://github.com/kitsonk/dojo2-boilerplate-package
[dcl]: https://github.com/uhop/dcl
[dom-manipulation]: https://github.com/kitsonk/d2-proto/wiki/DOM-Manipulation

[d2-proto]: https://github.com/kitsonk/d2-proto/
[lang]: https://github.com/kitsonk/d2-proto/blob/master/lang.js
[parser]: https://github.com/kitsonk/d2-proto/blob/master/parser.js
[properties]: https://github.com/kitsonk/d2-proto/blob/master/properties.js
[compose]: https://github.com/kitsonk/d2-proto/blob/master/compose.js
[dom]: https://github.com/kitsonk/d2-proto/blob/master/dom.js
[doc]: https://github.com/kitsonk/d2-proto/blob/master/doc.js
[base]: https://github.com/kitsonk/d2-proto/blob/master/doc.js
[widget]: https://github.com/kitsonk/d2-proto/blob/master/widget/Widget.js