/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import App from './app';
import MusicModule from './backend/music_module';
import PianoIntervals from './piano_intervals';

enum AuthType {
	Moderators = 0,
	All = 1,
	SpecificUser = 2
}

enum IntervalMode {
	none = 0,
	western = 1,
	jazz = 2,
	numerical = 3
}

enum NoteNameMode {
	none = 0,
	letter = 1,
	solfege = 2
}

interface IntervalDisplay {
	line1: MRE.Actor;
	line2: MRE.Actor;
	line3: MRE.Actor;
	text: MRE.Actor;
	note1: number;
	note2: number;
}

export default class MicroPiano extends MusicModule {
	public ourInteractionAuth = AuthType.All;
	public authorizedUser: MRE.User;

	public activeNotes: Set<number> = new Set();
	private ourKeys: Map<number, MRE.Actor> = new Map();
	private ourKeyCollisionActors: Map<number, MRE.Actor> = new Map();
	private ourNoteNames: Map<number, MRE.Actor> = new Map();
	public ourKeyColliderPositions: Map<number, MRE.Vector3> = new Map();

	public keyboardParent: MRE.Actor;
	public breathAnimData: MRE.AnimationData;

	public keyLowest = 36;
	public keyHighest = 85;
	public pianoScale = 5.0;
	public audioRange = 50.0;
	public doSharps = true;

	public intervalMode: IntervalMode = IntervalMode.none;
	public noteNameMode: NoteNameMode = NoteNameMode.none;

	public keyPositioners: Map<number, MRE.Actor> = new Map();

	private inch = 0.0254;
	public halfinch = this.inch * 0.5;

	private whiteWidth = 1.25 * this.inch;

	private xOffset =
		[0.0,
			0.25 * this.whiteWidth,
			0.5 * this.whiteWidth,
			0.75 * this.whiteWidth,
			1.0 * this.whiteWidth,
			1.25 * this.whiteWidth,
			1.5 * this.whiteWidth,
			1.75 * this.whiteWidth,
			2.0 * this.whiteWidth,
			2.5 * this.whiteWidth,
			3.0 * this.whiteWidth,
			3.25 * this.whiteWidth,
			3.5 * this.whiteWidth,
			3.75 * this.whiteWidth,
			4.0 * this.whiteWidth,
			4.25 * this.whiteWidth,
			4.5 * this.whiteWidth,
			4.75 * this.whiteWidth,
			5.0 * this.whiteWidth,
			5.25 * this.whiteWidth,
			5.5 * this.whiteWidth,
			5.75 * this.whiteWidth,
			6.0 * this.whiteWidth,
			6.5 * this.whiteWidth,
		];

	private yOffset =
		[0,
			this.halfinch,
			this.inch,
			this.halfinch,
			0,
			this.halfinch,
			this.inch,
			this.halfinch,
			0,
			this.halfinch,
			0,
			this.halfinch,
			this.inch,
			this.halfinch,
			0,
			this.halfinch,
			this.inch,
			this.halfinch,
			0,
			this.halfinch,
			this.inch,
			this.halfinch,
			0,
			this.halfinch
		];

	private zOffset =
		[0,
			this.inch * 0.75 - 0.001,
			this.inch * 1.0 - 0.001,
			this.inch * 0.75 - 0.001,
			0,
			this.inch * 0.75 - 0.001,
			this.inch * 1.0 - 0.001,
			this.inch * 0.75 - 0.001,
			0,
			this.inch * 0.75 - 0.001,
			0,
			this.inch * 0.75 - 0.001,
			this.inch * 1.0 - 0.001,
			this.inch * 0.75 - 0.001,
			0,
			this.inch * 0.75 - 0.001,
			this.inch * 1.0 - 0.001,
			this.inch * 0.75 - 0.001,
			0,
			this.inch * 0.75 - 0.001,
			this.inch * 1.0 - 0.001,
			this.inch * 0.75 - 0.001,
			0,
			this.inch * 0.75 - 0.001
		];

	private noteColors =
		[
			0,
			1,
			2,
			1,
			0,
			1,
			2,
			1,
			0,
			1,
			0,
			1,
			2,
			1,
			0,
			1,
			2,
			1,
			0,
			1,
			2,
			1,
			0,
			1
		];


	/*private zOffsetCollision =
		[-this.inch * 1.75, this.inch, -this.inch * 1.75, this.inch, -this.inch * 1.75,
			-this.inch * 1.75, this.inch, -this.inch * 1.75, this.inch, -this.inch * 1.75,
			this.inch, -this.inch * 1.75];*/
	private octaveSize = this.whiteWidth * 7.0;

