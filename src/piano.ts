/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import App from './app';
//import GrabButton from './grabbutton';
import MusicModule from './music_module';
import PianoIntervals from './piano_intervals';
import GeoArtifacts from './geo_artifacts';

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

interface ActiveAnimation {
	animation: MRE.Animation;
	time: number;
	startPos: MRE.Vector3;
	endPos: MRE.Vector3;
}

export default class Piano extends MusicModule {
	public ourInteractionAuth = AuthType.All;
	public authorizedUser: MRE.User;

	public activeNotes: Set<number> = new Set();
	private ourKeys: Map<number, MRE.Actor> = new Map();
	private ourKeyCollisionActors: Map<number, MRE.Actor> = new Map();
	private ourNoteNames: Map<number, MRE.Actor> = new Map();
	public ourKeyColliderPositions: Map<number, MRE.Vector3> = new Map();
	public activeAnimations: Map<number, ActiveAnimation> = new Map();

	public keyboardParent: MRE.Actor;
	public breathAnimData: MRE.AnimationData;

	public keyLowest = 36;
	public keyHighest = 85;
	public pianoScale = 5.0;
	public audioRange = 50.0;
	public doSharps = true;
	public doGeo = false;

	public intervalMode: IntervalMode = IntervalMode.western;
	public noteNameMode: NoteNameMode = NoteNameMode.letter;

	public artifacts: GeoArtifacts;
	public keyPositioners: Map<number, MRE.Actor> = new Map();

	private inch = 0.0254;
	public halfinch = this.inch * 0.5;
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
	private zOffsetCollision =
		[-this.inch * 1.75, this.inch, -this.inch * 1.75, this.inch, -this.inch * 1.75,
			-this.inch * 1.75, this.inch, -this.inch * 1.75, this.inch, -this.inch * 1.75,
			this.inch, -this.inch * 1.75];
	private octaveSize = this.inch * 7.0;

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
		this.artifacts = new GeoArtifacts();
		this.ourIntervals = new PianoIntervals(ourApp, this);
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

	public setProperKeyColor(midiNote: number) {
		const note = midiNote % 12;

		let matt = this.ourApp.blackMat;

		if (this.zOffset[note] === 0) {
			matt = this.ourApp.whiteMat;
		}

		this.ourKeys.get(midiNote).appearance.material = matt;
	}

