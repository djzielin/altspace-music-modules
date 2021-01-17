/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import App from '../app';
import MidiPlayer from '../utility/midi_player';

import PlusMinus from './plusminus';
import Button from './button';
import GuiPanel from './gui_panel';

export default class MidiPlayerGui extends GuiPanel{
	public sendButton: Button=null;
	public receiveButton: Button=null;

	constructor(protected ourApp: App, private ourMidiPlayer: MidiPlayer) {
		super(ourApp);
		this.ourModule=ourMidiPlayer;
	}	

	public sendMidiPatcher(b: boolean){
		this.ourApp.ourPatcher.patcherClickEvent(this.ourMidiPlayer,"midi",true,this,this.sendButton);
	}	

	public grabRelease(){ 
		this.ourApp.ourPatcher.updatePatchLines(this);
	}

	public setTempo(n: number): void {
		this.ourMidiPlayer.setTempo(n);
	}

	public async createAsync(pos: MRE.Vector3, name: string) {
		this.ourApp.ourConsole.logMessage("creating midi player gui");

		await this.createBackground(pos, name, 1.5);

		let zPos=this.backgroundHeight * 0.5 - 0.3;

		const portSelector = new PlusMinus(this.ourApp);
		await portSelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "Tempo",
			120, 1.0, this.setTempo.bind(this));
		zPos -= 0.15;

		
		this.sendButton = new Button(this.ourApp);
		await this.sendButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "SEND MIDI", "SEND MIDI",
			true, this.sendMidiPatcher.bind(this));
		zPos -= 0.15;

		this.guiGrabber.setGrabReleaseCallback(this.grabRelease.bind(this));
	}
}
