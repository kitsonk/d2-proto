define([
], function(){
	// This is just a stub module for what will hopefully be a more robust module in Dojo 2.0

	return {
		log: function() {
			console.log.apply(console, arguments);
		},
		warn: function() {
			console.warn.apply(console, arguments);
		},
		error: function() {
			console.error.apply(console, arguments);
		}
	};
});