	private noteNamesFlats =
		["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
	private noteNamesSharps =
		["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

	private solfegeSharpNames = ["Do", "Di", "Re", "Ri", "Mi", "Fa", "Fi", "Sol", "Si", "La", "Li", "Ti"];
	private solfegeFlatNames = ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Se", "Sol", "Le", "La", "Te", "Ti"];

	private keyLocations: Map<number, MRE.Vector3> = new Map();
	private canBePicked: Map<number, boolean> = new Map();

	private ourIntervals: PianoIntervals = null;

	constructor(protected ourApp: App) {
		super(ourApp);
		this.ourIntervals = null; //new PianoIntervals(ourApp, this);
	}

	public setScale(scale: number) {
		this.pianoScale = scale;
		if (this.keyboardParent) {
			this.keyboardParent.transform.local.scale =
				new MRE.Vector3(this.pianoScale, this.pianoScale, this.pianoScale);
			this.updateKeyboardCenter();
		}
	}

	public updateKeyboardCenter() {
		const highPos = this.computeKeyPositionX(this.keyHighest) * this.pianoScale;

		const offset = -highPos - 0.5;

		this.keyboardParent.transform.local.position.x = offset;
	}

	public getMaterialByNumber(n: number): MRE.Material {
		if (n === 0) {
			return this.ourApp.whiteMat;
		}
		if (n === 1) {
			return this.ourApp.grayMat;
		}
		if (n === 2) {
			return this.ourApp.blackMat;
		}
	}

	private convertMidiToIndex(midiNote: number): number {
		const noteDoubled = Math.trunc(midiNote * 2.0);
		return noteDoubled % 24;
	}

	public setProperKeyColor(midiNote: number) {
		const noteIndex = this.convertMidiToIndex(midiNote);

		this.ourKeys.get(midiNote).appearance.material = this.getMaterialByNumber(this.noteColors[noteIndex]);
	}

	public setFancyKeyColor(midiNote: number) {
		//const note = this.convertMidiToIndex(midiNote); //get 24 tone
		const note12 = Math.trunc(midiNote) % 12;


		if (this.ourApp.ourStaff) {
			const materialID = this.ourApp.ourStaff.noteMaterials[note12].id;
			if (this.ourKeys.has(midiNote)) {
				this.ourKeys.get(midiNote).appearance.materialId = materialID;
			}
		}
	}

	private isAuthorized(user: MRE.User): boolean {
		if (this.ourInteractionAuth === AuthType.All) {
			return true;
		}
		if (this.ourInteractionAuth === AuthType.Moderators) {
			return this.ourApp.ourUsers.isAuthorized(user);
		}
		if (this.ourInteractionAuth === AuthType.SpecificUser) {
			if (user === this.authorizedUser) {
				return true;
			}
		}

		return false;
	}

	public destroyKeys() {
		for (const keyActor of this.ourKeys.values()) {
			keyActor.destroy();
		}
		this.ourKeys.clear();
		this.keyLocations.clear();

		this.keyboardParent.destroy();
		//this.ourGrabber.destroy();
	}

	private computeKeyPositionX(midiNote: number): number {
		const totalOctaves = Math.ceil((this.keyHighest - this.keyLowest) / 12.0);
		const baseOctave = Math.floor(this.keyLowest / 12);
		const octave = Math.floor(midiNote / 12);
		const relativeOctave = octave - baseOctave;
		const note = this.convertMidiToIndex(midiNote);

		return -this.octaveSize * totalOctaves + relativeOctave * this.octaveSize + this.xOffset[note];
	}

	public async createAllKeys(pos: MRE.Vector3, rot = new MRE.Quaternion()) {
		const whiteKeyMesh = this.ourApp.assets.createBoxMesh('box', this.whiteWidth * 0.9, this.inch, this.inch * 5.5);
		await whiteKeyMesh.created;

		const blackKeyMesh = this.ourApp.assets.createBoxMesh('box', this.halfinch, this.inch, this.inch * 3.5);
		await blackKeyMesh.created;

		const grayKeyMesh = this.ourApp.assets.createBoxMesh('box', this.halfinch * 0.9, this.inch, this.inch * 4.5);
		await grayKeyMesh.created;

		if (!this.ourGrabber) {
			this.createGrabber(pos, rot);
		} else {
			this.ourGrabber.setPos(pos);
			this.ourGrabber.setRot(rot);
		}

		this.keyboardParent = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'keyboard_parent',
				parentId: this.ourGrabber.getGUID(),
				transform: {
					local: {
						position: new MRE.Vector3(-0.5, 0, 0),
						scale: new MRE.Vector3(this.pianoScale, this.pianoScale, this.pianoScale)
					}
				}
			}
		});

		this.updateKeyboardCenter();

		this.ourApp.ourConsole.
			logMessage(`PIANO: creating new keyboard with range ${this.keyLowest} to ${this.keyHighest}`);
		//this.ourApp.ourConsole.logMessage(`octaves: ${totalOctaves}`);


