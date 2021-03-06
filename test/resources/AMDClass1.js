define([
	'../../compose',
	'../../lang'
], function (compose, lang) {
	return compose(function (props/*, node*/) {
		this.props = props;
		lang.mixin(this, props);
	}, {
		strProp1: '',
		strProp2: 'test',
		arrProp1: [],
		arrProp2: [],
		objProp1: {},
		objProp2: {},
		boolProp1: false,
		boolProp2: true,
		numProp1: 0,
		numProp2: 1,
		funcProp1: function () {}
	});
});