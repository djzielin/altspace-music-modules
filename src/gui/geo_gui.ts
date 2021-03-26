/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import App from '../app';
import Geo from '../geo';

import Button from './button';
import GuiPanel from './gui_panel';

export default class GeoGui extends GuiPanel{
	private resetButton: Button=null;
	private sharpsButton: Button=null;
	public sendButton: Button=null;
	public receiveButton: Button=null;

	constructor(protected ourApp: App, private ourGeo: Geo) {
		super(ourApp);
		this.ourModule=ourGeo; //TODO: pass this through super constructor?
	}

	public setAuthAllUsers(b: boolean): void {
		this.ourGeo.ourInteractionAuth = (b === true) ? 1 : 0;
	}

	public sendMidiPatcher(b: boolean){
		this.ourApp.ourPatcher.patcherClickEvent(this.ourGeo,"midi",true,this,this.sendButton);
	}

	/*public recvMidiPatch(b: boolean){
		this.ourApp.ourPatcher.patcherClickEvent(this.ourPiano,"midi",false,this,this.receiveButton);
	}*/

	public grabRelease(){
		this.ourApp.ourPatcher.updatePatchLines(this);
	}
	
	public async createAsync(pos: MRE.Vector3, name: string) {
		this.ourApp.ourConsole.logMessage("creating geo gui");

		await this.createBackground(pos, name, 1.5);

		let zPos=this.backgroundHeight * 0.5 - 0.3;

		const authButton = new Button(this.ourApp);
		await authButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "All Users", "Auth Only",
			this.ourGeo.ourInteractionAuth === 1, this.setAuthAllUsers.bind(this));
		zPos -= 0.15;

		/*this.receiveButton = new Button(this.ourApp);
		await this.receiveButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "RECV MIDI", "RECV MIDI",
			true, this.recvMidiPatch.bind(this));
		zPos -= 0.15;*/

		this.sendButton = new Button(this.ourApp);
		await this.sendButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "SEND MIDI", "SEND MIDI",
			true, this.sendMidiPatcher.bind(this));
		zPos -= 0.15;

		this.guiGrabber.setGrabReleaseCallback(this.grabRelease.bind(this));

	}	
}
