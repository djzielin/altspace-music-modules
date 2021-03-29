/*!
 * Licensed under the MIT License.
 */

/* eslint-disable no-warning-comments */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import App from '../app';
import Spawner from '../spawner';

import PlusMinus from './plusminus';
import Button from './button';
import GuiPanel from './gui_panel';

export default class extends GuiPanel {
	public sendButton: Button=null;
	public receiveButton: Button=null;

	constructor(protected ourApp: App, private ourSpawner: Spawner) {
		super(ourApp);
		this.ourModule=ourSpawner;
	}

	public setEmitterWidth(n: number): void {
		if (this.ourSpawner) {
			this.ourSpawner.spawnerWidth = n;
			this.ourSpawner.spawnerActor.transform.local.scale =
				new MRE.Vector3(
					this.ourSpawner.spawnerWidth,
					0.01,
					0.05);
			this.ourSpawner.spawnerActor.transform.local.position =
				new MRE.Vector3(-this.ourSpawner.spawnerWidth, 0, 0);
		} else {
			this.ourApp.ourConsole.logMessage("ERROR: spawner referenced by spawner gui doesn't exist!");
		}
	}

	public setEmitterHeight(n: number): void {
		if (this.ourSpawner) {
			this.ourSpawner.spawnerHeight = n;
		} else {
			this.ourApp.ourConsole.logMessage("ERROR: spawner referenced by spawner gui doesn't exist!");
		}
	}

	public setTimeOut(n: number): void {
		if (this.ourSpawner) {
			this.ourSpawner.timeOut = n;
		} else {
			this.ourApp.ourConsole.logMessage("ERROR: spawner referenced by spawner gui doesn't exist!");
		}
	}

	public setBubbleSize(n: number): void {
		if (this.ourSpawner) {
			this.ourSpawner.bubbleSize = n;
		} else {
			this.ourApp.ourConsole.logMessage("ERROR: spawner referenced by spawner gui doesn't exist!");
		}
	}

	public setBubbleLimit(n: number): void {
		if (this.ourSpawner) {
			this.ourSpawner.bubbleLimit = n;
		} else {
			this.ourApp.ourConsole.logMessage("ERROR: spawner referenced by spawner gui doesn't exist!");
		}
	}

	public setBubbleSpeed(n: number): void {
		if (this.ourSpawner) {
			this.ourSpawner.bubbleSpeed = n;
		} else {
			this.ourApp.ourConsole.logMessage("ERROR: spawner referenced by spawner gui doesn't exist!");
		}
	}

	public setDoParticleEffect(b: boolean): void {
		if (this.ourSpawner) {
			this.ourSpawner.doParticleEffect = b;
		} else {
			this.ourApp.ourConsole.logMessage("ERROR: spawner referenced by spawner gui doesn't exist!");
		}
	}

	public setDoPosRandom(b: boolean): void {
		if (this.ourSpawner) {
			this.ourSpawner.doPosRandom = b;
		} else {
			this.ourApp.ourConsole.logMessage("ERROR: spawner referenced by spawner gui doesn't exist!");
		}
	}

	/*public setDoPhysics(b: boolean): void {
		this.ourSpawner.doPhysics=b;
	}*/

	public setDoElongated(b: boolean): void {
		if (this.ourSpawner) {
			this.ourSpawner.doElongatedCubes = b;
		} else {
			this.ourApp.ourConsole.logMessage("ERROR: spawner referenced by spawner gui doesn't exist!");
		}
	}


	public sendMidiPatcher(b: boolean) {
		this.ourApp.ourPatcher.patcherClickEvent(this.ourSpawner, "midi", true, this, this.sendButton);
	}

	public recvMidiPatch(b: boolean) {
		this.ourApp.ourPatcher.patcherClickEvent(this.ourSpawner, "midi", false, this, this.receiveButton);
	}

	public grabRelease() {
		this.ourApp.ourPatcher.updatePatchLines(this);
	}

	public async createAsync(pos: MRE.Vector3, name: string) {
		this.ourApp.ourConsole.logMessage("creating spawner gui");

		await this.createBackground(pos, name, 1.5);
		let zPos = this.backgroundHeight * 0.5 - 0.3;

		const randButton = new Button(this.ourApp);
		await randButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "Pos Rand", "Pos Lin",
			this.ourSpawner.doPosRandom, this.setDoPosRandom.bind(this.ourSpawner));
		zPos -= 0.15;

		/*const pButton = new Button(this.ourApp);
		await pButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "Physics", "Animation",
			this.ourSpawner.doPhysics, this.setDoPhysics.bind(this.ourSpawner));
		zPos -= 0.15;*/

		const button = new Button(this.ourApp);
		await button.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "Particle On", "ParticleOff",
			this.ourSpawner.doParticleEffect, this.setDoParticleEffect.bind(this.ourSpawner));
		zPos -= 0.15;

		/*const button2 = new Button(this.ourApp);
		await button2.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "elongated", "cubes",
			this.ourSpawner.doElongatedCubes, this.setDoElongated.bind(this.ourSpawner));
		zPos -= 0.15;*/

		this.ourApp.ourConsole.logMessage("creating speed plus/minus");
		const speedGUI = new PlusMinus(this.ourApp);
		await speedGUI.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "speed",
			this.ourSpawner.bubbleSpeed, 0.01, this.setBubbleSpeed.bind(this.ourSpawner));
		zPos -= 0.15;

		const sizeGUI = new PlusMinus(this.ourApp);
		await sizeGUI.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "size",
			this.ourSpawner.bubbleSize, 0.01, this.setBubbleSize.bind(this.ourSpawner));
		zPos -= 0.15;

		const timeoutGUI = new PlusMinus(this.ourApp);
		await timeoutGUI.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "culltime",
			this.ourSpawner.timeOut, 1, this.setTimeOut.bind(this.ourSpawner));
		zPos -= 0.15;

		const bubbleLimitGUI = new PlusMinus(this.ourApp);
		await bubbleLimitGUI.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "# limit",
			this.ourSpawner.bubbleLimit, 10, this.setBubbleLimit.bind(this.ourSpawner));
		zPos -= 0.15;

		const emitWidth = new PlusMinus(this.ourApp);
		await emitWidth.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "s_width",
			this.ourSpawner.spawnerWidth, 0.05, this.setEmitterWidth.bind(this.ourSpawner));
		zPos -= 0.15;

		const emitHeight = new PlusMinus(this.ourApp);
		await emitHeight.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "s_height",
			this.ourSpawner.spawnerHeight, 0.05, this.setEmitterHeight.bind(this.ourSpawner));
		zPos -= 0.15;

		this.receiveButton = new Button(this.ourApp);
		await this.receiveButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "RECV MIDI", "RECV MIDI",
			true, this.recvMidiPatch.bind(this));
		zPos -= 0.15;

		this.sendButton = new Button(this.ourApp);
		await this.sendButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "SEND MIDI", "SEND MIDI",
			true, this.sendMidiPatcher.bind(this));
		zPos -= 0.15;

		this.guiGrabber.setGrabReleaseCallback(this.grabRelease.bind(this));
	}
}
