/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import dotenv from 'dotenv';
import { resolve as resolvePath } from 'path';
import App from './app';
import PianoReceiver from './receiver'

/* eslint-disable no-console */
process.on('uncaughtException', err => console.log('uncaughtException', err));
process.on('unhandledRejection', reason => console.log('unhandledRejection', reason));
/* eslint-enable no-console */

// Read .env if file exists
dotenv.config();

// Start listening for connections, and serve static files
const server = new MRE.WebHost({
	//baseUrl: 'http://altspace-theremin.azurewebsites.net',
	//baseUrl: 'http://altspace-theremin.ngrok.io',
	baseUrl: 'http://45.55.43.77',
	port: process.env.PORT,
	baseDir: resolvePath(__dirname, '../public')
});

const ourReceiver: PianoReceiver = new PianoReceiver();

// Handle new application sessions
server.adapter.onConnection(context => new App(context, server.baseUrl, ourReceiver));


