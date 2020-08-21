/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import WebSocket from 'ws';

export interface RCallback {
	(note: number, vel: number, channel: number): void;
}

export class PianoReceiver {
	public ourCallbacks: RCallback[] = [];
	private wss: WebSocket.Server

	private lastNote=0;
	private lastVel=0;
	private lastChannel=0;
	private lastTime=0;

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

	constructor(port: number) {
		this.wss = new WebSocket.Server({ port: port });

		this.wss.on('connection', (ws: WebSocket) => {
			MRE.log.info("app", 'remote midi keyboard has connected!');

			ws.on('message', (message: string) => {
				//MRE.log.info("app", 'received from client: %s', message);
				const messageArray: number[] = JSON.parse(message);

				const note = messageArray[0];
				const vel = messageArray[1];
				let channel = 0;

				if (messageArray.length > 2) {
					channel = messageArray[2];
				}

				const currentTime = Date.now();
				const timeDiff = currentTime - this.lastTime;

				if (note === this.lastNote && channel === this.lastChannel && timeDiff < 150 && vel >0) {
					MRE.log.info("app", "rejected! too close: " + timeDiff);
				}else{
					for (const singleCallback of this.ourCallbacks) { //broadcast to all listeners
						if (singleCallback) {
							singleCallback(note, vel, channel);
						}
					}
				}
				if (vel > 0) {
					this.lastNote = note;
					this.lastVel = vel;
					this.lastChannel = channel;
					this.lastTime = currentTime;
				}
			});
		});
	}
}
