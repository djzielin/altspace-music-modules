/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import GrabButton from './grabbutton';

export default class GuiPanel {
	protected guiBackground: MRE.Actor=null;
	protected guiGrabber: GrabButton=null;
	protected backgroundHeight =1.75;

	constructor(protected ourApp: App) {
		
	}

	public getBackgroundPos(){
		return this.guiBackground.transform.local.position;
	}

	public hide() {
		this.guiGrabber.hide();
	}

	public show() {
		this.guiGrabber.show();
	}

	public hideGrabber(){
		this.guiGrabber.hideOnlyGrabber();
	}

	public showGrabber(){
		this.guiGrabber.showOnlyGrabber();
	}

	private halfWay(a: MRE.Vector3, b: MRE.Vector3): MRE.Vector3 { //TODO should be in util class
		return (a.add(b)).multiplyByFloats(0.5,0.5,0.5);
	}

	private getLength(a: MRE.Vector3, b: MRE.Vector3): number {
		return (a.subtract(b)).length();
	}

	public transformPoint(point: MRE.Vector3): MRE.Vector3 {
		this.ourApp.ourConsole.logMessage("trying to transform point: " + point);
		this.ourApp.ourConsole.logMessage("  gui grabber pos: " + this.guiGrabber.getPos());
		this.ourApp.ourConsole.logMessage("  panel pos: " + this.getBackgroundPos());

		const mGrabber=MRE.Matrix.Compose(new MRE.Vector3(1,1,1), this.guiGrabber.getRot(), this.guiGrabber.getPos());
		const mPanel=MRE.Matrix.Compose(new MRE.Vector3(1,1,1), MRE.Quaternion.Identity(), this.getBackgroundPos());
		const mPoint=MRE.Matrix.Compose(new MRE.Vector3(1,1,1), MRE.Quaternion.Identity(), point);
		
		const transformedPoint=mPoint.multiply(mPanel.multiply(mGrabber));
		const transformedPointPosition=transformedPoint.getTranslation();

		this.ourApp.ourConsole.logMessage("  computed: " + transformedPointPosition);
		return transformedPointPosition;
	}

	public createPatchLine(linePosition1: MRE.Vector3, linePosition2: MRE.Vector3): MRE.Actor{
		const halfwayLine=this.halfWay(linePosition1, linePosition2);
		const distance=this.getLength(linePosition1,linePosition2);

		const lineActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: "patcher_line",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.blackMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfwayLine,
						rotation: MRE.Quaternion.LookAt(linePosition1,linePosition2),
						scale: new MRE.Vector3(0.01,0.01,distance)
					}
				}
			}
		});
		return lineActor;
	}

	public updatePatchLine(lineActor: MRE.Actor, linePosition1: MRE.Vector3, linePosition2: MRE.Vector3){
		const halfwayLine=this.halfWay(linePosition1, linePosition2);
		const distance=this.getLength(linePosition1,linePosition2);

		lineActor.transform.local.position=halfwayLine;
		lineActor.transform.local.rotation=MRE.Quaternion.LookAt(linePosition1,linePosition2);
		lineActor.transform.local.scale=new MRE.Vector3(0.01,0.01,distance);
	}

	public async createBackground(pos: MRE.Vector3, name: string, bgHeight: number) {
		this.backgroundHeight=bgHeight;
		this.guiGrabber=new GrabButton(this.ourApp);
		this.guiGrabber.create(pos);
		
		const backGroundMesh = this.ourApp.assets.createBoxMesh('boxMesh', 1.1, 0.1, this.backgroundHeight);


		this.guiBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiGrabber.getGUID(),
				name: "consoleBackground",
				appearance: {
					meshId: backGroundMesh.id,
					materialId: this.ourApp.grayMat.id
				},
				transform: {
					local: {
						position: { x: -0.85, y:0.0, z: -0.25 },
					}
				}
			}
		});
		await this.guiBackground.created();

		const guiTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground.id,
				name: 'consoleText',
				text: {
					contents: name,
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0, 0.051, this.backgroundHeight*0.5-0.05),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await guiTextActor.created();
	}	
}
