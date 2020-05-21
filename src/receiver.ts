/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import WebSocket from 'ws';

interface RCallback {
	(note: number, vel: number): void;
}

export default class PianoReceiver {
	public ourCallback: RCallback = null;
	private wss: WebSocket.Server

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

				if (this.ourCallback) {
					this.ourCallback(note, vel);
				}
			});
		});
	}
}
