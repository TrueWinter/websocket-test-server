const { EventEmitter } = require('events');

module.exports = class API {
	#dynamicRouteMap;
	#dashboardButtons;

	/**
	 ** @private
	 */
	constructor() {
		/** @type {Map<String, Function>} */
		this.#dynamicRouteMap = new Map();

		/** @type {Map<String, Function>} */
		this.#dashboardButtons = new Map();
	}

	/**
	 * @callback routeCallback
	 * @param {import('./api').Connection} ws
	 */
	/**
	 * Registers a route. Routes starting with `/_internal` are ignored.
	 * @param {string} route The route to register
	 * @param {routeCallback} cb The callback containing a WebSocket object
	 */
	registerRoute(route, cb) {
		if (route.startsWith('/_internal')) {
			return;
		}

		if (!cb) {
			return;
		}

		this.#dynamicRouteMap.set(route, cb);
	}

	/**
	 * @private
	 * @param {string} route The route
	 * @param {Function} cb The callback
	 */
	_registerConfigRoute(route) {
		if (route.startsWith('/_internal')) {
			return;
		}

		this.#dynamicRouteMap.set(route, null);
	}

	/**
	 * Unregisters a route
	 * @param {string} route The route to unregister
	 */
	unregisterRoute(route) {
		this.#dynamicRouteMap.delete(route);
	}

	/**
	 * Checks if the route has been registered
	 * @param {string} route the route to check
	 * @returns {boolean} true if the route has been registered
	 */
	hasRoute(route) {
		return this.#dynamicRouteMap.has(route);
	}

	/**
	 * Returns an iterable of keys in the route map
	 * @returns {IterableIterator}
	 */
	getRoutes() {
		return this.#dynamicRouteMap.keys();
	}

	/**
	 * @private
	 * @param {string} route The route
	 * @returns {boolean}
	 */
	_hasRouteCallback(route) {
		return !!this.#dynamicRouteMap.get(route);
	}

	/**
	 * @private
	 * @param {string} route The route
	 * @returns {Function}
	 */
	_getRouteCallback(route) {
		return this.#dynamicRouteMap.get(route);
	}

	/**
	 * Registers a button on the dashboard for a route
	 * @param {string} route The route
	 * @param {string} id The button ID, must be unique per route
	 * @param {Function} cb The callback containing the data to be sent to connected clients
	 */
	registerDashboardButton(route, id, cb) {
		this.#dashboardButtons.set(`${route}-${id}`, cb);
	}

	/**
	 * Unregisters a dashboard button
	 * @param {string} route The route
	 * @param {string} id The button ID
	 */
	unregisterDashboardButton(route, id) {
		this.#dashboardButtons.delete(`${route}-${id}`);
	}

	/**
	 * Returns true if the button exists
	 * @param {string} route The route
	 * @param {string} id The button ID
	 * @returns {boolean}
	 */
	hasDashboardButton(route, id) {
		return this.#dashboardButtons.has(`${route}-${id}`);
	}

	/**
	 * Gets all dashboard buttons for a route
	 * @param {string} route The route
	 * @returns {Array} An array of button IDs
	 */
	getDashboardButtons(route) {
		let buttons = [];

		this.#dashboardButtons.forEach((v, k) => {
			if (k.startsWith(`${route}-`)) {
				var regex = new RegExp(`^${route}-`);
				buttons.push(k.replace(regex, ''));
			}
		});

		return buttons;
	}

	/**
	 * @private
	 * @param {string} route The route
	 * @param {string} id The button ID
	 * @returns {Function}
	 */
	_getDashboardButtonCallback(route, id) {
		return this.#dashboardButtons.get(`${route}-${id}`);
	}
};

// eslint-disable-next-line valid-jsdoc
/**
 * Represents a WebSocket connection
 * @typedef {["open" | "message" | "error" | "close", ...any[]]} eventsDef
 */
module.exports.Connection = class Connection extends EventEmitter {
	#ws;

	/**
	 * Creates a Connection
	 * @param {WebSocket} ws The WebSocket
	 */
	constructor(ws) {
		super();
		this.#ws = ws;

		this.#ws.on('open', () => {
			this.emit('open');
		});

		this.#ws.on('message', (data) => {
			this.emit('message', data);
		});

		this.#ws.on('error', () => {
			this.emit('error');
		});

		this.#ws.on('close', () => {
			this.emit('close');
		});
	}

	/**
	 * Sends data to the WebSocket
	 * @param {string | ArrayBufferLike | Blob | ArrayBufferView} data The data
	 */
	send(data) {
		this.#ws.send(data);

		this.emit('outgoingMessage', data);
	}

	/**
	 * Closes a WebSocket connection
	 * @param {number} [code] The close code
	 * @param {string} [reason] The reason
	 */
	close(code, reason) {
		this.#ws.close(code, reason);
	}

	/**
	 * @param {eventsDef} args The args
	 */
	addListener(...args) {
		super.addListener(...args);
	}

	/**
	 * @param {eventsDef} args The args
	 */
	on(...args) {
		super.on(...args);
	}
};