		for (let i = this.keyLowest; i < this.keyHighest; i += 0.5) {
			const noteIndex = this.convertMidiToIndex(i);

			let meshId: MRE.Guid = blackKeyMesh.id;
			const mattId: MRE.Guid = this.getMaterialByNumber(this.noteColors[noteIndex]).id;

			if (this.noteColors[noteIndex] === 0) {
				meshId = whiteKeyMesh.id;
			}
			if (this.noteColors[noteIndex] === 1) {
				meshId = grayKeyMesh.id;
			}
			if (this.noteColors[noteIndex] === 2) {
				meshId = blackKeyMesh.id;
			}

			const keyPos = new MRE.Vector3(
				this.computeKeyPositionX(i),
				this.yOffset[noteIndex],
				this.zOffset[noteIndex]);

			this.keyLocations.set(i, keyPos);

			//const keyPosCollision = keyPos.clone();
			//keyPosCollision.z = this.zOffsetCollision[note]; //different zPos
			this.ourKeyColliderPositions.set(i, keyPos);

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
						materialId: mattId
					},
				}
			});
			await keyActor.created();
			this.ourKeys.set(i, keyActor);

			const keyCollisionActor = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					name: 'CollisionPianoKey' + i,
					parentId: this.keyboardParent.id,
					transform: {
						local: { position: keyPos }
					},
					appearance:
					{
						meshId: meshId,
						materialId: this.ourApp.redMat.id,
						enabled: false
					},
					collider: {
						geometry: {
							shape: MRE.ColliderType.Box
						},
						isTrigger: true
					}
				}
			});
			await keyCollisionActor.created();

			this.ourKeyCollisionActors.set(i, keyCollisionActor);
			this.setupInteractions(i);
		}
	}

	private setupInteractions(i: number) {
		const keyCollisionActor = this.ourKeyCollisionActors.get(i);

		keyCollisionActor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
			this.ourApp.ourConsole.logMessage("PIANO: trigger enter on piano note!");

			if (otherActor.name.includes('SpawnerUserHand')) { //bubble touches hand
				const guid = otherActor.name.substr(16);
				//this.ourApp.ourConsole.logMessage("  full user name is: " + otherActor.name);
				//this.ourApp.ourConsole.logMessage("  guid is: " + guid);

				if (this.ourInteractionAuth === AuthType.All || this.ourApp.ourUsers.isAuthorizedString(guid)) {
					this.keyPressed(i, 100);
				}

			} else {
				this.ourApp.ourConsole.logMessage("key collided with: " + otherActor.name);
			}
		});

		keyCollisionActor.collider.onTrigger("trigger-exit", (otherActor: MRE.Actor) => {
			this.ourApp.ourConsole.logMessage("PIANO: trigger enter on piano note!");

			if (otherActor.name.includes('SpawnerUserHand')) { //bubble touches hand
				const guid = otherActor.name.substr(16);
				//this.ourApp.ourConsole.logMessage("  full user name is: " + otherActor.name);
				//this.ourApp.ourConsole.logMessage("  guid is: " + guid);

				if (this.ourInteractionAuth === AuthType.All || this.ourApp.ourUsers.isAuthorizedString(guid)) {
					this.keyReleased(i);
				}

			} else {
				//this.ourApp.ourConsole.logMessage("sphere collided with: " + otherActor.name);
			}
		});

		const buttonBehavior = keyCollisionActor.setBehavior(MRE.ButtonBehavior);
		buttonBehavior.onButton("pressed", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				this.ourApp.ourConsole.logMessage("PIANO: user clicked on piano note: " + i);
				this.keyPressed(i, 100);
			} else {
				this.ourApp.ourConsole.logMessage("PIANO: user not authorized to click: " + i);
			}
		});

		//TODO: only do release if user had triggered note
		buttonBehavior.onButton("released", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				this.keyReleased(i);
			}
		});

		//TODO: only do release if user had triggered note
		buttonBehavior.onHover("exit", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				this.keyReleased(i);
			}
		});
	}

	public getSharpsMode() { //TODO sharp mode should really be pulled out into a global setting
		let doSharpsComputed = this.doSharps;
		if (this.ourApp.ourStaff) {
			doSharpsComputed = this.ourApp.ourStaff.doSharps;
		}
		return doSharpsComputed;
	}

	public receiveData(data: any[], messageType: string) {
		if (messageType === "midi") {
			if (data.length > 1) {
				if (data[1] > 0) {
					this.keyPressed(data[0] as number, data[1] as number);
				} else {
					this.keyReleased(data[0] as number);
				}
			}
		}
	}

	public isAccidental(midiNote: number): boolean {
		const pitchClass = this.convertMidiToIndex(midiNote) / 2; //TODO get this better for microtonal

		if (pitchClass === 1 || pitchClass === 3 || pitchClass === 6 || pitchClass === 8 || pitchClass === 10) {
			return true;
		}

		return false;
	}

	public keyPressed(note: number, vel: number) {
		//this.ourApp.ourConsole.logMessage("piano received note ON message! note: " + note);

		if (!this.ourKeys.has(note) || (!this.keyLocations.has(note))) {
			return;
		}

		const doSharpsComputed = this.getSharpsMode();

		const newPos = this.keyLocations.get(note).clone();
		newPos.y -= 0.01;

		this.ourKeys.get(note).transform.local.position = newPos;

		const mKeyboard = MRE.Matrix.Compose(
			this.keyboardParent.transform.local.scale,
			this.keyboardParent.transform.local.rotation,
			this.keyboardParent.transform.local.position);

		const mPoint = MRE.Matrix.Compose(
			new MRE.Vector3(1, 1, 1),
			MRE.Quaternion.Identity(),
			this.keyLocations.get(note));

		const transformedPoint = mPoint.multiply(mKeyboard);
		const posInWorld = this.getWorldPosFromMatrix(transformedPoint);

		const message = [note, vel, 0, posInWorld.x, posInWorld.y, posInWorld.z];
		this.sendData(message, "midi");

		this.setFancyKeyColor(note);

		if (this.noteNameMode > 0) {
			const noteNum = this.convertMidiToIndex(note);
			let noteName = "";
			let noteHeight = 0.005;

			if (this.noteNameMode === NoteNameMode.letter) {
				if (doSharpsComputed) {
					noteName = this.noteNamesSharps[noteNum];
				} else {
					noteName = this.noteNamesFlats[noteNum];
				}
			} else if (this.noteNameMode === NoteNameMode.solfege) {
				if (doSharpsComputed) {
					noteName = this.solfegeSharpNames[noteNum];
				} else {
					noteName = this.solfegeFlatNames[noteNum];
				}
				noteHeight = noteHeight * 0.5;
			}


			const notePosition = this.ourKeyColliderPositions.get(note).clone();
			notePosition.y -= 0.01;
			notePosition.y += this.halfinch;
			notePosition.y += 0.001;

			if (this.isAccidental(note)) {
				notePosition.x += 0.008;
				notePosition.z -= 0.032;
			} else {
				notePosition.x += 0.016;
				notePosition.z -= 0.0;
			}

			//this.ourApp.ourConsole.logMessage("Creating note name: " + noteName + " at pos: " + notePosition);

			const noteNameActor = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					name: 'noteName',
					parentId: this.keyboardParent.id,
					transform: {
						local: {
							position: notePosition,
							scale: new MRE.Vector3(this.pianoScale, this.pianoScale, this.pianoScale),
							rotation: MRE.Quaternion.FromEulerAngles(90 * Math.PI / 180, 0, 0)
						}
					},
					text: {
						contents: noteName,
						color: { r: 0.25, g: 0.25, b: 0.25 },
						anchor: MRE.TextAnchorLocation.MiddleCenter,
						height: noteHeight
					}
				}
			});

			if (this.ourNoteNames.has(note)) { //on the off chance was already created and not destroyed
				this.ourNoteNames.get(note).destroy();
			}
			this.ourNoteNames.set(note, noteNameActor);
		}

		if (!this.activeNotes.has(note)) {

			if (this.intervalMode > 0) {
				this.ourIntervals.keyPressed(note);
			}
			this.activeNotes.add(note);
			//this.ourApp.ourMidiSender.send(`[144,${note},${vel}]`)
		}
	}

	public keyReleased(note: number) {
		//this.ourApp.ourConsole.logMessage("piano received note OFF message! note: " + note);

		if (!this.ourKeys.has(note)) {
			//this.ourApp.ourConsole.logMessage("ERROR: note is outside the range of our piano");
			return;
		}

		if (!this.activeNotes.has(note)) {
			//this.ourApp.ourConsole.logMessage("ERROR: keyReleased called for note that was not pressed");
			return;
		}

		const message = [note, 0, 0];
		this.sendData(message, "midi")

		const newPos = this.keyLocations.get(note).clone();

		this.ourKeys.get(note).transform.local.position = newPos;

		if (this.ourNoteNames.has(note)) {
			const noteName = this.ourNoteNames.get(note);
			noteName.destroy();
		}

		//this.ourApp.ourMidiSender.send(`[128,${note},0]`)
		this.activeNotes.delete(note);
		this.setProperKeyColor(note);

		if (this.intervalMode > 0) {
			this.ourIntervals.keyReleased(note);
		}
	}
}
