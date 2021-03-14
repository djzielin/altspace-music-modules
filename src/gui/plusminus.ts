/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from '../app';

export default class PlusMinus {
	private ourValue=0;
	private ourLabel="";
	private ourChangeAmount=0;
	private buttonValueDisplay: MRE.Actor=null;

	// Label  -but  value +but
	constructor(private ourApp: App) {
		
	}

	public async createAsync(pos: MRE.Vector3, parentId: MRE.Guid, label: 
		string, ourVal: number, changeAmount: number, callback: (n: number) => any) {
		this.ourValue=ourVal;
		this.ourLabel=label;
		this.ourChangeAmount=changeAmount;

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

		const buttonLabel = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: ourHolder.id,
				name: 'label',
				text: {
					contents: this.ourLabel,
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleLeft
				},
				transform: {
					local: {
						position: { x: 0, y: 0.001, z: 0.0 },
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await buttonLabel.created();


		const buttonM = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: ourHolder.id,

				name: "minusButton",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.redMat.id
				},
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: {
						position: { x: 0.4, y: 0.0, z: 0.0 },
						scale: new MRE.Vector3(0.1, 0.05, 0.1)
					}
				}
			}
		});

		await buttonM.created();

		const minusTextDisplay = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: ourHolder.id,
				name: 'label',
				text: {
					contents: "-",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0.4, y: 0.026, z: 0.0},
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await minusTextDisplay.created();

		this.buttonValueDisplay = MRE.Actor.Create(this.ourApp.context, {
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
						position: { x: 0.65, y: 0.001, z: 0.0 },
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});

		this.updateDisplayValue();
		await this.buttonValueDisplay.created();

		const buttonP = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: ourHolder.id,

				name: "plusButton",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.greenMat.id
				},
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: {
						position: { x: 0.9, y: 0.0, z: 0.0 },
						scale: new MRE.Vector3(0.1, 0.05, 0.1)
					}
				}
			}
		});
		await buttonP.created();

		const plusTextDisplay = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: ourHolder.id,
				name: 'label',
				text: {
					contents: "+",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0.9, y: 0.026, z: 0.0},
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await plusTextDisplay.created();

		buttonM.setBehavior(MRE.ButtonBehavior)
			.onButton("released", (user: MRE.User) => {	
				if (this.ourApp.ourUsers.isAuthorized(user)) {
					
					this.ourValue -= this.ourChangeAmount;
					if(this.ourValue<0){ //always prevent negative numbers?
						this.ourValue=0;
					}

					this.updateDisplayValue();
					callback(this.ourValue);
				}
			});
			
		buttonP.setBehavior(MRE.ButtonBehavior)
			.onButton("released", (user: MRE.User) => {
				if (this.ourApp.ourUsers.isAuthorized(user)) {
					this.ourValue += this.ourChangeAmount;
					this.updateDisplayValue();
					callback(this.ourValue);
				}
			});	
	
	}

	private updateDisplayValue() {
		this.ourApp.ourConsole.logMessage("PlusMinus: " + this.ourLabel + " is now: " + this.ourValue);
		this.buttonValueDisplay.text.contents= this.ourValue.toFixed(2);
	}

	public setValue(n: number){
		this.ourValue=n;
		this.updateDisplayValue();
	}
}
