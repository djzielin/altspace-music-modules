/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import Button from './button';

export default class GrabButton {
	private buttonActor: MRE.Actor = null;
	private lockButton: Button = null;
	private unLocked = false;
	
	constructor(private ourApp: App) {

	}

	public setPos(pos: MRE.Vector3){
		this.buttonActor.transform.local.position=pos;
	}

	public setRot(rot: MRE.Quaternion){
		this.buttonActor.transform.local.rotation=rot;
	}

	public hide(){
		this.buttonActor.appearance.enabled=false;
	}
	public show(){
		this.buttonActor.appearance.enabled=true;
	}

	public destroy() {
		if (this.buttonActor) {
			this.buttonActor.destroy();
		}
		if (this.lockButton) {
			this.lockButton.destroy();
		}
	}

	public setUnlocked(b: boolean): void {
		this.unLocked=b;

		if(this.unLocked){
			this.buttonActor.grabbable=true;
		}else{
			this.buttonActor.grabbable=false;
		}
	}

	public setGrabReleaseCallback(callback: () => any) {

		this.buttonActor.onGrab("end", (user: MRE.User) => {
			setTimeout(() => { callback() }, 1000); //wait a second so the pos is accurate
		});

	}

	public getGUID(): MRE.Guid {
		return this.buttonActor.id;
	}

	public getPos(): MRE.Vector3 {
		return this.buttonActor.transform.local.position;
	}
	public getRot(): MRE.Quaternion{
		return this.buttonActor.transform.local.rotation;
	}

	public hideOnlyGrabber(){
		this.buttonActor.appearance.meshId=null;
		this.buttonActor.collider.enabled=false;
		this.lockButton.hide();
	}

	public showOnlyGrabber(){
		this.buttonActor.appearance.meshId=this.ourApp.handMesh.id;
		this.buttonActor.collider.enabled=true;
		this.lockButton.show();
	}

	public create(pos: MRE.Vector3,rot=new MRE.Quaternion()) { //TODO: should this be async?

		this.buttonActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: "grabberButton",
				transform: {
					local: {
						position: pos,
						rotation: rot
					}
				},
				appearance: {
					meshId: this.ourApp.handMesh.id,
					materialId: this.ourApp.handMaterial.id
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Box
					},
					isTrigger: false
				},
				subscriptions: ["transform"]
			}
		});

		if(this.unLocked){
			this.buttonActor.grabbable=true;
		}		

		this.lockButton=new Button(this.ourApp);
		this.lockButton.createAsync(new MRE.Vector3(0.0,0.0,-0.25),this.buttonActor.id,"unlocked","locked",
			this.unLocked, this.setUnlocked.bind(this),0.45);

		/*this.buttonActor.setBehavior(MRE.ButtonBehavior)
			.onButton("pressed", (user: MRE.User) => {
				const ourRoles = user.properties["altspacevr-roles"];
				if (ourRoles.includes("moderator") ||
					ourRoles.includes("presenter") || ourRoles.includes("terraformer")) {

					this.ourApp.ourConsole.logMessage("grab button pressed!");
					const ourUser = this.ourApp.findUserRecord(user.id);

					if (ourUser) {
						this.ourApp.ourConsole.logMessage("ourUser has enough permissions");
					}
				}
			})
			.onButton("released", (user: MRE.User) => {
				const ourRoles = user.properties["altspacevr-roles"];
				if (ourRoles.includes("moderator") ||
					ourRoles.includes("presenter") || ourRoles.includes("terraformer")) {

					this.ourApp.ourConsole.logMessage("grab button released!");
					//this.buttonActor.parentId=MRE.ZeroGuid; //is this how to unparent?
				}
			});*/
	}
}
