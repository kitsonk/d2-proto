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
		arrProp1: null,
		arrProp2: null,
		objProp1: null,
		objProp2: null
	});
});