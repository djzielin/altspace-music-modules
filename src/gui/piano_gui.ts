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
	public highestKeySelector: PlusMinus=null;
	public lowestKeySelector: PlusMinus=null;
	public twelveToneButton: Button=null;

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

	public setSize(n: number): void {
		this.ourPiano.setSize(n);
	}
	public setLowestKey(n: number): void {
		this.ourPiano.setKeyLowest(n).then( ()=> {
			this.ourApp.ourConsole.logMessage("low key adjustment complete");
		});
	}
	public setHighestKey(n: number): void {
		this.ourPiano.setKeyHighest(n).then( ()=> {
			this.ourApp.ourConsole.logMessage("high key adjustment complete");
		});
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

	public setTwelveTone(b: boolean){
		this.ourPiano.isTwelveTone=b;

		if(b){
			this.ourPiano.setTwelveTone().then( ()=> {
				this.ourApp.ourConsole.logMessage("conversion complete!");

				this.highestKeySelector.setValue(this.ourPiano.keyHighest);
				this.lowestKeySelector.setValue(this.ourPiano.keyLowest);

				this.highestKeySelector.setChangeAmount(1.0);
				this.lowestKeySelector.setChangeAmount(1.0);

			});
		} else{
			this.ourPiano.setTwentyFourTone().then( ()=> {
				this.ourApp.ourConsole.logMessage("conversion complete!");

				this.highestKeySelector.setChangeAmount(0.5);
				this.lowestKeySelector.setChangeAmount(0.5);
			});
		}
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

		const scaleSelector = new PlusMinus(this.ourApp);
		await scaleSelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "Size",
			this.ourPiano.pianoScale, 0.1, this.setSize.bind(this));
		zPos -= 0.15;

		let keyIncAmount=1.0;
		if(this.ourPiano.isTwelveTone===false){
			keyIncAmount=0.5;
		}

		this.lowestKeySelector = new PlusMinus(this.ourApp);
		await this.lowestKeySelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "Low",
			this.ourPiano.keyLowest, keyIncAmount, this.setLowestKey.bind(this));
		zPos -= 0.15;

		this.highestKeySelector = new PlusMinus(this.ourApp);
		await this.highestKeySelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "High",
			this.ourPiano.keyHighest, keyIncAmount, this.setHighestKey.bind(this));
		zPos -= 0.15;

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

		this.twelveToneButton = new Button(this.ourApp);
		await this.twelveToneButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "12 tone", "24 tone",
			this.ourPiano.isTwelveTone, this.setTwelveTone.bind(this));
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
