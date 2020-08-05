/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import PlusMinus from './plusminus';
import Button from './button';
import Staff from './staff';
import GuiPanel from './gui_panel';

export default class StaffGui extends GuiPanel {

	constructor(protected ourApp: App, private ourStaff: Staff) {
		super(ourApp);
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

	public showBackground(b: boolean){
		this.ourStaff.showBackground=b;

		this.ourStaff.staffBackground.appearance.enabled=b;
	}

	public setStaffDrawThreshold(n: number){
		this.ourStaff.drawThreshold=n;
	}

	public setStaffAudioDistance(n: number){
		this.ourStaff.audioRange=n;
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
	}
}
