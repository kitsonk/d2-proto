define([
], function () {
	var widgetsUID = {},
		widgets = {};

	return {
		length: 0,

		add: function (widget) {
			if (widgets[widget.id]) {
				throw new Error('Tried to register widget with id==' + widget.id + ', but id is already registered');
			}
			widgets[widget.id] = widget;
			this.length++;
		},

		remove: function (id) {
			if (widgets[id]) {
				delete widgets[id];
				this.length--;
			}
		},

		byId: function (id) {
			return typeof id === 'string' ? widgets[id] : id;
		},

		byNode: function (node) {
			return widgets[node.widgetId];
		},

		toArray: function () {
			var a = [];
			for (var id in widgets) {
				a.push(widgets[id]);
			}
			return a;
		},

		getUID: function (type) {
			var id;
			do {
				id = type + '_' + (type in widgetsUID ? ++widgetsUID[type] : widgetsUID[type] = 0);
			} while (widgets[id]);
			return id;
		},

		findAll: function (root, skip) {
			var results = [],
				node, id, widget;

			function getChildren(root) {
				for (node = root.firstChild; node; node = node.nextSibling) {
					if (node.nodeType === 1) {
						id = node.widgetId;
						if (id) {
							widget = widgets[id];
							if (widget) {
								results.push(widget);
							}
						}
						else if (node !== skip) {
							getChildren(node);
						}
					}
				}
			}

			getChildren(root);
			return results;
		},

		getEnclosing: function (node) {
			var id;
			while (node) {
				id = node.nodeType === 1 && node.widgetId;
				if (id) {
					return widgets[id];
				}
				node = node.parentNode;
			}
			return null;
		}
	};
});