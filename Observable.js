define([
	'./compose',
	'./properties',
	'dojo/aspect',
	'dojo/has'
], function (compose, properties, aspect, has) {

	has.add('es6-observe', Object.observe && typeof Object.observe === 'function');

	var property = compose.property;

	/* These correspond directly to functionality described in Harmony's Object.observe specification */
	var observerCallbacks = [];

	function enqueueChangeRecord(record, target) {
		target.forEach(function (observer) {
			observer._pendingChangeRecords.push(record);
		});
	}

	function deliverChangeRecords(callback) {
		var changeRecords = callback._pendingChangeRecords;
		callback._pendingChangeRecords = [];
		var array = [],
			n = 0;
		changeRecords.forEach(function (record) {
			array[n.toString()] = record;
			n++;
		});
		if (!n) {
			return false;
		}
		callback.call(undefined, array);
		return true;
	}

	function deliverAllChangeRecords() {
		var observers = observerCallbacks,
			anyWorkDone = false;
		observers.forEach(function (observer) {
			if (deliverChangeRecords(observer)) {
				anyWorkDone = true;
			}
		});
		return anyWorkDone;
	}

	function createChangeRecord(type, object, name, oldDesc, newDesc) {
		var changeRecord = {};
		Object.defineProperty(changeRecord, 'type', {
			value: type,
			enumerable: true
		});
		Object.defineProperty(changeRecord, 'object', {
			value: object,
			enumerable: true
		});
		Object.defineProperty(changeRecord, 'name', {
			value: name,
			enumerable: true
		});
		if (properties.isDataDescriptor(oldDesc)) {
			if (!properties.isDataDescriptor(newDesc) || oldDesc.value !== newDesc.value) {
				Object.defineProperty(changeRecord, 'oldValue', {
					value: oldDesc.value,
					enumerable: true
				});
			}
		}
		return Object.preventExtensions(changeRecord);
	}

	var Notifier = compose(function (object) {
		this.target = object;
		this.changeObservers = [];
	}, {
		target: undefined,
		changeObservers: [],
		notify: property({
			value: function (changeRecord) {
				var notifier = this,
					changeObservers = notifier.changeObservers,
					target = notifier.target,
					newRecord = {},
					name, value;
				Object.defineProperty(newRecord, 'object', {
					value: target,
					writable: false,
					enumerable: true,
					configurable: false
				});
				for (name in changeRecord) {
					value = changeRecord[name];
					Object.defineProperty(newRecord, name, {
						value: value,
						writable: false,
						enumerable: true,
						configurable: false
					});
				}
				Object.preventExtensions(newRecord);
				enqueueChangeRecord(newRecord, changeObservers);
			},
			writable: true,
			enumerable: false,
			configurable: true
		})
	});

	/* This is functionality in order to bridge the gap between native code and JavaScript */
	function installObservableProperty(target, name) {
		// summary:
		//		Take a property and convert it into something that is observable

		if (!target._observedProperties) {
			Object.defineProperty(target, '_observedProperties', {
				value: {},
				writable: true,
				configurable: true
			});
		}
		var observedProperties = target._observedProperties,
			newDesc, value;
		if (!(name in target._observedProperties)) {
			if (name in target) {
				var oldDesc = properties.getDescriptor(target, name),
					ownProp = target.hasOwnProperty(name);
				if (oldDesc.configurable) {
					// only configurable properties can be wrapped
					if (properties.isDataDescriptor(oldDesc) && oldDesc.writable) {
						// only writable data descriptor should be wrapped
						value = oldDesc.value;
						newDesc = {
							get: function () {
								return value;
							},
							set: function (newValue) {
								console.log(name, newValue);
								value = newValue;
							},
							enumerable: oldDesc.enumerable,
							configurable: true
						};
					} else if (properties.isAccessorDescriptor(oldDesc) && 'set' in oldDesc) {
						// only accessor properties with a set can be wrapped
						newDesc = {
							get: oldDesc.get,
							set: aspect.around(oldDesc, 'set', function (oldSet) {
								return function (newValue) {
									var result = oldSet(newValue),
										newValue = target[name];
									return result;
								};
							}),
							enumerable: oldDesc.enumerable,
							configurable: true
						};
					}
					if (newDesc) {
						if (!ownProp) {
							// "new" property change record
						}
						Object.defineProperty(target, name, newDesc);
						observedProperties[name] = {
							oldDesc: oldDesc,
							newDesc: newDesc
						};
					}
				}
			} else {
				// this property doesn't exist yet
				newDesc = {
					get: function () {
						return value;
					},
					set: function (newValue) {
						value = newValue;
					},
					enumerable: true,
					configurable: true
				};
				Object.defineProperty(target, name, newDesc);
				observedProperties[name] = {
					newDesc: newDesc
				};
			}
		}
	}

	/* This is the base Observable class */
	return compose(function (params) {
		for (var key in params) {
			this[key] = params[key];
		}
	}, {
		observe: property({
			value: function (callback) {
				if (typeof callback !== 'function') {
					throw new TypeError('callback must be a function');
				}
				if (Object.isFrozen(callback)) {
					throw new TypeError('callback must not be frozen');
				}
				if (!callback._pendingChangeRecords) {
					Object.defineProperty(callback, '_pendingChangeRecords', {
						value: [],
						writable: true,
						configurable: true
					});
				}
				var notifier = this.getNotifier(),
					changeObservers = notifier.changeObservers;
				if (!~changeObservers.indexOf(callback)) {
					changeObservers.push(callback);
				}
				if (!~observerCallbacks.indexOf(callback)) {
					observerCallbacks.push(callback);
				}
				return this;
			}
		}),

		unobserve: property({
			value: function (callback) {
				if (typeof callback !== 'function') {
					throw new TypeError('callback must be a function');
				}
				var notifier = this.getNotifier(),
					changeObservers = notifier.changeObservers;
				if (~changeObservers.indexOf(callback)) {
					changeObservers.splice(changeObservers.indexOf(callback), 1);
				}
				return this;
			}
		}),

		deliverChangeRecords: property({
			value: function (callback) {
				if (typeof callback !== 'function') {
					throw new TypeError('callback must be a function');
				}
				while (deliverChangeRecords(callback)) {}
			}
		}),

		getNotifier: property({
			get: function () {
				if (Object.isFrozen(this)) {
					return null;
				}
				if (!this._notifier) {
					this._notifier = new Notifier(this);
				}
				return this._notifier;
			}
		}),

		defineOwnProperty: property({
			value: function (name, descriptor) {
				return Object.defineProperty(this, name, descriptor);
			}
		}),

		remove: property({
			value: function (name) {
				if (name in this) {
					delete this[name];
				}
			}
		}),

		observeProperty: property({
			value: function (name) {
				installObservableProperty(this, name);
			}
		}),

		_notifier: property({
			value: undefined,
			writable: true
		})
	});

});