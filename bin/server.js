const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const path = require('path');
const { version } = require('../package.json');

console.log(`WebSocket-Test-Server v${version} by TrueWinter`);
yargs(hideBin(process.argv))
	.command('$0', 'Run WebSocket-Test-Server',
	// builder function is not used
	// eslint-disable-next-line no-empty-function
		() => {},
		(args) => {
			run(args);
		})
	.options({
		config: {
			description: 'Path to config file',
			type: 'string',
			nargs: 1,
			demandOption: true
		},
		open: {
			description: 'Automatically open the dashboard in a browser',
			type: 'boolean'
		}
	}).parse();

function run(args) {
	let configFile = args.config;

	if (!fs.existsSync(configFile)) {
		console.error('Config file does not exist');
		process.exit(1);
	}

	if (!path.isAbsolute(configFile)) {
		configFile = path.join(__dirname, configFile);
	}

	process.env.CONFIG_FILE = configFile;

	if (args.open) {
		process.env.OPEN_BROWSER = true;
	}

	process.env.INSTALL_DIR = require.resolve('../index.js').replace(/index\.js$/, '');

	try {
		require('../index.js');
	} catch (err) {
		console.log(err.message);
	}
}