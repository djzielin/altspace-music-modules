/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import App from '../app';
import Piano from '../piano';

import PlusMinus from './plusminus';
import Button from './button';
import GuiPanel from './gui_panel';
import ButtonMulti from './button_multi';

export default class PianoGui extends GuiPanel{
	private resetButton: Button=null;
	private sharpsButton: Button=null;
	public sendButton: Button=null;
	public receiveButton: Button=null;

	constructor(protected ourApp: App, private ourPiano: Piano) {
		super(ourApp);
		this.ourModule=ourPiano;
	}

	public setAuthAllUsers(b: boolean): void {
		this.ourPiano.ourInteractionAuth = (b === true) ? 1 : 0;
	}
	
	public setDoSharps(b: boolean): void {
		this.ourPiano.doSharps=b;
	}

	public setIntervals(n: number): void {
		this.ourPiano.intervalMode=n;
	}

	public setNoteNames(n: number): void {
		this.ourPiano.noteNameMode=n;
	}

	public setScale(n: number): void {
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
	}

	public sendMidiPatcher(b: boolean){
		this.ourApp.ourPatcher.patcherClickEvent(this.ourPiano,"midi",true,this,this.sendButton);
	}

	public recvMidiPatch(b: boolean){
		this.ourApp.ourPatcher.patcherClickEvent(this.ourPiano,"midi",false,this,this.receiveButton);
	}

	public grabRelease(){
		this.ourApp.ourPatcher.updatePatchLines(this);
	}
	
	public doReset(b: boolean): void {
		const pos = this.ourPiano.ourGrabber.getPos();
		const rot = this.ourPiano.ourGrabber.getRot();

		/*this.ourPiano.destroyKeys();
		this.ourPiano.createAllKeys(pos, rot).then(() => {
			this.ourApp.ourConsole.logMessage("piano reset complete!");
			this.resetButton.setValue(false);
		});*/
	}

	public async createAsync(pos: MRE.Vector3, name: string) {
		this.ourApp.ourConsole.logMessage("creating piano gui");

		await this.createBackground(pos, name, 1.5);

		let zPos=this.backgroundHeight * 0.5 - 0.3;

		const authButton = new Button(this.ourApp);
		await authButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "All Users", "Auth Only",
			this.ourPiano.ourInteractionAuth === 1, this.setAuthAllUsers.bind(this));
		zPos -= 0.15;

		/*this.resetButton = new Button(this.ourApp);
		await this.resetButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "Relayout", "Relayout",
			false, this.doReset.bind(this));
		zPos -= 0.15;
*/

		const scaleSelector = new PlusMinus(this.ourApp);
		await scaleSelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "scale",
			this.ourPiano.pianoScale, 0.1, this.setScale.bind(this));
		zPos -= 0.15;

		/*const lowestKeySelector = new PlusMinus(this.ourApp);
		await lowestKeySelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "L key",
			this.ourPiano.keyLowest, 1, this.setLowestKey.bind(this));
		zPos -= 0.15;

		const highestKeySelector = new PlusMinus(this.ourApp);
		await highestKeySelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "H key",
			this.ourPiano.keyHighest, 1, this.setHighestKey.bind(this));
		zPos -= 0.15;
		*/

		const noteLabels: string[]=["Names Off","Letter Names","Solfege"];
		const noteNamesButton = new ButtonMulti(this.ourApp);
		await noteNamesButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, noteLabels ,
			this.ourPiano.noteNameMode, this.setNoteNames.bind(this));
		zPos -= 0.15;

		this.sharpsButton = new Button(this.ourApp);
		await this.sharpsButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "Sharps", "Flats",
			this.ourPiano.doSharps, this.setDoSharps.bind(this));
		zPos -= 0.15;

		const intervalLabels: string[]=["no intervals","western int","jazz int","num int"];
		const intervalButton = new ButtonMulti(this.ourApp);
		await intervalButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, intervalLabels ,
			this.ourPiano.intervalMode, this.setIntervals.bind(this));
		zPos -= 0.15;			

		this.receiveButton = new Button(this.ourApp);
		await this.receiveButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "RECV MIDI", "RECV MIDI",
			true, this.recvMidiPatch.bind(this));
		zPos -= 0.15;

		this.sendButton = new Button(this.ourApp);
		await this.sendButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "SEND MIDI", "SEND MIDI",
			true, this.sendMidiPatcher.bind(this));
		zPos -= 0.15;

		this.guiGrabber.setGrabReleaseCallback(this.grabRelease.bind(this));

	}	

	public removeSharpsButton(){
		if(this.sharpsButton){
			this.sharpsButton.destroy();
		}
	}
}
