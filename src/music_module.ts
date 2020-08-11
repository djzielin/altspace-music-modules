/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import App from './app';
import GrabButton from './grabbutton';

export default class MusicModule {
	public ourGrabber: GrabButton=null;

	public sendDestinations: MusicModule[]=[];

	constructor(protected ourApp: App) {
		
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
		this.ourGrabber.hide();
	}

	public show() {
		this.ourGrabber.show();
	}

	public createGrabber(pos: MRE.Vector3, quat: MRE.Quaternion) {
		
		this.ourGrabber=new GrabButton(this.ourApp);
		this.ourGrabber.create(pos,quat);
	}	

	public receiveData(data: number[]){ //right now just sending midi messages around

	}

	public removeSendDestination(module: MusicModule){
		const index=this.sendDestinations.indexOf(module);
		if(index>-1){
			this.sendDestinations.splice(index,1);
		}
	}

	public sendData(data: number[]){
		for(const singleModule of this.sendDestinations){
			singleModule.receiveData(data);
		}
	}
}
