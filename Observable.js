define([
	'./compose',
	'./properties',
	'dojo/aspect',
	'dojo/has'
], function (compose, properties, aspect, has) {
	'use strict';

	/* For future use, to branch for Harmony's native observe functionality */
	has.add('es6-observe', Object.observe && typeof Object.observe === 'function');

	var property = compose.property;

	/* These correspond directly to functionality described in Harmony's Object.observe specification */

	// observerCallbacks: Array
	//		A "global" array of all observer callback functions
	var observerCallbacks = [];

	function enqueueChangeRecord(record, target) {
		// summary:
		//		Queues a change record for delivery to a callback
		// record: Object
		//		The change record to be queued
		// target: Array
		//		The array of callbacks associated with an observable Object

		target.forEach(function (observer) {
			observer._pendingChangeRecords.push(record);
		});
	}

	function deliverChangeRecords(callback) {
		// summary:
		//		Calls the callback with all the associated change records for that callback
		// callback: Function
		//		The callback function that should have it change records delivered

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
		// summary:
		//		Deliver all pending change records to all callbacks

		var observers = observerCallbacks,
			anyWorkDone = false;
		observers.forEach(function (observer) {
			if (deliverChangeRecords(observer)) {
				anyWorkDone = true;
			}
		});
		return anyWorkDone;
	}

	function createChangeRecord(type, object, name, oldValue) {
		// summary:
		//		Generates a change record object.
		// type: String
		//		The type of the change, one of `new`, `updated`, `reconfigured` or `deleted`.
		// object: Object
		//		The object that is the subject of the change record.
		// name: String
		//		The name of the property that is the subject of the change record.
		// oldValue: Mixed?
		//		The previous value of the property, if applicable
		// returns: Object
		//		Returns the change record object

		var changeRecord = {};
		Object.defineProperties(changeRecord, {
			'type': {
				value: type,
				enumerable: true
			},
			'object': {
				value: object,
				enumerable: true
			},
			'name': {
				value: name,
				enumerable: true
			}
		});
		if (oldValue !== undefined) {
			Object.defineProperty(changeRecord, 'oldValue', {
				value: oldValue,
				enumerable: true
			});
		}
		return Object.preventExtensions(changeRecord);
	}

	function getNotifier(target) {
		// summary:
		//		Returns the Notifier for the target.
		// description:
		//		Provides the Notifier for the target and creates and assigns the notifier if not present.
		// target: Observable
		//		The target to return the notifier for

		if (Object.isFrozen(target)) {
			return null;
		}
		if (!target._notifier) {
			Object.defineProperty(target, '_notifier', {
				value: new Notifier(target),
				writable: true
			});
		}
		return target._notifier;
	}

	// An analogue of the Notifier class identified in Harmony's observe API
	var Notifier = compose(function (object) {
		this.target = object;
		this.changeObservers = [];
	}, {
		// target: Observable
		//		The observable object that is the target of this notifier
		target: undefined,

		// changeObservers: Array
		//		An array of callback functions that are observing the target of the notifier
		changeObservers: [],

		// notify: Function
		//		Notifies (enqueues) a change record to the change observers
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

	/* These are functions that bridge the gap between Harmony observe and what can be accomplished in ES5 */

	function installObservableProperty(target, name, descriptor) {
		// summary:
		//		Take a property and convert it into a property that is observable
		// description:
		//		Tries to redefine the property descriptor of a property, so that changes to the property will generate
		//		change records which can be delivered to an observable callback.  If the property is a data descriptor
		//		property, it wraps it with accessors.  If it is an existing accessor property, it will wrap the
		//		setter that allows it to monitor changes.  If the property does not exist, it will create the property.
		//		If the property cannot be wrapped properly.
		// target: Observable
		//		The target object.
		// descriptor: Object?
		//		An optional descriptor, to use as a base, instead of existing property descriptor.
		// name: String
		//		The name of the property to enable for observation.

		function newChangeRecord(/*Observable*/ target, /*String*/ name) {
			// summary:
			//		Create a `new` change record, used if generating a new own property.

			var changeObservers = getNotifier(target).changeObservers,
				changeRecord = createChangeRecord('new', target, name);
			enqueueChangeRecord(changeRecord, changeObservers);
		}

		function reconfiguredChangeRecord(/*Observable*/ target, /*String*/ name) {
			// summary:
			//		Creates a `reconfigured` change record, used if reconfiguring a property.

			var changeObservers = getNotifier(target).changeObservers,
				changeRecord = createChangeRecord('reconfigured', target, name);
			enqueueChangeRecord(changeRecord, changeObservers);
		}

		function getWrappedDataDescriptor(oldDesc) {
			// summary:
			//		Generates a wrapped data descriptor which generates change records when updated

			var value = oldDesc.value;
			return {
				get: function () {
					return value;
				},
				set: function (newValue) {
					if (value !== newValue) {
						var changeObservers = getNotifier(this).changeObservers,
							changeRecord = createChangeRecord('updated', this, name, value);
						enqueueChangeRecord(changeRecord, changeObservers);
						value = newValue;
					}
				},
				enumerable: oldDesc.enumerable,
				configurable: true
			};
		}

		function getWrappedAccessorDescriptor(oldDesc) {
			// summary:
			//		Generates a wrapped accessor descriptor that generates change records when set is called

			return {
				get: oldDesc.get,
				set: aspect.around(oldDesc, 'set', function (oldSet) {
					return function (newValue) {
						var oldValue = target[name],
							result = oldSet(newValue);
						if (oldValue !== target[name]) {
							var changeObservers = getNotifier(this).changeObservers,
								changeRecord = createChangeRecord('updated', this, name, oldValue);
							enqueueChangeRecord(changeRecord, changeObservers);
						}
						return result;
					};
				}),
				enumerable: oldDesc.enumerable,
				configurable: true
			};
		}

		if (!target._observedProperties) {
			Object.defineProperty(target, '_observedProperties', {
				value: {},
				writable: true,
				configurable: true
			});
		}
		var observedProperties = target._observedProperties,
			newDesc, oldDesc;
		if (!(name in observedProperties)) {
			if (name in target) {
				var ownProp = target.hasOwnProperty(name);
				oldDesc = descriptor || properties.getDescriptor(target, name);
				if (oldDesc.configurable) {
					// only configurable properties can be wrapped
					if (properties.isDataDescriptor(oldDesc) && oldDesc.writable) {
						// only writable data descriptor should be wrapped
						newDesc = getWrappedDataDescriptor(oldDesc);
					}
					else if (properties.isAccessorDescriptor(oldDesc) && 'set' in oldDesc) {
						// only accessor properties with a set can be wrapped
						newDesc = getWrappedAccessorDescriptor(target, name, oldDesc);
					}
					if (newDesc) {
						Object.defineProperty(target, name, newDesc);
						observedProperties[name] = {
							oldDesc: oldDesc,
							newDesc: newDesc
						};
						if (target._notifier) {
							if (!ownProp) {
								newChangeRecord(target, name);
							}
							else if (descriptor) {
								// trying to change and monitor property
								reconfiguredChangeRecord(target, name);
							}
						}
					}
				}
			}
			else {
				// this property doesn't exist yet
				newDesc = getWrappedDataDescriptor({ value: undefined, enumerable: true });
				Object.defineProperty(target, name, newDesc);
				observedProperties[name] = {
					newDesc: newDesc
				};
				if (target._notifier) {
					newChangeRecord(target, name);
				}
			}
		}
		else if (descriptor) {
			// trying to reconfigure an already observable property
			oldDesc = properties.getDescriptor(target, name);
			if (oldDesc.configurable) {
				if (properties.isDataDescriptor(descriptor)) {
					newDesc = {
						get: oldDesc.get,
						set: oldDesc.set,
						enumerable: descriptor.enumerable,
						configurable: descriptor.configurable
					};
					if (target[name !== descriptor.value]) {
						// This will likely generate a change record
						target[name] = descriptor.value;
					}
				}
				else {
					newDesc = {
						get: descriptor.get,
						set: aspect.around(descriptor, 'set', function (oldSet) {
							return function (newValue) {
								var oldValue = target[name],
									result = oldSet(newValue);
								if (oldValue !== target[name]) {
									var changeObservers = getNotifier(this).changeObservers,
										changeRecord = createChangeRecord('updated', this, name, oldValue);
									enqueueChangeRecord(changeRecord, changeObservers);
								}
								return result;
							};
						}),
						enumerable: descriptor.enumerable,
						configurable: descriptor.configurable
					};
				}
				Object.defineProperty(target, name, newDesc);
				observedProperties[name].oldDesc = descriptor;
				reconfiguredChangeRecord(target, name);
			}
		}
	}

	function uninstallObservableProperty(target, name) {
		// summary:
		//		Installs the original descriptor for a property,
		// description:
		//		Reinstalls the original property descriptor for a property, although it will attempt to update any
		//		current value of the property.  This should stop the property from generating change records.
		// target: Object
		//		The target object to have the property uninstalled.
		// name: String
		//		The name of the property to be uninstalled.

		var observedProperties = target._observedProperties;
		if (observedProperties && observedProperties[name]) {
			var observedProperty = observedProperties[name],
				value = target[name];
			if (observedProperty.oldDesc) {
				// This property had a previous descriptor
				Object.defineProperty(target, name, observedProperty.oldDesc);
				target[name] = value;
			}
			else {
				// This property did not exist before being installed as an observable property, therefore it will be
				// redefined as a data property.
				Object.defineProperty(target, name, {
					value: value,
					writable: true,
					enumerable: true,
					configurable: true
				});
			}
			delete observedProperties[name];
		}
	}

	function addObserverCallback(target, callback) {
		// summary:
		//		Add a callback to a target's observer callbacks
		// description:
		//		This is the same functionality contained in Harmony's `Object.observe()` but is migrated here in order
		//		to provide a slightly modified API that allows for the enablement of only certain properties to be
		//		observable.
		// target: Observable
		//		The object that is capable of being observed.
		// callback: Function
		//		A function that should be provided with any change records for the target

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
		var notifier = getNotifier(target),
			changeObservers = notifier.changeObservers;
		if (!~changeObservers.indexOf(callback)) {
			changeObservers.push(callback);
		}
		if (!~observerCallbacks.indexOf(callback)) {
			observerCallbacks.push(callback);
		}
	}

	function removeObserverCallback(target, callback) {
		if (typeof callback !== 'function') {
			throw new TypeError('callback must be a function');
		}
		var notifier = getNotifier(target),
			changeObservers = notifier.changeObservers;
		if (~changeObservers.indexOf(callback)) {
			changeObservers.splice(changeObservers.indexOf(callback), 1);
		}
	}

	/* This is the base Observable class */

	var Observable = compose(function () {
	}, {

		observe: property({
			value: function (callback) {
				// summary:
				//		Observes the object with the supplied callback.  Also enables all enumerable owned properties
				//		to be observed.
				// callback: Function
				//		The function where the change records should be delivered to
				// returns: this

				var self = this;
				Object.keys(this).forEach(function (name) {
					installObservableProperty(self, name);
				});
				addObserverCallback(this, callback);
				return this;
			}
		}),

		unobserve: property({
			value: function (callback) {
				// summary:
				//		Removes a callback from observing an object.  If there are no callbacks left observing this
				//		object, then properties are restored to their pre-observed state.
				// callback: Function
				//		The callback to be removed.

				removeObserverCallback(this, callback);
				var notifier = getNotifier(this),
					changeObservers = notifier.changeObservers;
				if (!changeObservers.length && this._observedProperties) {
					for (var name in this._observedProperties) {
						uninstallObservableProperty(this, name);
					}
				}
				return this;
			}
		}),

		defineOwnProperty: property({
			value: function (name, descriptor) {
				// summary:
				//		Defines or reconfigures a property on this object which also will generate a change record
				//		if being observed.
				// name: String
				//		The name of the property
				// descriptor: Object?
				//		A property descriptor.  Defaults to an undefined data descriptor.

				installObservableProperty(this, name, descriptor || {
					value: undefined,
					writable: true,
					enumerable: true,
					configurable: true
				});
				return this;
			}
		}),

		defineOwnProperties: property({
			value: function (properties) {
				// summary:
				//		Defines or reconfigures a hash of properties, where the key is the property name and the value
				//		is the property descriptor.  Will also generate change records if being observed.
				// properties: Object
				//		A hash of properties, where the key is the property name and the value is the property
				//		descriptor.

				for (var name in properties) {
					installObservableProperty(this, name, properties[name]);
				}
				return this;
			}
		}),

		deleteProperty: property({
			value: function (name) {
				// summary:
				//		Removes a property from the object and generates a change record if the object is being
				//		observed.
				// name: String
				//		The name of the property to delete.

				if (name in this) {
					var oldValue = this[name],
						oldDesc = properties.getDescriptor(this, name);
					if (oldDesc.configurable) {
						delete this[name];
						var changeObservers = getNotifier(this).changeObservers,
							changeRecord = createChangeRecord('deleted', this, name, oldValue);
						enqueueChangeRecord(changeRecord, changeObservers);
					}
				}
				return this;
			}
		}),

		observeProperty: property({
			value: function (name, callback) {
				// summary:
				//		Enables the generation of change records for a named property.  Also registers the callback
				//		if provided for observation.
				// name: String
				//		The name of the property
				// callback: Function?
				//		A callback function to receive change records for the object.  Note, the callback will receive
				//		all change records for the object.

				installObservableProperty(this, name);
				if (callback) {
					addObserverCallback(this, callback);
				}
				return this;
			}
		}),

		observeProperties: property({
			value: function (names, callback) {
				// summary:
				//		Enables the generation of change records for an array of properties.  Also registers the
				//		callback if provided for observation.
				// names: Array
				//		An array of strings that identify property names to be enabled for observation.
				// callback: Function?
				//		A callback function to receive change records for the object.  Note, the callback will receive
				//		all change records for the object.

				if (!(names instanceof Array)) {
					throw new TypeError('names must be an array');
				}
				var self = this;
				names.forEach(function (name) {
					installObservableProperty(self, name);
				});
				if (callback) {
					addObserverCallback(this, callback);
				}
				return this;
			}
		})
	});

	/* Exposing some properties that are similar to what is available from Harmony's observable API */

	Object.defineProperties(Observable, {
		'observe': {
			value: function (target, callback) {
				// summary:
				//		Enable observation on an Observable object and register the callback to receive change records
				//		for the object.
				// target: Observable
				//		The object to enable observation for.
				// callback: Function
				//		The function that should receive the change records for the object.

				if ('observe' in target && typeof target.observe === 'function') {
					target.observe(callback);
				}
				return target;
			},
			enumerable: true
		},

		'unobserve': {
			value: function (target, callback) {
				// summary:
				//		Remove a callback function from an Observable target.  If all callbacks have been removed
				//		from the object, the properties will be restored to their original state, not generating
				//		change records.
				// target: Observable
				//		The object to remove the callback from.
				// callback: Function
				//		The callback to remove

				if ('unobserve' in target && target.unobserve === 'function') {
					target.unobserve(callback);
				}
				return target;
			},
			enumerable: true
		},

		'defineProperty': {
			value: function (target, name, descriptor) {
				// summary:
				//		Define a property on an object.  If the object is being observed, it will generate a change
				//		record.  If the object is not Observable, then it defaults to `Object.defineProperty`
				// target: Object
				//		The object that the property should be defined on
				// name: String
				//		The name of the property to define
				// descriptor: Object
				//		The property descriptor for the property

				if ('defineOwnProperty' in target && target.defineOwnProperty === 'function') {
					target.defineOwnProperty(name, descriptor);
				}
				else {
					Object.defineProperty(target, name, descriptor);
				}
				return target;
			},
			enumerable: true
		},

		'defineProperties': {
			value: function (target, properties) {
				// summary:
				//		Define a hash of properties on an object.  If the object is being observed, it will generate
				//		change records.  If the object is not Observable, then it defaults to `Object.defineProperties`
				// target: Object
				//		The object that the properties should be defined on
				// properties: Object
				//		A hash of properties, where the key is the property name and the value is the property
				//		descriptor for the property
				
				if ('defineOwnProperties' in target && target.defineOwnProperties === 'function') {
					target.defineOwnProperties(properties);
				}
				else {
					Object.defineProperties(target, properties);
				}
				return target;
			},
			enumerable: true
		},

		'getNotifier': {
			value: getNotifier,
			enumerable: true
		},

		'deliverChangeRecords': {
			value: function (callback) {
				// summary:
				//		Deliver any pending change records to the callback.
				// callback: Function
				//		The function that the change records should be delivered to.

				if (typeof callback !== 'function') {
					throw new TypeError('callback must be a function');
				}
				while (deliverChangeRecords(callback)) {}
			},
			enumerable: true
		},

		'deliverAllChangeRecords': {
			value: deliverAllChangeRecords,
			enumerable: true
		}
	});

	return Observable;

});