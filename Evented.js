define([
	'./aspect',
	'./on',
	'./compose'
], function (aspect, on, compose) {
	'use strict';

	var after = aspect.after;

	return compose({
		on: function (type, listener) {
			return on.parse(this, type, listener, function (target, type) {
				return after(target, 'on' + type, listener, true);
			});
		},
		emit: function (/*===== type, event =====*/) {
			var args = [this];
			args.push.apply(args, arguments);
			return on.emit.apply(on, args);
		}
	});
});