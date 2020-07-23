/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import PlusMinus from './plusminus';
import Button from './button';
import Staff from './staff';
import GrabButton from './grabbutton';

export default class StaffGui {
	//private guiParent: MRE.Actor=null;
	private guiBackground: MRE.Actor=null;
	private guiGrabber: GrabButton=null;
	private resetButton: Button;

	constructor(private ourApp: App, private ourStaff: Staff) {
		
	}

	private async createBackground(pos: MRE.Vector3, name: string) {

		this.guiGrabber=new GrabButton(this.ourApp);
		this.guiGrabber.create(pos);

		const backGroundMesh = this.ourApp.assets.createBoxMesh('boxMesh', 1.1, 0.1, 1.5);


		this.guiBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiGrabber.getGUID(),
				name: "consoleBackground",
				appearance: {
					meshId: backGroundMesh.id,
					materialId: this.ourApp.grayMat.id
				},
				transform: {
					local: {
						position: { x: -0.85, y: 0.0, z: -0.25 },
					}
				}
			}
		});
		await this.guiBackground.created();

		const guiTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground.id,
				name: 'consoleText',
				text: {
					contents: name,
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0, 0.051, 0.7),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await guiTextActor.created();
	}

	public setAuthAllUsers(b: boolean): void {
		this.ourStaff.ourInteractionAuth=(b===true) ? 1:0;
	}

	public setScale(n: number): void {
		if(n>0){ //sanity check
			//this.ourPiano.setScale(n);
		}
	}
	public setDoSharps(b: boolean){
		this.ourStaff.doSharps=b;
	}
	
	public setStaffTime(n: number){
		this.ourStaff.staffTime=n;
	}
	
	public setStaffHeight(n: number){
		this.ourStaff.spawnerHeight=n;
		this.ourStaff.updateStaffHeight();
	}

	public setStaffWidth(n: number){
		this.ourStaff.spawnerWidth=n;
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

		await this.createBackground(pos, name);

		let zPos=0.45;

		const authButton = new Button(this.ourApp);
		await authButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
		this.guiBackground.id, "All Users", "Auth Only",
			this.ourStaff.ourInteractionAuth === 1, this.setAuthAllUsers.bind(this));
		zPos-=0.15;

		const sharpButton = new Button(this.ourApp);
		await sharpButton.createAsync(new MRE.Vector3(0, 0.025,zPos),
		this.guiBackground.id, "sharps", "flats",
			this.ourStaff.doSharps, this.setDoSharps.bind(this));
		zPos-=0.15;

		const backgroundVis = new Button(this.ourApp);
		await backgroundVis.createAsync(new MRE.Vector3(0,  0.025, zPos),
		this.guiBackground.id, "bg white", "bg clear",
			this.ourStaff.showBackground, this.showBackground.bind(this));
		zPos-=0.15;

		const widthSelector = new PlusMinus(this.ourApp);
		await widthSelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
		this.guiBackground.id, "width",
			this.ourStaff.spawnerWidth, 0.1, this.setStaffWidth.bind(this));
		zPos-=0.15;

		const heightSelector = new PlusMinus(this.ourApp);
		await heightSelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
		this.guiBackground.id, "height",
			this.ourStaff.spawnerHeight, 0.1, this.setStaffHeight.bind(this));
		zPos-=0.15;

		const staffTime = new PlusMinus(this.ourApp);
		await staffTime.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
		this.guiBackground.id, "time",
			this.ourStaff.staffTime, 1.0, this.setStaffTime.bind(this));
		zPos-=0.15;		

		const drawDist = new PlusMinus(this.ourApp);
		await drawDist.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
		this.guiBackground.id, "pen Δ",
			this.ourStaff.drawThreshold, 0.01, this.setStaffDrawThreshold.bind(this));
		zPos-=0.15;

		const audDist = new PlusMinus(this.ourApp);
		await audDist.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
		this.guiBackground.id, "aud m",
			this.ourStaff.audioRange, 1.0, this.setStaffAudioDistance.bind(this));
		zPos-=0.15;

	}
}
