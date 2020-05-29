/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';

export default class Piano {
	private ourKeys: MRE.Actor[] = [];
	public keyboardParent: MRE.Actor;
	
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
		[0, this.inch - 0.001, 0, this.inch - 0.001, 0, 0, this.inch - 0.001, 0, this.inch - 0.001, 0, 
			this.inch - 0.001, 0];
	private octaveSize = this.inch * 7.0;

	private noteOrder =
		["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

	private whiteKeyMaterial: MRE.Material = this.ourApp.assets.createMaterial('cubemat', {
		color: new MRE.Color4(1, 1, 1)
	});
	private blackKeyMaterial: MRE.Material = this.ourApp.assets.createMaterial('cubemat', {
		color: new MRE.Color4(0, 0, 0)
	});
	private redKeyMaterial: MRE.Material = this.ourApp.assets.createMaterial('cubemat', {
		color: new MRE.Color4(1, 0, 0)
	});

	public setProperKeyColor(midiNote: number) {
		const note = midiNote % 12;

		let matt = this.blackKeyMaterial;

		if (this.zOffset[note] === 0) {
			matt = this.whiteKeyMaterial;
		}

		this.ourKeys[midiNote - 21].appearance.material = matt;
	}

	constructor(private ourApp: App) {

	}

	public async createAllKeys() {
		let octave = 0;
		let note = 9;

		const whiteKeyMesh = this.ourApp.assets.createBoxMesh('box', this.inch * 0.9, this.inch, this.inch * 5.5);
		await whiteKeyMesh.created;

		const blackKeyMesh = this.ourApp.assets.createBoxMesh('box', this.halfinch, this.inch, this.inch * 3.5);
		await blackKeyMesh.created;

		const whiteKeyMaterial: MRE.Material = this.ourApp.assets.createMaterial('cubemat', {
			color: new MRE.Color4(1, 1, 1)
		});
		await whiteKeyMaterial.created;


		const blackKeyMaterial: MRE.Material = this.ourApp.assets.createMaterial('cubemat', {
			color: new MRE.Color4(0, 0, 0)
		});
		await blackKeyMaterial.created;

		this.keyboardParent = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'keyboard_parent',
				transform: {
					local: { position: new MRE.Vector3(0, 0, 0) },
					app: { position: new MRE.Vector3(0, 1, 0) }
				}
			}
		});

		await this.keyboardParent.created();

		this.keyboardParent.setCollider(MRE.ColliderType.Box, false,
			new MRE.Vector3(this.octaveSize * 8, this.inch * 2.0, this.inch * 6.0));

		this.keyboardParent.grabbable = true;

		for (let i = 21; i < 109; i++) {
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

			const keyActor = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					name: 'PianoKey' + i,
					parentId: this.keyboardParent.id,
					transform: {
						local: { position: keyPos }
					},
					appearance:
					{
						meshId: meshId,
						materialId: mattId //this.redKeyMaterial.id
					},
				}
			});

			await keyActor.created();

			this.ourKeys.push(keyActor);
			note = note + 1;
			if (note === 12) {
				note = 0;
				octave++;
			}
		}
	}	

	public keyPressed(note: number) {
		const adjustedMidiNote: number = note - 21;

		//maybe use pitch (x axis) rotation instead?
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
}
