/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import Staff from './staff';
import { Quaternion } from '../../mixed-reality-extension-sdk/packages/sdk/';

export default class StaffFlat {
	
	private line1: MRE.Actor=null;
	private line2: MRE.Actor=null;
	private line3: MRE.Actor=null;
	private line4: MRE.Actor=null;

	public ourHolder: MRE.Actor=null;
	public position: MRE.Vector3;
	
	constructor(private ourApp: App, private ourStaff: Staff) {
		
	}

	public destroy(){
		if(this.line1){
			this.line1.destroy();
		}
		if(this.line2){
			this.line2.destroy();
		}
		if(this.line3){
			this.line3.destroy(); 
		}
		if(this.line4){
			this.line4.destroy(); 
		}

		this.ourHolder.destroy(); 
	}

	public setPos(pos: MRE.Vector3){
		this.position=pos;
		this.ourHolder.transform.local.position=pos;
	}

	public create(pos: MRE.Vector3, parentId: MRE.Guid, scale: number, materialID: MRE.Guid) {

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
				/*collider: { geometry: 
					{ 
						shape: MRE.ColliderType.Box,
						size: new MRE.Vector3(scale*3,scale*3,scale*3)  
					} 
				},*/
			}
		});
		
		this.line1 = MRE.Actor.Create(this.ourApp.context, { //left vertical line
			actor: {
				parentId: this.ourHolder.id,
				name: "line1",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: materialID
				},
				
				transform: {
					local: {
						position: { x: -scale*0.175, y: 0.0, z: scale*0.35 },
						scale: new MRE.Vector3(scale*0.1, scale*0.1, scale*1.5)
					}
				}
			}
		});

		this.line2 = MRE.Actor.Create(this.ourApp.context, { //right vertical line
			actor: {
				parentId: this.ourHolder.id,
				name: "line2",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: materialID
				},
				
				transform: {
					local: {
						position: { x: scale*0.175, y: 0.0, z: scale*0.1 },
						scale: new MRE.Vector3(scale*0.1, scale*0.1, scale*0.5)
					}
				}
			}
		});

		this.line3 = MRE.Actor.Create(this.ourApp.context, { //top horizontal
			actor: {
				parentId: this.ourHolder.id,
				name: "line3",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: materialID
				},
				
				transform: {
					local: {
						position: { x: 0.0, y: 0.0, z: scale*0.25 },
						rotation: MRE.Quaternion.FromEulerAngles(0,this.ourApp.degToRad(-25),0),
						scale: new MRE.Vector3(scale*0.4, scale*0.1, scale*0.1)
					}
				}
			}
		});

		this.line4 = MRE.Actor.Create(this.ourApp.context, { //top horizontal
			actor: {
				parentId: this.ourHolder.id,
				name: "line4",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: materialID
				},
				
				transform: {
					local: {
						position: { x: 0.0, y: 0.0, z: -scale*0.25 },
						rotation: MRE.Quaternion.FromEulerAngles(0,this.ourApp.degToRad(-35),0),
						scale:new MRE.Vector3(scale*0.4, scale*0.1, scale*0.1)
					}
				}
			}
		});
	}	
}
