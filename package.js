var profile = (function () {
	var testResourceRe = /^d2-proto\/test\//,

		copyOnly = function (filename, mid) {
			var list = {
				'd2-proto/package': 1,
				'd2-proto/package.json': 1,
				'd2-proto/test': 1
				// these are test modules that are not intended to ever be built
			};
			return (mid in list) ||
				(/^d2-proto\/resources\//.test(mid) && !/\.css$/.test(filename)) ||
				/(png|jpg|jpeg|gif|tiff)$/.test(filename) ||
				/built\-i18n\-test\/152\-build/.test(mid);
		};

	return {
		resourceTags: {
			test: function (filename, mid) {
				return testResourceRe.test(mid) || mid === 'd2-proto/test';
			},

			copyOnly: function (filename, mid) {
				return copyOnly(filename, mid);
			},

			amd: function (filename, mid) {
				return !testResourceRe.test(mid) && !copyOnly(filename, mid) && /\.js$/.test(filename);
			}
		}
	};
})();