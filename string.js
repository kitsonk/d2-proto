define([
	'exports',
	'./lang'
], function (exports, lang) {
	'use strict';

	var string = {};

	/**
	 * Performs parameterized substitutions on a string. Throws an exception if any parameter is unmatched.
	 * @param  {String}   template  a string with expressions in the form `${key}` to be replaced or `${key:format}`
	 *                              which specifies a format function. keys are case-sensitive.
	 * @param  {Object}   map       hash to search for substitutions
	 * @param  {Function} transform a function to process all parameters before substitution takes place, e.g.
	 *                              mylib.encodeXML
	 * @param  {Object}   scope     where to look for optional format function; default to the global namespace
	 * @return {[type]}             [description]
	 */
	function substitute(template, map, transform, scope) {
		scope = scope || lang.getGlobal();
		transform = transform ? lang.bind(scope, transform) : function (v) {
			return v;
		};

		return template.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g, function (match, key, format) {
			var value = lang.getObject(key, false, map);
			if (format) {
				value = lang.getObject(format, false, scope).call(scope, value, key);
			}
			return transform(value, key).toString();
		});
	}

	Object.defineProperties(string, {
		substitute: {
			value: substitute,
			enumerable: true
		}
	});

	/* jshint boss:true */
	return exports = string;
});