/*!
 * Licensed under the MIT License.
 */

/* eslint-disable no-warning-comments */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import PlusMinus from './plusminus';
import Button from './button';
import Spawner from './spawner';
import GrabButton from './grabbutton';

export default class SpawnerGui {
	//private guiParent: MRE.Actor=null;
	private guiBackground: MRE.Actor = null;
	private guiGrabber: GrabButton = null;

	constructor(private ourApp: App, private ourSpawner: Spawner) {

	}

	private async createBackground(pos: MRE.Vector3) {

		this.guiGrabber = new GrabButton(this.ourApp);
		this.guiGrabber.create(pos);


		const backGroundMesh = this.ourApp.assets.createBoxMesh('boxMesh', 1.1, 0.1, 1.5);


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
						position: { x: -0.85, y: 0.0, z: -0.25 },
					}
				}
			}
		});
		await this.guiBackground.created();

		const guiTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiGrabber.getGUID(),
				name: 'consoleText',
				text: {
					contents: "Spawner",
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopLeft,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(0, 0.051, 0.7),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await guiTextActor.created();
	}

	public async createAsync(pos: MRE.Vector3) {
		this.ourApp.ourConsole.logMessage("creating spawner gui");

		await this.createBackground(pos);

		let zPos = 0.4;

		const randButton = new Button(this.ourApp);
		await randButton.createAsync(new MRE.Vector3(0.0 - 0.75, 0.025, zPos),
			this.guiGrabber.getGUID(), "Pos Rand", "Pos Lin",
			this.ourSpawner.doPosRandom, this.ourSpawner.setDoPosRandom.bind(this.ourSpawner));
		zPos -= 0.15;

		const button = new Button(this.ourApp);
		await button.createAsync(new MRE.Vector3(0.0 - 0.75, 0.025, zPos),
			this.guiGrabber.getGUID(), "Particle On", "ParticleOff",
			this.ourSpawner.doParticleEffect, this.ourSpawner.setDoParticleEffect.bind(this.ourSpawner));
		zPos -= 0.15;

		this.ourApp.ourConsole.logMessage("creating speed plus/minus");
		const speedGUI = new PlusMinus(this.ourApp);
		await speedGUI.createAsync(new MRE.Vector3(-0.5 - 0.75, 0.1, zPos),
			this.guiGrabber.getGUID(), "speed",
			this.ourSpawner.bubbleSpeed, 0.01, this.ourSpawner.setBubbleSpeed.bind(this.ourSpawner));
		zPos -= 0.15;

		const sizeGUI = new PlusMinus(this.ourApp);
		await sizeGUI.createAsync(new MRE.Vector3(-0.5 - 0.75, 0.1, 0.15),
			this.guiGrabber.getGUID(), "size",
			this.ourSpawner.bubbleSize, 0.01, this.ourSpawner.setBubbleSize.bind(this.ourSpawner));
		zPos -= 0.15;

		const timeoutGUI = new PlusMinus(this.ourApp);
		await timeoutGUI.createAsync(new MRE.Vector3(-0.5 - 0.75, 0.1, zPos),
			this.guiGrabber.getGUID(), "time",
			this.ourSpawner.timeOut, 1, this.ourSpawner.setTimeOut.bind(this.ourSpawner));
		zPos -= 0.15;

		const emitWidth = new PlusMinus(this.ourApp);
		await emitWidth.createAsync(new MRE.Vector3(-0.5 - 0.75, 0.1, zPos),
			this.guiGrabber.getGUID(), "width",
			this.ourSpawner.spawnerWidth, 0.05, this.ourSpawner.setEmitterWidth.bind(this.ourSpawner));
		zPos -= 0.15;

		const emitHeight = new PlusMinus(this.ourApp);
		await emitHeight.createAsync(new MRE.Vector3(-0.5 - 0.75, 0.1, zPos),
			this.guiGrabber.getGUID(), "height",
			this.ourSpawner.spawnerHeight, 0.05, this.ourSpawner.setEmitterHeight.bind(this.ourSpawner));
		zPos -= 0.15;

		const audioDistance = new PlusMinus(this.ourApp);
		await audioDistance.createAsync(new MRE.Vector3(-0.5 - 0.75, 0.1, zPos),
			this.guiGrabber.getGUID(), "a rng",
			this.ourSpawner.audioRange, 1, this.ourSpawner.setAudioRange.bind(this.ourSpawner));
		zPos -= 0.15;

	}
}
