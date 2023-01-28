/* eslint-disable valid-jsdoc */
/** @param {import('../api.js')} api */
module.exports = (api) => {
	// Registers a button called "testing" on the /test page, sending "test" to all clients on click
	api.registerDashboardButton('/test', 'testing', (cb) => {
		cb('test');
	});

	// Registers a button called "testing" on the /testing/with/slashes page, sending "testing" to all clients on click
	api.registerDashboardButton('/testing/with/slashes', 'testing', (cb) => {
		cb('testing');
	});

	// Registers a route that echoes data back to the client
	api.registerRoute('/test', (ws) => {
		ws.send('OPEN');

		ws.on('message', (data) => {
			let d = data.toString();

			if (d.startsWith('ECHO')) {
				let echo = d.replace(/^ECHO/, '').trim();

				if (echo) {
					ws.send(d);
				}
			}
		});
	});

	// Registers a route that sends "testing" to the client as soon as it connects
	api.registerRoute('/testing/with/slashes', (ws) => {
		ws.send('testing');
	});
};