	public setFancyKeyColor(midiNote: number) {
		const note = midiNote % 12;

		if (this.ourApp.ourStaff) {
			const materialID = this.ourApp.ourStaff.noteMaterials[note].id;
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

	private computeKeyPositionX(i: number): number {
		const totalOctaves = Math.ceil((this.keyHighest - this.keyLowest) / 12.0);
		const baseOctave = Math.floor(this.keyLowest / 12);
		const octave = Math.floor(i / 12);
		const relativeOctave = octave - baseOctave;
		const note = i % 12;

		return -this.octaveSize * totalOctaves + relativeOctave * this.octaveSize + this.xOffset[note];
	}

	public async createAllKeys(pos: MRE.Vector3, rot = new MRE.Quaternion()) {
		const whiteKeyMesh = this.ourApp.assets.createBoxMesh('box', this.inch * 0.9, this.inch, this.inch * 5.5);
		await whiteKeyMesh.created;
		const whiteKeyCollisionMesh = this.ourApp.assets.createBoxMesh('box', this.inch * 0.9,
			this.inch, this.inch * 2.0);
		await whiteKeyCollisionMesh.created;

		const blackKeyMesh = this.ourApp.assets.createBoxMesh('box', this.halfinch, this.inch, this.inch * 3.5);
		await blackKeyMesh.created;

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


		for (let i = this.keyLowest; i < this.keyHighest; i++) {
			let meshId: MRE.Guid = blackKeyMesh.id;
			let mattId: MRE.Guid = this.ourApp.blackMat.id;
			const note = i % 12;
			//const octave = Math.floor(i / 12);

			let collisionMeshID: MRE.Guid = blackKeyMesh.id;

			if (this.zOffset[note] === 0) {
				meshId = whiteKeyMesh.id;
				mattId = this.ourApp.whiteMat.id;
				collisionMeshID = whiteKeyCollisionMesh.id;
			}

			const keyPos = new MRE.Vector3(
				this.computeKeyPositionX(i),
				this.yOffset[note],
				this.zOffset[note]);

			this.keyLocations.set(i, keyPos);

			const keyPosCollision = keyPos.clone();
			keyPosCollision.z = this.zOffsetCollision[note]; //different zPos
			this.ourKeyColliderPositions.set(i, keyPosCollision);

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
						local: { position: keyPosCollision }
					},
					appearance:
					{
						meshId: collisionMeshID,
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

	private setupBreathAnimation() {
		this.breathAnimData = this.ourApp.assets.createAnimationData("Breath", {
			tracks: [{
				target: MRE.ActorPath("target").transform.local.scale,
				keyframes: [
					{ time: 0.0, value: { x: 1.0, y: 1.0, z: 1.0 } },
					{ time: 0.5, value: { x: 1.0, y: 1.0, z: 1.0 } },
					{ time: 3.0, value: { x: 1.1, y: 1.1, z: 1.1 } },
					{ time: 3.5, value: { x: 1.1, y: 1.1, z: 1.1 } },
					{ time: 6.0, value: { x: 1.0, y: 1.0, z: 1.0 } }
				]
			}]
		});
	}

	private generateRandomPos(scale: number): MRE.Vector3 {
		return new MRE.Vector3(Math.random() * 20 - 10, Math.random() * 2 + 0.5 * scale, Math.random() * 20 - 10);
	}

	public async createAllGeos(pos: MRE.Vector3, rot = new MRE.Quaternion()) {
		this.doGeo = true;

		if (!this.ourGrabber) {
			this.createGrabber(pos, rot);
		} else {
			this.ourGrabber.setPos(pos);
			this.ourGrabber.setRot(rot);
		}

		this.setupBreathAnimation();

		this.keyboardParent = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'keyboard_parent',
				parentId: this.ourGrabber.getGUID(),
				transform: {
					local: {
						position: new MRE.Vector3(0, 0, 0),
						scale: new MRE.Vector3(this.pianoScale, this.pianoScale, this.pianoScale)
					}
				}
			}
		});

		this.ourApp.ourConsole.
			logMessage(`PIANO: creating new geo keyboard with range ${this.keyLowest} to ${this.keyHighest}`);
		//this.ourApp.ourConsole.logMessage(`octaves: ${totalOctaves}`);

		for (let i = this.keyLowest; i < this.keyHighest; i++) {
			const particleScale = Math.random() * 0.75 + 0.25;
			const particleIndex = Math.floor(Math.random() * 49);
			const keyPos = this.generateRandomPos(particleScale);

			this.keyLocations.set(i, keyPos);

			const keyPosCollision = keyPos.clone();
			this.ourKeyColliderPositions.set(i, keyPosCollision);


			const spawnRot =
				MRE.Quaternion.FromEulerAngles(Math.random() * 360, Math.random() * 360, Math.random() * 360);

			const keyPositioner = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					name: 'individualKeyParent',
					parentId: this.keyboardParent.id,
					transform: {
						local: {
							position: keyPos,
							scale: { x: particleScale, y: particleScale, z: particleScale },
							rotation: spawnRot
						}
					}
				}
			});
			this.keyPositioners.set(i, keyPositioner);

			const keyActor = MRE.Actor.CreateFromLibrary(this.ourApp.context, {
				resourceId: this.artifacts.artifacts[particleIndex],
				actor: {
					name: 'PianoKey' + i,
					parentId: keyPositioner.id,
					transform: {
						local: {
							scale: new MRE.Vector3(1.0, 1.0, 1.0)
						}
					},
					collider: {
						geometry: {
							shape: MRE.ColliderType.Sphere
						},
						isTrigger: true
					}
				}
			});

			await keyActor.created();

			this.breathAnimData.bind(
				{ target: keyActor },
				{ speed: (1 / particleScale) * 0.5, isPlaying: true, wrapMode: MRE.AnimationWrapMode.Loop });

			this.ourKeys.set(i, keyActor);
			this.ourKeyCollisionActors.set(i, keyActor);
			this.canBePicked.set(i, true);

