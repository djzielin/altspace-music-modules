/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';

export default class Piano{
	private ourKeys: MRE.Actor[] = [];
	private ourSounds: MRE.Sound[] = [];
	private activeSounds: Map<number,MRE.MediaInstance> = new Map();

	private inch = 0.0254;
	private halfinch = this.inch * 0.5;
	private xOffset =
		[0.0,
			0.0 + this.halfinch,
			this.inch * 1.0,
			this.inch * 1.0 + this.halfinch,
			this.inch * 2.0,
			this.inch * 3.0,
			this.inch * 3.0 + this.halfinch,
			this.inch * 4.0,
			this.inch * 4.0 + this.halfinch,
			this.inch * 5.0,
			this.inch * 5.0 + this.halfinch,
			this.inch * 6.0];
	private yOffset =
		[0, this.halfinch, 0, this.halfinch, 0, 0, this.halfinch, 0, this.halfinch, 0, this.halfinch, 0];
	private zOffset =
		[0, this.inch-0.001, 0, this.inch-0.001, 0, 0, this.inch-0.001, 0, this.inch-0.001, 0, this.inch-0.001, 0];
	private octaveSize = this.inch * 7.0;

	private noteOrder =
	["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

	constructor(private context: MRE.Context, private baseUrl: string, private assets: MRE.AssetContainer) {
		let octave = 0;
		let note = 9;

		const whiteKeyMesh = this.assets.createBoxMesh('box', this.inch * 0.9, this.inch, this.inch * 5.5);
		const blackKeyMesh = this.assets.createBoxMesh('box', this.halfinch, this.inch, this.inch * 3.5);

		const whiteKeyMaterial: MRE.Material = this.assets.createMaterial('cubemat', {
			color: new MRE.Color4(1, 1, 1)
		});
		const blackKeyMaterial: MRE.Material = this.assets.createMaterial('cubemat', {
			color: new MRE.Color4(0, 0, 0)
		});

		const keyboardParent = MRE.Actor.Create(this.context, {
			actor: {
				name: 'keyboard_parent',
				transform: {
					local: { position: new MRE.Vector3(0, 0, 0) },
					app: { position: new MRE.Vector3(0, 1, 0) }
				}
			}
		});

		keyboardParent.setCollider(MRE.ColliderType.Box, false, 
			new MRE.Vector3(this.octaveSize * 8, this.inch * 2.0, this.inch * 6.0));

		keyboardParent.enableRigidBody({
			enabled: true,
			isKinematic: true,
			useGravity: false
		});
		keyboardParent.grabbable = true;

		for (let i = 21; i < 109; i++) {
			const filename = `${this.baseUrl}/` + "Piano.ff." + this.noteOrder[note] + octave.toString() + ".ogg";
			MRE.log.info("app", "trying to load: " + filename);
			this.loadSound(filename,i);

			let meshId: MRE.Guid = blackKeyMesh.id;
			let mattId: MRE.Guid = blackKeyMaterial.id;

			if (this.zOffset[note] === 0) {
				meshId = whiteKeyMesh.id;
				mattId = whiteKeyMaterial.id;
			}

			const keyPos = new MRE.Vector3(
				-this.octaveSize * 4 + octave * this.octaveSize + this.xOffset[note],
				this.yOffset[note],
				this.zOffset[note]);

			const keyActor = MRE.Actor.Create(this.context, {
				actor: {
					name: 'PianoKey' + i,
					parentId: keyboardParent.id,
					transform: {
						local: { position: keyPos }
					},
					appearance:
					{
						meshId: meshId,
						materialId: mattId
					},
				}
			});

			this.ourKeys.push(keyActor);
			note = note + 1;
			if (note === 12) {
				note = 0;
				octave++;
			}
		}
	}

	private loadSound(filename: string, note: number) {
		MRE.log.info("app", "trying to load filename: " + filename);
		const newSound = this.assets.createSound("pianoKey"+note, {
			uri: filename
		});

		/*const p = new Promise((resolve, reject) => { //need to better understand promises
			resolve();
		});

		newSound.setLoadedPromise(p);
		*/

		this.ourSounds.push(newSound);
	}

	public keyPressed(note: number) {
		const adjustedMidiNote: number = note - 21;

		//maybe use pitch rotation instead?
		const currentPos = this.ourKeys[adjustedMidiNote].transform.local.position;

		this.ourKeys[adjustedMidiNote].transform.local.position =
			new MRE.Vector3(currentPos.x, currentPos.y - 0.01, currentPos.z);
	}
	public keyReleased(note: number) {
		const adjustedMidiNote: number = note - 21;
		const noteNum = note % 12;

		const currentPos = this.ourKeys[adjustedMidiNote].transform.local.position;

		this.ourKeys[adjustedMidiNote].transform.local.position =
			new MRE.Vector3(currentPos.x, this.yOffset[noteNum], currentPos.z);
	}

	public getSoundGUID(note: number){
		const adjustedNote: number = note - 21;
		return this.ourSounds[adjustedNote].id;
	}

	public playSound(note: number, vel: number) {
		const adjustedNote: number = note - 21;
		const soundInstance: MRE.MediaInstance =
			this.ourKeys[adjustedNote].startSound(this.getSoundGUID(note), {
				doppler: 0,
				pitch: 24.0,
				looping: false,
				volume: vel / 127
			});
		this.activeSounds.set(note, soundInstance);
	}

	public stopSound(note: number) {
		if (this.activeSounds.has(note)) {
			const playingSoud: MRE.MediaInstance = this.activeSounds.get(note);
			playingSoud.stop();
			this.activeSounds.delete(note);
		}
	}
}
