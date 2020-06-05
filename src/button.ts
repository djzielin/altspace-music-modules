/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';

export default class Button {
	private ourValue=true;
	private ourLabelOn="";
	private ourLabelOff="";

	private buttonActor: MRE.Actor=null;
	private buttonText: MRE.Actor=null;

	constructor(private ourApp: App) {
		
	}

	public async createAsync(pos: MRE.Vector3, parentId: MRE.Guid, labelOn: 
		string, labelOff: string, ourVal: boolean, callback: (b: boolean) => any) {
		this.ourValue=ourVal;
		this.ourLabelOn=labelOn;
		this.ourLabelOff=labelOff;

		const ourHolder = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: parentId,
				name: "hold_elements",
				appearance: {
				},
				transform: {
					local: {
						position: pos
					}
				}
			}
		});

		this.buttonActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: ourHolder.id,
				name: "toggleButton",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.greenMat.id
				},
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: {
						position: { x: 0, y: 0.05, z: 0.0 },
						scale: new MRE.Vector3(0.75, 0.1, 0.1)
					}
				}
			}
		});

		await this.buttonActor.created();

		this.buttonText = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: ourHolder.id,
				name: 'label',
				text: {
					contents: "",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 0.101, z: 0.0 },
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await this.buttonText.created();

		this.updateDisplayValue();

		// Set a click handler on the button.
		this.buttonActor.setBehavior(MRE.ButtonBehavior)
			.onButton("released", (user: MRE.User) => {
				const ourRoles = user.properties["altspacevr-roles"];
				if (ourRoles.includes("moderator") ||
					ourRoles.includes("presenter") || ourRoles.includes("terraformer")) {

					if (this.ourValue) {
						this.ourValue = false;
					} else {
						this.ourValue = true;
					}
					this.updateDisplayValue();
					callback(this.ourValue);
				}
			});
	}

	private updateDisplayValue() {
		if(this.ourValue) {
			this.buttonText.text.contents=this.ourLabelOn;
			this.ourApp.ourConsole.logMessage("button toggled. now: " + this.ourLabelOn);
			this.buttonActor.appearance.materialId=this.ourApp.greenMat.id;
		} else{
			this.buttonText.text.contents=this.ourLabelOff;
			this.ourApp.ourConsole.logMessage("button toggled. now: " + this.ourLabelOff);
			this.buttonActor.appearance.materialId=this.ourApp.redMat.id;
		}
	}
}
