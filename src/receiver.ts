/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import WebSocket from 'ws';

export interface RCallback {
	(note: number, vel: number): void;
}

export class PianoReceiver {
	public ourCallbacks: RCallback[] = [];
	private wss: WebSocket.Server

	public addReceiver(callback: RCallback){
		MRE.log.info("app", "adding receiver callback");
		this.ourCallbacks.push(callback);
		MRE.log.info("app", "size of callback array now: " + this.ourCallbacks.length);
	}

	public removeReceiver(callback: RCallback){
		MRE.log.info("app", "attempting to remove receiver callback");

		const index=this.ourCallbacks.indexOf(callback);
		if(index>-1){
			this.ourCallbacks.splice(index, 1);
		}
		MRE.log.info("app", "size of callback array now: " + this.ourCallbacks.length);

	}

	constructor() {
		this.wss = new WebSocket.Server({ port: 3902 });

		this.wss.on('connection', (ws: WebSocket) => {
			MRE.log.info("app", 'remote midi keyboard has connected!');

			ws.on('message', (message: string) => {
				//MRE.log.info("app", 'received from client: %s', message);
				const messageArray: number[] = JSON.parse(message);

				const note = messageArray[0];
				const vel = messageArray[1];

				//MRE.log.info("app", "note: " + note);
				//MRE.log.info("app", "vel:" + vel);

				for(const singleCallback of this.ourCallbacks){ //broadcast to all listeners
					if(singleCallback){
						singleCallback(note, vel);
					}					
				}
			});
		});
	}
}
