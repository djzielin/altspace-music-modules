/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';

interface BCallback {
	(b: boolean): void;
}

export default class Button {
	private ourValue=true;
	private ourLabelOn="";
	private ourLabelOff="";
    public doVisualUpdates=true;
	private buttonActor: MRE.Actor=null;
	private buttonText: MRE.Actor=null;
	private ourHolder: MRE.Actor=null;
	private ourCallback: BCallback;

	constructor(private ourApp: App) {
		
	}

	public show(){
		this.ourHolder.appearance.enabled=true;
		this.buttonActor.collider.enabled=true;	
	}
	public hide(){
		this.ourHolder.appearance.enabled=false;
		this.buttonActor.collider.enabled=false;
	}

	public setVisible(b: boolean){
		this.ourHolder.appearance.enabled=b;
	}

	public destroy() {
		if (this.buttonActor) {
			this.buttonActor.destroy();
		}
		if (this.buttonText) {
			this.buttonText.destroy();
		}
		if (this.ourHolder) {
			this.ourHolder.destroy();
		}
	}

	public setPos(pos: MRE.Vector3){
		this.ourHolder.transform.local.position=pos;
	}

	public async createAsync(pos: MRE.Vector3, parentId: MRE.Guid, labelOn: 
		string, labelOff: string, ourVal: boolean, callback: (b: boolean) => any, width=0.75, height=0.1) {
		this.ourValue=ourVal;
		this.ourLabelOn=labelOn;
		this.ourLabelOff=labelOff;
		this.ourCallback=callback;

		this.ourHolder = MRE.Actor.Create(this.ourApp.context, {
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

		let mat=this.ourApp.greenMat.id;
		if(!ourVal){
			mat=this.ourApp.redMat.id;
		}

		this.buttonActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourHolder.id,
				name: "toggleButton",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: mat
				},
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: {
						position: { x: 0, y: 0, z: 0 },
						scale: new MRE.Vector3(width, 0.1, height)
					}
				}
			}
		});

		await this.buttonActor.created();

		this.buttonText = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourHolder.id,
				name: 'label',
				text: {
					contents: "",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 0.051, z: 0.0 },
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
				if (this.ourApp.ourUsers.isAuthorized(user)) {

					if (this.ourValue) {
						this.ourValue = false;
					} else {
						this.ourValue = true;
					}

					if (this.doVisualUpdates) {
						this.updateDisplayValue();
					}
					this.ourCallback(this.ourValue);
				}
				else{
					this.ourApp.ourConsole.logMessage("user: " + user.name + " not authorized to click button!");

				}
			});
	}

	public setValue(val: boolean){
		this.ourValue=val;
		this.updateDisplayValue();	
		this.ourCallback(this.ourValue);	
	}

	public getHolderPos(): MRE.Vector3 {
		return this.ourHolder.transform.local.position;
	}

	public getValue(){
		return this.ourValue;
	}

	private setGreen(){
		this.buttonActor.appearance.materialId=this.ourApp.greenMat.id;
	}

	private setRed(){
		this.buttonActor.appearance.materialId=this.ourApp.redMat.id;
	}

	private updateDisplayValue() {
		if(this.ourValue) {
			this.buttonText.text.contents=this.ourLabelOn;
			this.ourApp.ourConsole.logMessage("button ON. Label now: " + this.ourLabelOn);
			this.setGreen();
		} else{
			this.buttonText.text.contents=this.ourLabelOff;
			this.ourApp.ourConsole.logMessage("button OFF. Label now: " + this.ourLabelOff);
			this.setRed();
		}
	}
}
