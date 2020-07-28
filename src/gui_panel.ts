/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import GrabButton from './grabbutton';

export default class GuiPanel {
	protected guiBackground: MRE.Actor=null;
	protected guiGrabber: GrabButton=null;

	protected backgroundHeight =1.75;

	constructor(protected ourApp: App) {
		
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
