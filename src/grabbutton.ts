/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
//import { MreArgumentError } from '../../mixed-reality-extension-sdk/packages/sdk/';
import Button from './button';

export default class GrabButton {
	private buttonActor: MRE.Actor = null;
	private lockButton: Button = null;
	private unLocked = false;
	
	static handMesh: MRE.Mesh = null;
	static handTexture: MRE.Texture = null;
	static handMaterial: MRE.Material = null;

	constructor(private ourApp: App) {

	}

	public destroy() {
		this.buttonActor.destroy();
		this.lockButton.destroy();
	}

	public setUnlocked(b: boolean): void {
		this.unLocked=b;

		if(this.unLocked){
			this.buttonActor.grabbable=true;
		}else{
			this.buttonActor.grabbable=false;
		}
	}

	public createAssets() {
		if (GrabButton.handMesh) {
			return; //already setup!
		}

		const filename = `${this.ourApp.baseUrl}/` + "hand_grey.png";

		GrabButton.handTexture = this.ourApp.assets.createTexture("hand", {
			uri: filename
		});

		GrabButton.handMaterial = this.ourApp.assets.createMaterial('handMat', {
			color: new MRE.Color4(1, 1, 1),
			mainTextureId: GrabButton.handTexture.id
		});

		GrabButton.handMesh = this.ourApp.assets.createBoxMesh('boxMesh', 0.25, 0.1, 0.25);
	}

	public getGUID(): MRE.Guid {
		return this.buttonActor.id;
	}

	public create(pos: MRE.Vector3,rot=new MRE.Quaternion()) { //TODO: should this be async?
		this.createAssets();

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
					meshId: GrabButton.handMesh.id,
					materialId: GrabButton.handMaterial.id
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Box
					},
					isTrigger: false
				},
				//grabbable: true
			}
		});

		if(this.unLocked){
			this.buttonActor.grabbable=true;
		}

		this.lockButton=new Button(this.ourApp);
		this.lockButton.createAsync(new MRE.Vector3(0.0,-0.05,-0.3),this.buttonActor.id,"unlocked","locked",
			this.unLocked, this.setUnlocked.bind(this),0.4);

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
