/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import dotenv from 'dotenv';
import { resolve as resolvePath } from 'path';
import App from './app';
import {PianoReceiver} from './receiver'
import OscSender from './sender';

/* eslint-disable no-console */
process.on('uncaughtException', err => console.log('uncaughtException', err));
process.on('unhandledRejection', reason => console.log('unhandledRejection', reason));
/* eslint-enable no-console */

// Read .env if file exists
dotenv.config();

// Start listening for connections, and serve static files
const server = new MRE.WebHost({
	//baseUrl: 'http://altspace-theremin.ngrok.io',
	//baseUrl: 'http://altspace-music-modules.azurewebsites.net',

	baseUrl: 'http://45.55.43.77',
	port: process.env.PORT,
	baseDir: resolvePath(__dirname, '../public')
});

const ourReceiver: PianoReceiver = new PianoReceiver();
const ourSender: OscSender = new OscSender();

//const ourReceiver: PianoReceiver=null;
//const ourSender: OscSender=null;
// Handle new application sessions
server.adapter.onConnection(context => {
	//const sessionId=context.sessionId;
	//const session=(server.adapter as MRE.MultipeerAdapter).sessions[sessionId];
	
	MRE.log.info("app", "about the create new App in server.ts");
	return new App(context, server.baseUrl, server.baseDir, ourReceiver, ourSender);
});


