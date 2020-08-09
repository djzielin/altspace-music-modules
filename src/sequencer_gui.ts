/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import PlusMinus from './plusminus';
import Button from './button';
import GuiPanel from './gui_panel';
import ButtonMulti from './button_multi';
import Sequencer from './sequencer';

export default class SequencerGui extends GuiPanel{
	private resetButton: Button=null;
	private sharpsButton: Button=null;
	public sendButton: Button=null;

	constructor(protected ourApp: App, private ourSequencer: Sequencer) {
		super(ourApp);
	}

	public setAuthAllUsers(b: boolean): void {
		this.ourSequencer.ourInteractionAuth = (b === true) ? 1 : 0;
	}
	
	/*public setScale(n: number): void {
		this.ourPiano.setScale(n);
	}
	public setLowestKey(n: number): void {
		this.ourPiano.keyLowest = n;
	}
	public setHighestKey(n: number): void {
		this.ourPiano.keyHighest = n;
	}
	public setAudioRange(n: number): void {
		this.ourPiano.audioRange = n;
	}*/

	public sendMidiPatcher(b: boolean){
		this.ourApp.patcherClickEvent(this.ourSequencer,"midi",true,this,this.sendButton);
	}
	
	public grabRelease(){
		this.ourApp.updatePatchLines(this);
	}

	public async createAsync(pos: MRE.Vector3, name: string) {
		this.ourApp.ourConsole.logMessage("creating sequencer gui");

		await this.createBackground(pos, name, 1.5);

		let zPos=this.backgroundHeight * 0.5 - 0.3;

		const authButton = new Button(this.ourApp);
		await authButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "All Users", "Auth Only",
			this.ourSequencer.ourInteractionAuth === 1, this.setAuthAllUsers.bind(this));
		zPos -= 0.15;

		/*const scaleSelector = new PlusMinus(this.ourApp);
		await scaleSelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "scale",
			this.ourPiano.pianoScale, 0.1, this.setScale.bind(this));
		zPos -= 0.15;

		const lowestKeySelector = new PlusMinus(this.ourApp);
		await lowestKeySelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "L key",
			this.ourPiano.keyLowest, 1, this.setLowestKey.bind(this));
		zPos -= 0.15;

		const highestKeySelector = new PlusMinus(this.ourApp);
		await highestKeySelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "H key",
			this.ourPiano.keyHighest, 1, this.setHighestKey.bind(this));
		zPos -= 0.15;

		const noteLabels: string[]=["Names Off","Letter Names","Solfege"];
		const noteNamesButton = new ButtonMulti(this.ourApp);
		await noteNamesButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, noteLabels ,
			this.ourPiano.noteNameMode, this.setNoteNames.bind(this));
		zPos -= 0.15;*/

		this.sendButton = new Button(this.ourApp);
		await this.sendButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "SEND MIDI", "SEND MIDI",
			true, this.sendMidiPatcher.bind(this));
		this.sendButton.doVisualUpdates=false;
		zPos -= 0.15;

		this.guiGrabber.setGrabReleaseCallback(this.grabRelease.bind(this));

	}	
}
