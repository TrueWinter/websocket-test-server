/* eslint-disable valid-jsdoc */
/** @param {import('../api.js')} api */
module.exports = (api) => {
	api.registerDashboardButton('/test', 'testing', (cb) => {
		cb('test');
	});

	api.registerDashboardButton('/testing/with/slashes', 'testing', (cb) => {
		cb('testing');
	});

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

	api.registerRoute('/testing/with/slashes', (ws) => {
		ws.send('testing');
	});
};