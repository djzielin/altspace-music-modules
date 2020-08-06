/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import PlusMinus from './plusminus';
import Button from './button';
import Piano from './piano';
import GuiPanel from './gui_panel';

export default class PianoGui extends GuiPanel{
	private resetButton: Button=null;
	private sharpsButton: Button=null;

	constructor(protected ourApp: App, private ourPiano: Piano) {
		super(ourApp);
	}

	public setAuthAllUsers(b: boolean): void {
		this.ourPiano.ourInteractionAuth = (b === true) ? 1 : 0;
	}

	public setShowNoteNames(b: boolean): void {
		this.ourPiano.showNoteNames=b;
	}
	public setDoSharps(b: boolean): void {
		this.ourPiano.doSharps=b;
	}

	public setShowIntervals(b: boolean): void {
		this.ourPiano.showIntervals=b;
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

	public doReset(b: boolean): void {
		const pos = this.ourPiano.pianoGrabber.getPos();
		const rot = this.ourPiano.pianoGrabber.getRot();

		this.ourPiano.destroyKeys();
		this.ourPiano.createAllKeys(pos, rot).then(() => {
			this.ourApp.ourConsole.logMessage("piano reset complete!");
			this.resetButton.setValue(false);
		});
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

		this.resetButton = new Button(this.ourApp);
		await this.resetButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "Relayout", "Relayout",
			false, this.doReset.bind(this));
		zPos -= 0.15;

		const scaleSelector = new PlusMinus(this.ourApp);
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

		const showNames = new Button(this.ourApp);
		await showNames.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "Names On", "Names Off",
			this.ourPiano.showNoteNames, this.setShowNoteNames.bind(this));
		zPos -= 0.15;

		this.sharpsButton = new Button(this.ourApp);
		await this.sharpsButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "Sharps", "Flats",
			this.ourPiano.doSharps, this.setDoSharps.bind(this));
		zPos -= 0.15;

		const intervalButton = new Button(this.ourApp);
		await intervalButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "Intervals", "No Interval",
			this.ourPiano.showIntervals, this.setShowIntervals.bind(this));
		zPos -= 0.15;
		
	}

	public removeSharpsButton(){
		if(this.sharpsButton){
			this.sharpsButton.destroy();
		}
	}
}
