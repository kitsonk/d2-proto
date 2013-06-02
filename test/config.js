define({
	proxyPort: 9000,
	proxyUrl: 'http://localhost:9000/',

	capabilities: {
		'selenium-version': '2.30.0'
	},

	environments: [
		{ browserName: 'internet explorer', version: '10', platform: 'Windows 2012' },
		{ browserName: 'internet explorer', version: '9', platform: 'Windows 2008' },
		{ browserName: 'firefox', version: '19', platform: [ 'Linux', 'Mac 10.6', 'Windows 2012' ] },
		{ browserName: 'chrome', platform: [ 'Linux', 'Mac 10.8', 'Windows 2008' ] },
		{ browserName: 'safari', version: '6', platform: 'Mac 10.8' }
	],

	maxConcurrency: 3,
	useSauceConnect: true,

	webdriver: {
		host: 'localhost',
		port: 4444
	},

	loader: {
		packages: [
			{ name: 'dojo', location: 'dojo' },
			{ name: 'd2-proto', location: 'd2-proto' }
		]
	},

	suites: [ 'd2-proto/test/all' ],

	functionalSuites: [ 'd2-proto/test/functional' ],

	excludeInstrumentation: /^d2-proto\/(?:test\/)/

});