			this.setupInteractions(i);
		}
	}

	public setupAllInteractions() {
		for (let i = this.keyLowest; i < this.keyHighest; i++) {
			this.setupInteractions(i);
		}
	}

	private setupInteractions(i: number) {
		const keyCollisionActor = this.ourKeyCollisionActors.get(i);

		keyCollisionActor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
			this.ourApp.ourConsole.logMessage("PIANO: trigger enter on piano note!");

			if (otherActor.name.includes('SpawnerUserHand') && !this.doGeo) { //bubble touches hand
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

			if (otherActor.name.includes('SpawnerUserHand') && !this.doGeo) { //bubble touches hand
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

				if (this.doGeo) {
					let oldPos = this.keyLocations.get(i).clone();

					if (this.activeAnimations.has(i)) {
						const ourAnim = this.activeAnimations.get(i);
						ourAnim.animation.stop();
						const completedTime = ourAnim.animation.normalizedTime;
						oldPos = MRE.Vector3.Lerp(ourAnim.startPos, ourAnim.endPos, completedTime / ourAnim.time);

						const index = this.ourApp.context.animations.indexOf(ourAnim.animation);
						if (index > -1) {
							this.ourApp.context.animations.splice(index, 1); //remove from global list
						}
						ourAnim.animation.delete();
						this.activeAnimations.delete(i);
					}

					this.ourApp.ourConsole.logMessage("PIANO:   available. so activating! " + i);

					this.keyPressed(i, 100)

					const newPos = this.generateRandomPos(this.keyPositioners.get(i).transform.local.scale.x);

					const dist = MRE.Vector3.Distance(oldPos, newPos);
					const speed = Math.random() * 1.0 + 0.25;
					const time = dist / speed;
					this.ourApp.ourConsole.logMessage("PIANO:   time for travel: " + time
						+ " for note: " + i);

					const travelAnimData = this.ourApp.assets.createAnimationData("Travel" + i, {
						tracks: [{
							target: MRE.ActorPath("target").transform.local.position,
							keyframes: [
								{ time: 0.0, value: { x: oldPos.x, y: oldPos.y, z: oldPos.z } },
								{ time: time, value: { x: newPos.x, y: newPos.y, z: newPos.z } }
							]
						}]
					});

					this.keyLocations.set(i, newPos);

					travelAnimData.bind(
						{ target: this.keyPositioners.get(i) },
						{ speed: 1, isPlaying: true, wrapMode: MRE.AnimationWrapMode.Once }).then((ourAnim) => {
						const ourAnimation = {
							animation: ourAnim,
							time: time,
							startPos: oldPos,
							endPos: newPos
						}
						this.activeAnimations.set(i, ourAnimation);
						ourAnim.finished().then(() => {
							const index=this.ourApp.context.animations.indexOf(ourAnim);
							if(index>-1){
								this.ourApp.context.animations.splice(index,1); //remove from global list
							}
							ourAnim.delete();
							this.activeAnimations.delete(i);
						});
					});

					/*(() => {
						const index=this.ourApp.assets.animationData.indexOf(travelAnimData);
						if(index>-1){
							this.ourApp.assets.animationData.splice(index, 1);
						}
						this.canBePicked.set(i, true);
						this.ourApp.ourConsole.logMessage("PIANO:   note: " + i +
							" has finished travel, now available");

					}, (time +0.5) * 1000.0);*/

				} else {
					this.keyPressed(i, 100);
				}
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

	public receiveData(data: number[], messageType: string) {
		if (messageType === "midi") {
			if (data.length > 1) {
				if (data[1] > 0) {
					this.keyPressed(data[0], data[1]);
				} else {
					this.keyReleased(data[0]);
				}
			}
		}
	}

	public isAccidental(n: number): boolean {
		const pitchClass = n % 12;

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

		if (this.doGeo) {
			this.keyPositioners.get(note).transform.local.position = newPos;
		} else {
			this.ourKeys.get(note).transform.local.position = newPos;
		}

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
			const noteNum = note % 12;
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

		//const noteNum = note % 12;

		const message = [note, 0, 0];
		this.sendData(message, "midi")

		const newPos = this.keyLocations.get(note).clone();

		if (this.doGeo) {
			this.keyPositioners.get(note).transform.local.position = newPos;
		} else {
			this.ourKeys.get(note).transform.local.position = newPos;
		}

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
