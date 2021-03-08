/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';
import App from '../app';
import GrabButton from '../gui/grabbutton';
import PatchPoint from './patch_point';

export default class MusicModule {
	public ourGrabber: GrabButton=null;

	public sendDestinations: PatchPoint[]=[];

	constructor(protected ourApp: App) {
		
	}

	public destroy(){
		if(this.ourGrabber){
			this.ourGrabber.destroy();
		}
	}

	public getWorldPosFromMatrix(mPoint: MRE.Matrix) {
		const mGrabber = MRE.Matrix.Compose(new MRE.Vector3(1, 1, 1), 
			this.ourGrabber.getRot(), this.ourGrabber.getPos());
		
		const transformedPoint = mPoint.multiply(mGrabber);
		const transformedPointPosition = transformedPoint.getTranslation();

		return transformedPointPosition;
	}

	public getWorldPos(pos: MRE.Vector3) {
		const mGrabber = MRE.Matrix.Compose(new MRE.Vector3(1, 1, 1), 
			this.ourGrabber.getRot(), this.ourGrabber.getPos());
		const mPoint = MRE.Matrix.Compose(new MRE.Vector3(1, 1, 1), 
			MRE.Quaternion.Identity(), pos);

		const transformedPoint = mPoint.multiply(mGrabber);
		const transformedPointPosition = transformedPoint.getTranslation();

		return transformedPointPosition;
	}

	public hide() {
		if (this.ourGrabber) {
			this.ourGrabber.hide();
		}
	}

	public show() {
		if (this.ourGrabber) {
			this.ourGrabber.show();
		}
	}

	public hideGrabber() {
		if (this.ourGrabber) {
			this.ourGrabber.hideOnlyGrabber();
		}
	}

	public showGrabber() {
		if (this.ourGrabber) {
			this.ourGrabber.showOnlyGrabber();
		}
	}

	public createGrabber(pos: MRE.Vector3, quat: MRE.Quaternion) {
		
		this.ourGrabber=new GrabButton(this.ourApp);
		this.ourGrabber.create(pos,quat);
	}	

	public receiveData(data: any[], messageType: string){ 

	}

	public removeSendDestination(patchPoint: PatchPoint){
		let index=-1;

		for(let i=0;i<this.sendDestinations.length;i++){
			const singlePatch = this.sendDestinations[i];
			if(singlePatch.isEqual(patchPoint)){
				index=i;
			}
		}

		if(index>-1){
			this.sendDestinations.splice(index,1);
		}
	}

	public sendData(data: any[], messageType: string){
		for(const singlePatch of this.sendDestinations){
			if(singlePatch.messageType===messageType){
				singlePatch.module.receiveData(data, messageType);
			}
		}
	}
}
