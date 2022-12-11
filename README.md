# WebSocket-Test-Server

Ever needed to test WebSockets on a website and wish you could send arbitrary data to the client without needing to rewrite the backend? Or maybe you're testing an integration with a 3rd-party WebSocket server but don't want to actually connect to their server during development? WebSocket-Test-Server can help.

## Installation

```
npm install --global websocket-test-server
```

## Usage

To use WebSocket-Test-Server, create a config file and then run `websocket-test-server` from the command line.

```json
{
	"ws": {
		"routes": [
			"/eventsub"
		],
		"customRouteHandler": ""
	},
	"dashboard": {
		"port": 8080
	}
}
```

```
websocket-test-server --config /path/to/config.json
```

## Advanced Usage

The routes registered in the config file cannot be automated using code. All data sent to the clients must be done manually though the dashboard.

You can register routes programatically by setting the `customRouteHandler` config option to the path of a file using the WebSocket-Test-Server API.

```js
module.exports = (api) => {
	api.registerRoute('/echo', (ws) => {
		ws.on('message', (data) => {
			let d = data.toString();
			ws.send(d);
		});
	});
};
```

See the file(s) in the `api-example` directory for more information.