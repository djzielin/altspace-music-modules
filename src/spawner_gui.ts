/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import PlusMinus from './plusminus';
import Button from './button';
import Spawner from './spawner';

export default class SpawnerGui {
	private guiParent: MRE.Actor=null;

	constructor(private ourApp: App, private ourSpawner: Spawner) {
		
	}

	private async createBackground() {
		this.guiParent = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: "parent",
				transform: {
					local: {
						position: { x: -1.0, y: 0.0, z: 0 },
					}
				}
			}
		});
		await this.guiParent.created();

		const consoleMat = this.ourApp.assets.createMaterial('consolemat', {
			color: new MRE.Color3(0.5, 0.5, 0.5) //TODO push to app
		});
		await consoleMat.created;

		const guiBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiParent.id,
				name: "consoleBackground",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: consoleMat.id
				},
				transform: {
					local: {
						position: { x: -0.025, y: 0.05, z: -0.25 },
						scale: new MRE.Vector3(1.05, 0.1, 1.5)
					}
				}
			}
		});
		await guiBackground.created();

		const guiTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiParent.id,
				name: 'consoleText',
				text: {
					contents: "Spawner",
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopLeft,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(-0.5, 0.101, 0.5),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await guiTextActor.created();
	}

	public async createAsync() {
		this.ourApp.ourConsole.logMessage("creating spawner gui");
		await this.createBackground();	
		
		this.ourApp.ourConsole.logMessage("creating speed plus/minus");
		const speedGUI=new PlusMinus(this.ourApp);
		await speedGUI.createAsync(new MRE.Vector3(-0.5,0.1,0.3),this.guiParent.id,"speed",
			this.ourSpawner.bubbleSpeed,0.01, this.ourSpawner.setBubbleSpeed.bind(this.ourSpawner)); 

		const sizeGUI=new PlusMinus(this.ourApp);
		await sizeGUI.createAsync(new MRE.Vector3(-0.5,0.1,0.15),this.guiParent.id,"size",
			this.ourSpawner.bubbleSize,0.01, this.ourSpawner.setBubbleSize.bind(this.ourSpawner));

		const timeoutGUI=new PlusMinus(this.ourApp);
		await timeoutGUI.createAsync(new MRE.Vector3(-0.5,0.1,0.0),this.guiParent.id,"time",
			this.ourSpawner.timeOut,1,this.ourSpawner.setTimeOut.bind(this.ourSpawner));

		const button=new Button(this.ourApp);
		await button.createAsync(new MRE.Vector3(0.0,0.025,-0.2),this.guiParent.id,"Particle On","ParticleOff",
			this.ourSpawner.doParticleEffect, this.ourSpawner.setDoParticleEffect.bind(this.ourSpawner));

		const randButton=new Button(this.ourApp);
		await randButton.createAsync(new MRE.Vector3(0.0,0.025,-0.35),this.guiParent.id,"Pos Rand","Pos Lin",
			this.ourSpawner.doPosRandom, this.ourSpawner.setDoPosRandom.bind(this.ourSpawner));

		const freezeButton=new Button(this.ourApp);
		await freezeButton.createAsync(new MRE.Vector3(0.0,0.025,-0.5),this.guiParent.id,"rot ok","no rot",
			this.ourSpawner.noFreezeRotation, this.ourSpawner.setNoFreezeRotation.bind(this.ourSpawner));

		const emitWidth=new PlusMinus(this.ourApp);
		await emitWidth.createAsync(new MRE.Vector3(-0.5,0.1,-0.65),this.guiParent.id,"width",
			this.ourSpawner.spawnerWidth,0.05,this.ourSpawner.setEmitterWidth.bind(this.ourSpawner));

		const emitHeight=new PlusMinus(this.ourApp);
		await emitHeight.createAsync(new MRE.Vector3(-0.5,0.1,-0.80),this.guiParent.id,"height",
			this.ourSpawner.spawnerHeight,0.05,this.ourSpawner.setEmitterHeight.bind(this.ourSpawner));

		//limit rotation?
	}
}
