const express = require('express');
const http = require('http');
const { parse } = require('url');
const { WebSocketServer } = require('ws');
const open = require('open');
const path = require('path');
const API = require('./api.js');
const config = require(process.env.CONFIG_FILE || './config.json');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const dashWss = new WebSocketServer({ noServer: true });
/** @type {Map<String, Set<WebSocket>>} */
const dashRouteClientMap = new Map();
/** @type {Map<String, Set<{ws: WebSocket, ip: String}>>} */
const wsRouteClientMap = new Map();
/** @type {Map<String, Number>} */
const dashRouteClientActivityMap = new Map();
/** @type {Map<String, Number>} */
const wsRouteClientActivityMap = new Map();

const api = new API();
if (config.ws.customRouteHandler) {
	try {
		if (config.ws.customRouteHandler.startsWith('./')) {
			require(path.join(path.dirname(process.env.CONFIG_FILE), config.ws.customRouteHandler))(api);
		} else {
			require(config.ws.customRouteHandler)(api);
		}
	} catch (err) {
		console.error('Failed to load custom route handler', err);
	}
}

for (var i = 0; i < config.ws.routes.length; i++) {
	api._registerConfigRoute(config.ws.routes[i]);
}

console.warn('IMPORTANT: This tool is intended for development use only. It might not remove disconnected WebSocket sessions and may leak memory.');

function handleDashEchoMessage(route, data, direction, ip) {
	if (!dashRouteClientMap.has(route)) return;
	dashRouteClientMap.get(route).forEach((ws2) => {
		ws2.send(JSON.stringify({
			meta: {
				type: 'echo',
				direction: direction,
				ip
			},
			data: data.toString()
		}));
	});
}

wss.on('connection', (ws, req) => {
	if (!api.hasRoute(req.url)) {
		ws.send(JSON.stringify({
			meta: {
				type: 'error'
			},
			data: {
				message: 'Path is not registered. Closing connection.'
			}
		// eslint-disable-next-line no-empty-function
		}), () => {});
		ws.close();
		return;
	}

	let ip = `${req.socket.remoteAddress}:${req.socket.remotePort}`;

	let route = req.url;
	if (!wsRouteClientMap.has(route)) {
		wsRouteClientMap.set(route, new Map());
	}

	wsRouteClientMap.get(route).set(ip, {
		ws,
		ip
	});
	wsRouteClientActivityMap.set(ip, Date.now());

	try {
		let conn = new API.Connection(ws);

		conn.on('outgoingMessage', (data) => {
			handleDashEchoMessage(route, data, 'out', ip);
		});

		if (api._hasRouteCallback(route)) {
			api._getRouteCallback(req.url)(conn);
		}
	} catch (err) {
		console.error(`An error occurred while calling custom route ${req.url}`, err);
	}

	ws.on('message', (data) => {
		if (!dashRouteClientMap.has(route)) return;
		handleDashEchoMessage(route, data, 'in', ip);
	});

	var wsInterval = setInterval(() => {
		ws.ping();

		if (!wsRouteClientActivityMap.get(ip) || Date.now() - wsRouteClientActivityMap.get(ip) > 60 * 1000) {
			console.log(`Closed WebSocket connection from ${ip} due to inactivity.`);
			ws.terminate();
			clearInterval(wsInterval);
			
			if (!wsRouteClientMap.has(route)) return;
			wsRouteClientMap.get(route).delete(ip);
			wsRouteClientActivityMap.delete(ip);
		}
	}, 30 * 1000).unref();

	ws.on('pong', () => {
		wsRouteClientActivityMap.set(ip, Date.now());
	});

	ws.on('close', () => {
		if (!wsRouteClientMap.has(route)) return;
		wsRouteClientMap.get(route).delete(ip);
		wsRouteClientActivityMap.delete(ip);
	});
});

dashWss.on('connection', (ws, req) => {
	let path = parse(req.url).pathname;
	let route = path.replace('/_internal/routes', '');
	let ip = `${req.socket.remoteAddress}:${req.socket.remotePort}`;

	if (path.startsWith('/_internal/routes/')) {
		if (!dashRouteClientMap.has(route)) {
			dashRouteClientMap.set(route, new Set());
		}

		dashRouteClientMap.get(route).add(ws);
	}

	dashRouteClientActivityMap.set(ip, Date.now());

	ws.on('message', (data) => {
		let d = JSON.parse(data.toString());

		switch (d.meta.type) {
			case 'echo':
				if (d.meta.direction !== 'out') break;
				if (!wsRouteClientMap.has(route)) return;
				wsRouteClientMap.get(route).forEach((v) => {
					v.ws.send(d.data);
					handleDashEchoMessage(route, d.data, 'out', v.ip);
				});
				break;
			case 'button-click':
				if (!api.hasDashboardButton(`${route}`, d.data.id)) break;
				api._getDashboardButtonCallback(`${route}`, d.data.id)((data) => {
					if (!wsRouteClientMap.has(route)) return;
					wsRouteClientMap.get(route).forEach((v) => {
						v.ws.send(data);
						handleDashEchoMessage(route, data, 'out', v.ip);
					});
				});
				break;
		}
	});

	setInterval(() => {
		ws.ping();

		if (Date.now() - dashRouteClientActivityMap.get(ip) > 60 * 1000) {
			console.log(`Closed dashboard WebSocket connection from ${ip} due to inactivity.`);
			ws.terminate();
			dashRouteClientActivityMap.delete(ip);
		}
	}, 30 * 1000).unref();

	ws.on('pong', () => {
		dashRouteClientActivityMap.set(ip, Date.now());
	});

	ws.on('close', () => {
		if (!dashRouteClientMap.has(route)) return;
		dashRouteClientMap.get(route).delete(ws);
		dashRouteClientActivityMap.delete(ip);
	});
});

server.on('upgrade', (req, socket, head) => {
	let path = parse(req.url).pathname;

	if (path.startsWith('/_internal')) {
		dashWss.handleUpgrade(req, socket, head, (ws) => {
			dashWss.emit('connection', ws, req);
		});
	} else {
		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit('connection', ws, req);
		});
	}
});

let expressWorkingDirectory = __dirname;
if (process.env.INSTALL_DIR) {
	expressWorkingDirectory = process.env.INSTALL_DIR;
}

app.set('view engine', 'ejs');
app.set('views', path.join(expressWorkingDirectory, 'views'));
app.use('/assets', express.static(path.join(expressWorkingDirectory, 'static')));

app.get('/', (req, res) => {
	res.render('index', {
		routes: [
			...api.getRoutes()
		]
	});
});

app.get('/routes/:route*', (req, res) => {
	let route = `/${req.params.route}${req.params[0]}`;
	if (!api.hasRoute(route)) {
		return res.redirect('/');
	}

	res.render('route', {
		route: route,
		buttons: api.hasRoute(route) ? api.getDashboardButtons(route) : [],
		apiRegistered: api._hasRouteCallback(route)
	});
});

server.listen(config.dashboard.port, () => {
	console.log(`Dashboard listening on port ${config.dashboard.port}`);

	if (process.env.OPEN_BROWSER) {
		open('http://localhost:8080').catch((err) => {
			console.warn('Failed to open dashboard in browser', err);
		});
	}
});