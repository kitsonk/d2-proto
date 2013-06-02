define([ './has' ], function (has) {
	if (!has('host-node')) {
		throw new Error('node plugin failed to load because environment is not Node.js');
	}

	return {
		// summary:
		//		This AMD plugin module allows native Node.js modules to be loaded by AMD modules using the Dojo
		//		loader. Note that this plugin will not work with AMD loaders other than the Dojo loader.
		// example:
		//	|	require(["dojo/node!fs"], function(fs){
		//	|		var fileData = fs.readFileSync("foo.txt", "utf-8");
		//	|	});

		load: function (/*string*/ id, /*Function*/ require, /*Function*/ callback) {
			// summary:
			//		Standard AMD plugin interface. See https://github.com/amdjs/amdjs-api/wiki/Loader-Plugins
			//		for information.

			if (!require.nodeRequire) {
				throw new Error('Cannot find native require function');
			}

			var oldDefine = define,
				result;

			// Some modules may attempt to detect an AMD environment and register themselves with the loader;
			// this breaks when loading a non-AMD module that loads one of these multi-environment modules, so
			// hide the global define during the loading process
			define = undefined;

			try {
				result = require.nodeRequire(id);
			}
			finally {
				// nodeRequire might throw, it might not; in either case we need to make sure define is fixed up
				// immediately after the module is loaded
				define = oldDefine;
			}

			callback(result);
		},

		normalize: function (/**string*/ id) {
			if (id.charAt(0) === '.') {
				id = require.baseUrl + id;
			}

			return id;
		}
	};
});