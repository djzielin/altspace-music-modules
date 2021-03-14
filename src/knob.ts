/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import App from './app';
import Se02 from './se02';

export default class Knob {
	private startPos: MRE.Vector3;

	private cutoffKnob: MRE.Actor=null;
	public knobCenterPos: MRE.Vector3;
	private startAngle=0.0;
	private knobAngle=0.0;
	private ourLine: MRE.Actor=null;

	private indexes6cc: number[]=[0,25,51,76,102,127];
	private indexes6angles: number[]=[-90,-45,0,45,90,135];

	private indexes9cc: number[]=[0,16,32,48,64,79,95,111,127];
	private indexes9angles: number[]=[-160,-120,-80,-40, 0 , 40, 80, 120,160];


	constructor(private ourApp: App, private ourSE: Se02, public ourName: string, public ourCC: number, 
		public indexType: number, public angleMin: number, public angleMax: number) {

	}

	private drawUserLine(startPos: MRE.Vector3, endPos: MRE.Vector3){

		const halfPos=(startPos.add(endPos)).multiply(new MRE.Vector3(0.5,0.5,0.5));	
		const length=(startPos.subtract(endPos)).length();

		const y=endPos.z-startPos.z;
		const x=endPos.x-startPos.x;

		//this.ourApp.ourConsole.logMessage(`hyp: ${length} opp: ${opposite}`);

		const tah=Math.atan2(y,x);
		this.ourApp.ourConsole.logMessage(`tah: ${tah}`);

		const rot=MRE.Quaternion.FromEulerAngles(0,-tah,0);
		const scale=0.03;

		this.ourLine = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourSE.seBackground.id,
				name: "user_line",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.redMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfPos,
						rotation: rot,
						scale: new MRE.Vector3(length,scale,scale)
					}
				}
			}
		});
	}

	private updateLine(startPos: MRE.Vector3, endPos: MRE.Vector3){
		const halfPos=(startPos.add(endPos)).multiply(new MRE.Vector3(0.5,0.5,0.5));	
		const length=(startPos.subtract(endPos)).length();

		const y=endPos.z-startPos.z;
		const x=endPos.x-startPos.x;

		//this.ourApp.ourConsole.logMessage(`hyp: ${length} opp: ${opposite}`);

		const tah=Math.atan2(y,x);
		this.ourApp.ourConsole.logMessage(`tah: ${tah}`);

		const rot=MRE.Quaternion.FromEulerAngles(0,-tah,0);
		const scale=0.03;

		this.ourLine.transform.local.position=halfPos;
		this.ourLine.transform.local.rotation=rot;
		this.ourLine.transform.local.scale= new MRE.Vector3(length,scale,scale);
	}

	private setRotationNoIndex(){
		this.cutoffKnob.transform.local.rotation=
			MRE.Quaternion.FromEulerAngles(0, this.ourApp.degToRad(this.knobAngle), this.ourApp.degToRad(90));
			
		const value=(this.knobAngle+150)/300.0*127.0;
		//this.ourApp.ourMidiSender.send('[176,'+this.ourCC.toFixed(0)+','+value.toFixed(0)+']');			
		
		const message = [176, this.ourCC, value];
		this.ourSE.sendData(message,"midicc");
	}

	private setRotationIndexed(indexCC: number[],indexAngles: number[]){
		this.ourApp.ourConsole.logMessage("trying to compute indexed value for angle: " + this.knobAngle);

		let computedIndex=0;

		for(let i=0;i<indexAngles.length-1;i++){
			const currentValue=indexAngles[i];
			let nextValue=indexAngles[i+1];
			const midPt=(nextValue-currentValue)*0.5+currentValue;
			this.ourApp.ourConsole.logMessage("    midpt: " + midPt);
			if(this.knobAngle>=currentValue && this.knobAngle<midPt){
				computedIndex=i;
				break;
			}
			if(i===(indexAngles.length-2)){ //make sure highest value works
				nextValue++;
			}
			if(this.knobAngle>=midPt && this.knobAngle<nextValue){
				computedIndex=i+1;
				break;
			}
		}

		this.ourApp.ourConsole.logMessage("  knob index is: " + computedIndex);

		this.cutoffKnob.transform.local.rotation=
			MRE.Quaternion.FromEulerAngles(0, this.ourApp.degToRad(indexAngles[computedIndex]), 
				this.ourApp.degToRad(90));
			
		//this.ourApp.ourMidiSender.send('[176,'+this.ourCC.toFixed(0)+',' + 
		//	indexCC[computedIndex].toFixed(0)+']');		
		
		const message = [176, this.ourCC, indexCC[computedIndex]];
		this.ourSE.sendData(message,"midicc");
	}

	public calcQuandrant(angle: number): number{
		if(angle>=0 && angle<90){
			return 1;
		}
		if((angle>=90 && angle <180) || (angle>=-270 && angle < -180)){
			return 2;
		}
		if((angle>=-180 && angle< -90) || (angle>=180 && angle < 270)){
			return 3;
		}
		if(angle>=-90 && angle < 0){
			return 4;
		}
	}

	public userReleased(){
		this.cutoffKnob.appearance.materialId=this.ourApp.whiteMat.id;
	}

	public userPressed(pos: MRE.Vector3) {
		this.startPos = pos.clone();
		this.cutoffKnob.appearance.materialId = this.ourApp.redMat.id;

		const lineVec = this.startPos.subtract(this.knobCenterPos).normalize();
		this.startAngle = Math.atan2(lineVec.z, lineVec.x) * 180.0 / Math.PI;
	}

	public userHolding(pos: MRE.Vector3) {

		const posVector3 = pos.clone();

		posVector3.y = this.startPos.y; //hack to fix MRE bug

		const lineVec = posVector3.subtract(this.knobCenterPos).normalize();


		let endAngle = Math.atan2(lineVec.z, lineVec.x) * 180.0 / Math.PI;
		const rawAngle = endAngle;

		const sQuad = this.calcQuandrant(this.startAngle);
		const eQuad = this.calcQuandrant(endAngle);

		if (sQuad === 2 && eQuad === 3) { //deal with discontinuity 
			endAngle += 360;
		}
		if (sQuad === 3 && eQuad === 2) {
			endAngle -= 360;
		}

		const deltaAngle = this.startAngle - endAngle;

		this.knobAngle += deltaAngle;
		if (this.knobAngle > this.angleMax) {
			this.knobAngle = this.angleMax;
		}
		if (this.knobAngle < this.angleMin) {
			this.knobAngle = this.angleMin;
		}

		if(this.indexType===0){
			this.setRotationNoIndex();
		}
		if(this.indexType===6){
			this.setRotationIndexed(this.indexes6cc, this.indexes6angles);
		}
		if(this.indexType===9){
			this.setRotationIndexed(this.indexes9cc, this.indexes9angles);
		}

		this.startAngle = rawAngle;
		//this.updateLine(this.cutoffCenter,posVector3);
	}

	public async createAsyncItems(pos: MRE.Vector3, parentID: MRE.Guid, startAngle: number) {
		this.ourApp.ourConsole.logMessage("creating knob asyn items");		
		this.knobCenterPos=pos;
	
		this.cutoffKnob = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: parentID,
				name: "knobCenter",
				appearance: {
					meshId: this.ourSE.cylinderMesh.id,
					materialId: this.ourApp.whiteMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: this.knobCenterPos,
						scale: new MRE.Vector3(0.1,0.060,0.060),
						rotation: MRE.Quaternion.FromEulerAngles(0, this.ourApp.degToRad(0), this.ourApp.degToRad(90))
					}
				}
			}
		});
		await this.cutoffKnob.created();

		const knobLine = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.cutoffKnob.id,
				name: "knob",
				appearance: {
					meshId: this.ourSE.boxMesh.id,
					materialId: this.ourApp.whiteMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0,0,0.5),
						scale: new MRE.Vector3(1.1,0.1,0.3),
						//rotation: MRE.Quaternion.FromEulerAngles(0, 0, this.ourApp.degToRad(90))
					}
				}				
			}
		});
		await knobLine.created();


		const knobOuter = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.cutoffKnob.id,
				name: "knobCenter",
				appearance: {
					meshId: this.ourSE.cylinderMesh.id,
					materialId: this.ourApp.blackMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0, 0, 0.0),
						scale: new MRE.Vector3(0.9, 1.2, 1.2)
					}
				}
			}
		});
		await knobOuter.created();

		this.knobAngle=startAngle;

		if(this.indexType===0){
			this.setRotationNoIndex();
		}
		if(this.indexType===6){
			this.setRotationIndexed(this.indexes6cc, this.indexes6angles);
		}
		if(this.indexType===9){
			this.setRotationIndexed(this.indexes9cc, this.indexes9angles);
		}

		//this.ourApp.ourConsole.logMessage("completed all knob object creation");
	}
}
