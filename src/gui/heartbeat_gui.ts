/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import App from '../app';
import HeartBeat from '../utility_modules/heartbeat';

import PlusMinus from './plusminus';
import Button from './button';
import GuiPanel from './gui_panel';

export default class HeartBeatGui extends GuiPanel{
	private resetButton: Button=null;
	public sendButton: Button=null;
	private numBeatsPlusMinus: PlusMinus=null;

	constructor(protected ourApp: App, private ourHeartBeat: HeartBeat) {
		super(ourApp);
		this.ourModule=ourHeartBeat;
	}

	public volume=0.75;
	public cullTime=5000;
	public doPedal=true;

	public setBPM(n: number): void {
		this.ourHeartBeat.setBPM(n);
	}

	/*public setNumBeats(n: number): void {
		let beats=n;

		if(beats<1){
			beats=1;
			this.numBeatsPlusMinus.setValue(beats);
		}

		this.ourHeartBeat.numBeats=beats;
	}*/

	public setPlaying(b: boolean): void {
		//this.ourHeartBeat.isPlaying=b; //do this is we want to pause/unpause

		if(b){
			this.ourHeartBeat.start();
		} else{
			this.ourHeartBeat.stop();
		}
	}

	public recvHeartPatch(b: boolean){
		this.ourApp.ourPatcher.patcherClickEvent(this.ourHeartBeat,"heartbeat",true,this,this.sendButton);
	}

	public grabRelease(){
		this.ourApp.ourPatcher.updatePatchLines(this);
	}

	public async createAsync(pos: MRE.Vector3, name: string) {
		this.ourApp.ourConsole.logMessage("creating heartbeat gui");

		await this.createBackground(pos, name, 1.5);

		let zPos=this.backgroundHeight * 0.5 - 0.3;

		const playingButton = new Button(this.ourApp);
		await playingButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "playing", "stopped",
			this.ourHeartBeat.isPlaying, this.setPlaying.bind(this));
		zPos -= 0.15;

		const bpmPlusMinus = new PlusMinus(this.ourApp);
		await bpmPlusMinus.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "BPM",
			this.ourHeartBeat.bpm, 5.0, this.setBPM.bind(this));
		zPos -= 0.15;

		/*this.numBeatsPlusMinus = new PlusMinus(this.ourApp);
		await this.numBeatsPlusMinus.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "BPM",
			this.ourHeartBeat.numBeats, 1.0, this.setNumBeats.bind(this));
		zPos -= 0.15;	*/	

		this.sendButton = new Button(this.ourApp);
		await this.sendButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "SEND HBEAT", "SEND HBEAT",
			true, this.recvHeartPatch.bind(this));
		zPos -= 0.15;

		this.guiGrabber.setGrabReleaseCallback(this.grabRelease.bind(this));
	}
}
