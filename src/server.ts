/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import dotenv from 'dotenv';
import { resolve as resolvePath } from 'path';
import App from './app';
import {PianoReceiver} from './receiver'
//import OscSender from './sender';
//import { argv } from 'process';

/* eslint-disable no-console */
process.on('uncaughtException', err => console.log('uncaughtException', err));
process.on('unhandledRejection', reason => console.log('unhandledRejection', reason));
/* eslint-enable no-console */

// Read .env if file exists
dotenv.config();

//command line args
let port=process.env.PORT;
let midiPort=3902; 
let instrumentType="piano";

if(process.argv.length>2){
	port=process.argv[2];
	MRE.log.info("app", "setting port to: " + port);
}

if(process.argv.length>3){
	midiPort=Number(process.argv[3]);
	MRE.log.info("app", "setting midi port to: " + port);
}

if(process.argv.length>4){
	instrumentType=process.argv[4];
	MRE.log.info("app", "setting instrument to: " + instrumentType);
}

// Start listening for connections, and serve static files
const server = new MRE.WebHost({
	//baseUrl: 'http://altspace-theremin.ngrok.io',
	//baseUrl: 'http://altspace-music-modules.azurewebsites.net',
	//baseUrl: 'http://45.55.43.77',
	baseUrl: 'http://199.19.73.131:'+port.toString(),
	port: port,
	baseDir: resolvePath(__dirname, '../public')
});

const ourReceiver: PianoReceiver = new PianoReceiver(midiPort);
//const ourSender: OscSender = new OscSender();

//const ourReceiver: PianoReceiver=null;
//const ourSender: OscSender=null;
// Handle new application sessions
server.adapter.onConnection(context => {
	//const sessionId=context.sessionId;
	//const session=(server.adapter as MRE.MultipeerAdapter).sessions[sessionId];
	
	MRE.log.info("app", "about the create new App in server.ts");
	MRE.log.info("app","arguements passed in: " + process.argv)
	return new App(context, server.baseUrl, server.baseDir, ourReceiver, instrumentType);
});


