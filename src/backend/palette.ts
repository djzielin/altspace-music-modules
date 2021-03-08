/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import App from '../app';
import GrabButton from '../gui/grabbutton';
import Button from '../gui/button';
import ButtonWithParameter from '../gui/button_with_parameter';
import MusicModule from '../backend/music_module';

export default class Palette {
	protected guiBackground: MRE.Actor=null;
	protected guiGrabber: GrabButton=null;
	protected backgroundHeight =1.75;

	private utilityModules: string[]=["Midi Receiver", "Midi Player", "Wav Player", "Sequencer", "Heart Beat"];
	private instrumentModules: string[]=["Piano","Micro Piano", "Staff", "Spiral","Spawner","Geo" ];


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

	public selectModule(b: boolean, param: any){
		const moduleName=param as string;

		this.ourApp.spawnModule(moduleName);
	}
	
	public async createBackground(pos: MRE.Vector3, rot: MRE.Quaternion, name: string, bgHeight: number) {
		this.backgroundHeight=bgHeight;
		this.guiGrabber=new GrabButton(this.ourApp);
		this.guiGrabber.create(pos,rot);
		
		const backGroundMesh = this.ourApp.assets.createBoxMesh('boxMesh', 3.0, 0.1, this.backgroundHeight);


		this.guiBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiGrabber.getGUID(),
				name: "paletteBackground",
				appearance: {
					meshId: backGroundMesh.id,
					materialId: this.ourApp.grayMat.id
				},
				transform: {
					local: {
						position: { x: -1.75, y:0.0, z: -0.25 },
						rotation: { x: 0, y: 0, z:0}
					}
				}
			}
		});
		await this.guiBackground.created();

		const guiTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground.id,
				name: 'titleText',
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

		const utilityLabel = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground.id,
				name: 'titleText',
				text: {
					contents: "Utility",
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(-1.0, 0.051, this.backgroundHeight * 0.5 - 0.3),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await utilityLabel.created();

		const instrumentLabel = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground.id,
				name: 'titleText',
				text: {
					contents: "Instruments",
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0, 0.051, this.backgroundHeight * 0.5 - 0.3),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await instrumentLabel.created();

		const synthLabel = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground.id,
				name: 'titleText',
				text: {
					contents: "Synths",
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(1.0, 0.051, this.backgroundHeight * 0.5 - 0.3),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await synthLabel.created();

		let zPos = this.backgroundHeight * 0.5 - 0.3 - 0.3;

		for (const s of this.utilityModules) {
			const selectUtility = new ButtonWithParameter(this.ourApp,s);
			await selectUtility.createAsync(new MRE.Vector3(-1.0, 0.051, zPos),
				this.guiBackground.id, s, s,
				false, this.selectModule.bind(this));
			selectUtility.doVisualUpdates=false;
			zPos -= 0.15;
		}

		zPos = this.backgroundHeight * 0.5 - 0.3 - 0.3;

		for (const s of this.instrumentModules) {
			const selectInstrument = new ButtonWithParameter(this.ourApp,s);
			await selectInstrument.createAsync(new MRE.Vector3(0.0, 0.051, zPos),
				this.guiBackground.id, s, s,
				false, this.selectModule.bind(this));
			selectInstrument.doVisualUpdates=false;
			zPos -= 0.15;
		}

	}
}
