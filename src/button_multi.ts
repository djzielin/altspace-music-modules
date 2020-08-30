/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';

export default class ButtonMulti {
	private ourChoice=0;
	private ourLabels: string[]=[];

	private buttonActor: MRE.Actor=null;
	private buttonText: MRE.Actor=null;
	public ourHolder: MRE.Actor=null;

	constructor(private ourApp: App) {
		
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

	public async createAsync(pos: MRE.Vector3, parentId: MRE.Guid, labels: 
		string[], ourVal: number, callback: (n: number) => any, width=0.75, height=0.1) {
		this.ourLabels=labels;
		this.ourChoice=ourVal;
	
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

		let mat=this.ourApp.redMat.id;
		if(ourVal>0){
			mat=this.ourApp.greenMat.id;
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
						position: { x: 0, y: 0.00, z: 0.0 },
						scale: new MRE.Vector3(width, 0.1, height)
					}
				}
			}
		});

		await this.buttonActor.created();

		this.buttonText = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourHolder.id,
				name: "label",
				text: {
					contents:  this.ourLabels[ourVal],
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
					this.ourChoice=(this.ourChoice+1) % this.ourLabels.length;

					this.updateDisplayValue();
					callback(this.ourChoice);
				}
			});
	}

	public setValue(val: number){
		this.ourChoice=val;
		this.updateDisplayValue();		
	}

	public getValue(){
		return this.ourChoice;
	}

	private setGreen(){
		this.buttonActor.appearance.materialId=this.ourApp.greenMat.id;
	}

	private setRed(){
		this.buttonActor.appearance.materialId=this.ourApp.redMat.id;
	}

	private updateDisplayValue() {
		this.buttonText.text.contents= this.ourLabels[this.ourChoice];
		this.ourApp.ourConsole.logMessage("button ON. Label now: " + this.ourLabels[this.ourChoice]);

		if(this.ourChoice>0) {			
			this.setGreen();
		} else{
			this.setRed();
		}
	}
}
