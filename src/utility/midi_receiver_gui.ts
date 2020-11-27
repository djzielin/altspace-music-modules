/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from '../app';
import PlusMinus from '../plusminus';
import Button from '../button';
import GuiPanel from '../gui_panel';
import MidiReceiver from './midi_receiver';

export default class MidiReceiverGui extends GuiPanel{

	public sendButton: Button=null;
	public receiveButton: Button=null;

	constructor(protected ourApp: App, private ourMidiReceiver: MidiReceiver) {
		super(ourApp);
	}	

	public sendMidiPatcher(b: boolean){
		this.ourApp.ourPatcher.patcherClickEvent(this.ourMidiReceiver,"midi",true,this,this.sendButton);
	}	

	public grabRelease(){ 
		this.ourApp.ourPatcher.updatePatchLines(this);
	}

	public setPort(n: number): void {
		this.ourMidiReceiver.port = n;
		this.ourMidiReceiver.createServer();
	}

	public async createAsync(pos: MRE.Vector3, name: string) {
		this.ourApp.ourConsole.logMessage("creating midi receiver gui");

		await this.createBackground(pos, name, 1.5);

		let zPos=this.backgroundHeight * 0.5 - 0.3;

		const portSelector = new PlusMinus(this.ourApp);
		await portSelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "Port",
			this.ourMidiReceiver.port, 1.0, this.setPort.bind(this));
		zPos -= 0.15;

		
		this.sendButton = new Button(this.ourApp);
		await this.sendButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "SEND MIDI", "SEND MIDI",
			true, this.sendMidiPatcher.bind(this));
		zPos -= 0.15;

		this.guiGrabber.setGrabReleaseCallback(this.grabRelease.bind(this));
	}
}
