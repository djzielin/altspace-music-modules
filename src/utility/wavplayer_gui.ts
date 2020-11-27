/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from '../app';
import PlusMinus from '../plusminus';
import Button from '../button';
import GuiPanel from '../gui_panel';
import WavPlayer from './wavplayer';
import ButtonMulti from '../button_multi';

export default class WavPlayerGui extends GuiPanel{
	private resetButton: Button=null;
	public receiveButton: Button=null;

	constructor(protected ourApp: App, private ourWavPlayer: WavPlayer) {
		super(ourApp);
	}

	public polyphonyLimit=10;
	public volume=0.75;
	public cullTime = 5000;
	public doPedal = true;

	public setPolyphony(n: number): void {
		this.ourWavPlayer.polyphonyLimit = n;
	}

	public setIntonationBase(n: number): void {

		this.ourWavPlayer.intonationBase = n;
	}

	public setIntonation(n: number): void {
		this.ourWavPlayer.intonation = n;
	}

	public setVolume(n: number): void {
		this.ourWavPlayer.volume=n;
	}
	public setCullTime(n: number): void {
		this.ourWavPlayer.cullTime=n*1000; //convert to ms
	}

	public setAudioRange(n: number): void {
		this.ourWavPlayer.audioRange=n;
	}

	public setDoPedal(b: boolean): void {
		this.ourWavPlayer.doPedal=b;
	}

	public recvMidiPatch(b: boolean){
		this.ourApp.ourPatcher.patcherClickEvent(this.ourWavPlayer,"midi",false,this,this.receiveButton);
	}

	public grabRelease(){
		this.ourApp.ourPatcher.updatePatchLines(this);
	}

	public async createAsync(pos: MRE.Vector3, name: string) {
		this.ourApp.ourConsole.logMessage("creating wav player gui");

		await this.createBackground(pos, name, 1.5);

		let zPos=this.backgroundHeight * 0.5 - 0.3;

		const pedalButton = new Button(this.ourApp);
		await pedalButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "do Pedal", "no Pedal",
			this.ourWavPlayer.doPedal, this.setDoPedal.bind(this));
		zPos -= 0.15;

		const polyPlusMinus = new PlusMinus(this.ourApp);
		await polyPlusMinus.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "poly",
			this.ourWavPlayer.polyphonyLimit, 1.0, this.setPolyphony.bind(this));
		zPos -= 0.15;

		const volumePlusMinus = new PlusMinus(this.ourApp);
		await volumePlusMinus.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "vol",
			this.ourWavPlayer.volume, 0.05, this.setVolume.bind(this));
		zPos -= 0.15;

		const cullPlusMinus = new PlusMinus(this.ourApp);
		await cullPlusMinus.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "cull t",
			this.ourWavPlayer.cullTime*0.001, 1.0, this.setCullTime.bind(this));
		zPos -= 0.15;		

		const audDist = new PlusMinus(this.ourApp);
		await audDist.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "aud m",
			this.ourWavPlayer.audioRange, 1.0, this.setAudioRange.bind(this));
		zPos -= 0.15;

		const intonateLabels: string[]=["eq temp","ptolemy 5L","pythag 3L","7limit"];
		const intonateButton = new ButtonMulti(this.ourApp);
		await intonateButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, intonateLabels ,
			this.ourWavPlayer.intonation, this.setIntonation.bind(this));
		zPos -= 0.15;		
		
		const pitchPlusMinus = new PlusMinus(this.ourApp);
		await pitchPlusMinus.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "pitch",
			this.ourWavPlayer.intonationBase, 1.0, this.setIntonationBase.bind(this));
		zPos -= 0.15;

		this.receiveButton = new Button(this.ourApp);
		await this.receiveButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "RECV MIDI", "RECV MIDI",
			true, this.recvMidiPatch.bind(this));
		zPos -= 0.15;

		this.guiGrabber.setGrabReleaseCallback(this.grabRelease.bind(this));
	}
}
