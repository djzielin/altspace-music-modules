/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import PlusMinus from './plusminus';
import Button from './button';
import Staff from './staff';
import GuiPanel from './gui_panel';

export default class StaffGui extends GuiPanel {
	public receiveButton: Button = null;
	public sendButton: Button=null;

	constructor(protected ourApp: App, private ourStaff: Staff) {
		super(ourApp);
		this.ourModule=ourStaff;
	}	

	public setAuthAllUsers(b: boolean): void {
		this.ourStaff.ourInteractionAuth=(b===true) ? 1:0;
	}

	public setDoSharps(b: boolean){
		this.ourStaff.doSharps=b;
	}

	public setDoOffset(b: boolean){
		this.ourStaff.doTypesetOffset=b;
	}
	
	public setStaffTime(n: number){
		this.ourStaff.staffTime=n;
	}
	
	public setStaffHeight(n: number){
		this.ourStaff.staffHeight=n;
		this.ourStaff.updateStaffHeight();
	}

	public setStaffWidth(n: number){
		this.ourStaff.staffWidth=n;
		this.ourStaff.updateStaffWidth();
	}

	public setShowClear(b: boolean) {
		if (b) {
			this.ourStaff.clearButton.show();
		} else {
			this.ourStaff.clearButton.hide();
		}
	}

	public showBackground(b: boolean) {
		this.ourStaff.showBackground=b;

		this.ourStaff.staffBackground.appearance.enabled=b;
	}

	public setStaffDrawThreshold(n: number){
		this.ourStaff.drawThreshold=n;
	}

	public setStaffAudioDistance(n: number){
		this.ourStaff.audioRange=n;
	}

	public sendMidiPatcher(b: boolean){
		this.ourApp.ourPatcher.patcherClickEvent(this.ourStaff,"midi",true,this,this.sendButton);
	}

	public recvMidiPatch(b: boolean){
		this.ourApp.ourPatcher.patcherClickEvent(this.ourStaff,"midi",false,this,this.receiveButton);
	}

	public grabRelease(){
		this.ourApp.ourPatcher.updatePatchLines(this);
	}

	public async createAsync(pos: MRE.Vector3, name: string) {
		this.ourApp.ourConsole.logMessage("creating staff gui");

		await this.createBackground(pos, name, 1.75);

		let zPos = this.backgroundHeight * 0.5 - 0.3;

		const authButton = new Button(this.ourApp);
		await authButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "All Users", "Auth Only",
			this.ourStaff.ourInteractionAuth === 1, this.setAuthAllUsers.bind(this));
		zPos -= 0.15;

		const sharpButton = new Button(this.ourApp);
		await sharpButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "sharps", "flats",
			this.ourStaff.doSharps, this.setDoSharps.bind(this));
		zPos -= 0.15;

		const clearButton = new Button(this.ourApp);
		await clearButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "clear avail", "no clear",
			this.ourStaff.showClear, this.setShowClear.bind(this));
		zPos -= 0.15;

		const backgroundVis = new Button(this.ourApp);
		await backgroundVis.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "bg white", "bg clear",
			this.ourStaff.showBackground, this.showBackground.bind(this));
		zPos -= 0.15;

		const typesetOffset = new Button(this.ourApp);
		await typesetOffset.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "near offset", "no offset",
			this.ourStaff.doTypesetOffset, this.setDoOffset.bind(this));
		zPos -= 0.15;

		const widthSelector = new PlusMinus(this.ourApp);
		await widthSelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "width",
			this.ourStaff.staffWidth, 0.1, this.setStaffWidth.bind(this));
		zPos -= 0.15;

		const heightSelector = new PlusMinus(this.ourApp);
		await heightSelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "height",
			this.ourStaff.staffHeight, 0.1, this.setStaffHeight.bind(this));
		zPos -= 0.15;

		const staffTime = new PlusMinus(this.ourApp);
		await staffTime.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "time",
			this.ourStaff.staffTime, 1.0, this.setStaffTime.bind(this));
		zPos -= 0.15;

		const drawDist = new PlusMinus(this.ourApp);
		await drawDist.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "pen",
			this.ourStaff.drawThreshold, 0.01, this.setStaffDrawThreshold.bind(this));
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
}
