/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import { User } from '../../mixed-reality-extension-sdk/packages/sdk/';

import App from './app';
import MusicModule from './backend/music_module';
import Users from './backend/users';
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

interface PianoKey{
	actor: MRE.Actor;
	collisionActor: MRE.Actor;
	noteActor: MRE.Actor;
	position: MRE.Vector3;
	collisionPos: MRE.Vector3;
	touchList: MRE.Actor[];
	worldPos: MRE.Vector3;
	collisionWorldPos: MRE.Vector3;
	collisionSize: MRE.Vector3;
}

export default class Piano extends MusicModule {
	public ourInteractionAuth = AuthType.All;
	public authorizedUser: MRE.User;

	public activeNotes: Set<number> = new Set();
	public ourKeys: Map<number, PianoKey> = new Map();

	public keyboardParent: MRE.Actor;
	public breathAnimData: MRE.AnimationData;

	public keyLowest = 36;
	public keyHighest = 85;
	public pianoScale = 5.0;
	public audioRange = 50.0;
	public doSharps = true;

	public intervalMode: IntervalMode = IntervalMode.western;
	public noteNameMode: NoteNameMode = NoteNameMode.letter;

	private noteColors: MRE.Color4[] = [
		new MRE.Color4(169 / 255, 30 / 255, 16 / 255), //C
		new MRE.Color4(169 / 255, 30 / 255, 16 / 255),
		new MRE.Color4(252 / 255, 147 / 255, 8 / 255), //D
		new MRE.Color4(252 / 255, 147 / 255, 8 / 255),
		new MRE.Color4(232 / 255, 227 / 255, 14 / 255), //E
		new MRE.Color4(34 / 255, 121 / 255, 18 / 255),  //F
		new MRE.Color4(34 / 255, 121 / 255, 18 / 255),
		new MRE.Color4(23 / 255, 166 / 255, 249 / 255), //G
		new MRE.Color4(23 / 255, 166 / 255, 249 / 255),
		new MRE.Color4(19 / 255, 0 / 255, 140 / 255),   //A
		new MRE.Color4(19 / 255, 0 / 255, 140 / 255),
		new MRE.Color4(145 / 255, 0 / 255, 190 / 255)]; //B
	public noteMaterials: MRE.Material[] = [];

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

	private isBlack: boolean[] = [false, true, false, true, false, false, true, false, true, false, true, false]

	private noteNamesFlats =
		["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
	private noteNamesSharps =
		["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

	private solfegeSharpNames = ["Do", "Di", "Re", "Ri", "Mi", "Fa", "Fi", "Sol", "Si", "La", "Li", "Ti"];
	private solfegeFlatNames = ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Se", "Sol", "Le", "La", "Te", "Ti"];

	private ourIntervals: PianoIntervals = null;
	private ourTransformInverse: MRE.Matrix;
	private isKeysSetup = false;

	constructor(protected ourApp: App, public name: string) {
		super(ourApp, name);
		this.ourIntervals = new PianoIntervals(ourApp, this);

		setInterval(() => {
			if (this.isKeysSetup) {
				const allHands: Map<MRE.Actor, MRE.Vector3> = new Map();

				if (this.ourInteractionAuth === AuthType.All) {
					for (const ourUser of this.ourApp.ourUsers.allUsers) {
						if (ourUser.lHand) {
							allHands.set(ourUser.lHand,
								this.convertHandToKeySpace(ourUser.lHand.transform.app.position));
						}
						if (ourUser.rHand) {
							allHands.set(ourUser.rHand,
								this.convertHandToKeySpace(ourUser.rHand.transform.app.position));
						}
					}
				} else { //TODO, how do we not repeat above code?
					for (const ourUser of this.ourApp.ourUsers.allElevatedUsers) {
						if (ourUser.lHand) {
							allHands.set(ourUser.lHand,
								this.convertHandToKeySpace(ourUser.lHand.transform.app.position));
						}
						if (ourUser.rHand) {
							allHands.set(ourUser.rHand,
								this.convertHandToKeySpace(ourUser.rHand.transform.app.position));
						}
					}
				}


				for (const [note, key] of this.ourKeys) {
					for (const [hand, handPos] of allHands) {
						this.handleKeyTouch(note, key, hand, handPos);
					}
				}
			}
		}, 100);
	}

	private convertHandToKeySpace(handPos: MRE.Vector3): MRE.Vector3 {
		const mHand = MRE.Matrix.Compose(
			new MRE.Vector3(1, 1, 1),
			MRE.Quaternion.Identity(),
			handPos);

		const mHandTransformed = mHand.multiply(this.ourTransformInverse);
		return mHandTransformed.getTranslation();
	}

	private computeTransformInverseMatrix4() {
		const mKeyboard = MRE.Matrix.Compose(
			this.keyboardParent.transform.local.scale,
			this.keyboardParent.transform.local.rotation,
			this.keyboardParent.transform.local.position);

		const mGrabber = MRE.Matrix.Compose(
			new MRE.Vector3(1, 1, 1),
			this.ourGrabber.getRot(),
			this.ourGrabber.getPos());

		const mResult = mKeyboard.multiply(mGrabber);

		this.ourTransformInverse = mResult.invert();
	}

	private computeWorldPos(keyPos: MRE.Vector3): MRE.Vector3 {
		const mKeyboard = MRE.Matrix.Compose(
			this.keyboardParent.transform.local.scale,
			this.keyboardParent.transform.local.rotation,
			this.keyboardParent.transform.local.position);

		const mPoint = MRE.Matrix.Compose(
			new MRE.Vector3(1, 1, 1),
			MRE.Quaternion.Identity(),
			keyPos);

		const transformedPoint = mPoint.multiply(mKeyboard);
		return this.getWorldPosFromMatrix(transformedPoint);
	}

	private handleKeyTouch(note: number, key: PianoKey, hand: MRE.Actor, handPosition: MRE.Vector3){

		/*if (note === 36) {
			this.ourApp.ourConsole.logMessage("note 36 pos: " + key.position +
				" handPos: " + handPosition);
		}*/

		const keyPos = key.collisionPos;

		if (handPosition.y < (keyPos.y + key.collisionSize.y * 0.5) &&
			handPosition.y > (keyPos.y - key.collisionSize.y * 0.5)) {

			//if (note === 36) { this.ourApp.ourConsole.logMessage("hand is inside Y"); }

			if (handPosition.x < (keyPos.x + key.collisionSize.x * 0.5) &&
				handPosition.x > (keyPos.x - key.collisionSize.x * 0.5)) {

				//if (note === 36) { this.ourApp.ourConsole.logMessage("hand is inside X"); }

				if (handPosition.z < (keyPos.z + key.collisionSize.z * 0.5) &&
					handPosition.z > (keyPos.z - key.collisionSize.z * 0.5)) {
					//if (note === 36) { this.ourApp.ourConsole.logMessage("hand is inside Z"); }

					if(key.touchList.includes(hand)===false){ //only play when first touched
						this.ourApp.ourConsole.logMessage("piano key touched: " + note);
		
						this.keyPressed(note,100);
						key.touchList.push(hand);						
					} 
					return;
				}
			}
		}

		const index = key.touchList.indexOf(hand);
		if (index !== -1) {
			this.ourApp.ourConsole.logMessage("piano key released: " + note);
			key.touchList.splice(index, 1);
			this.keyReleased(note);
		}
	}

	private updateWorldPositions() {
		for (const [note, key] of this.ourKeys) {
			key.worldPos = this.computeWorldPos(key.position);
			key.collisionWorldPos = this.computeWorldPos(key.collisionPos);
		}

		this.computeTransformInverseMatrix4();
	}

	public setScale(scale: number) {
		this.pianoScale = scale;

		if (this.keyboardParent) {
			this.keyboardParent.transform.local.scale =
				new MRE.Vector3(this.pianoScale, this.pianoScale, this.pianoScale);
			
			this.updateKeyboardCenter();
			this.updateWorldPositions();
		}		
	}

	public updateKeyboardCenter() {
		const highPos = this.computepositionitionX(this.keyHighest) * this.pianoScale;

		const offset = -highPos - 0.5;

		this.keyboardParent.transform.local.position.x = offset;
	}

	public setProperKeyColor(note: number) {
		if(this.ourKeys.has(note)===false){
			return;
		}

		const key=this.ourKeys.get(note);
		
		const pitchClass = note % 12;

		let matt = this.ourApp.almostBlackMat;

		if (this.zOffset[pitchClass] === 0) {
			matt = this.ourApp.whiteMat;
		}

		key.actor.appearance.material = matt;
	}

	public setFancyKeyColor(note: number) {		

		if(this.ourKeys.has(note)===false){
			return;
		}

		const key=this.ourKeys.get(note);
		const pitchClass = note % 12;

		const materialID = this.noteMaterials[pitchClass].id;
		key.actor.appearance.materialId = materialID;
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

	/*public destroyKeys() {
		for (const keyActor of this.ourKeys.values()) {
			keyActor.destroy();
		}
		this.ourKeys.clear();
		this.keyLocations.clear();

		this.keyboardParent.destroy();
		//this.ourGrabber.destroy();
	}*/

	private computepositionitionX(i: number): number {
		const totalOctaves = Math.ceil((this.keyHighest - this.keyLowest) / 12.0);
		const baseOctave = Math.floor(this.keyLowest / 12);
		const octave = Math.floor(i / 12);
		const relativeOctave = octave - baseOctave;
		const note = i % 12;

		return -this.octaveSize * totalOctaves + relativeOctave * this.octaveSize + this.xOffset[note];
	}

	public async createAllKeys(pos: MRE.Vector3, rot = new MRE.Quaternion()) {
		for (const noteColor of this.noteColors) {
			const ourMat: MRE.Material = this.ourApp.assets.createMaterial('notemat', {
				color: noteColor
				//mainTextureId: this.sphereTexture.id
			});
			await ourMat.created;
			this.noteMaterials.push(ourMat);
		}

		const whiteKeyMesh = this.ourApp.assets.createBoxMesh('box', this.inch * 0.9, this.inch, this.inch * 5.5);
		await whiteKeyMesh.created;

		const whiteCollisionSize=new MRE.Vector3( this.inch * 0.9,this.inch, this.inch * 2.0);
		const blackCollisionSize=new MRE.Vector3(this.halfinch, this.inch, this.inch * 3.5);

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
		await this.keyboardParent.created();

		this.updateKeyboardCenter();
		this.computeTransformInverseMatrix4();

		this.ourApp.ourConsole.
			logMessage(`PIANO: creating new keyboard with range ${this.keyLowest} to ${this.keyHighest}`);

		for (let i = this.keyLowest; i < this.keyHighest; i++) {
			let meshId: MRE.Guid = blackKeyMesh.id;
			let mattId: MRE.Guid = this.ourApp.almostBlackMat.id;
			const note = i % 12;
			//const octave = Math.floor(i / 12);

			let collisionMeshID: MRE.Guid = blackKeyMesh.id;
			let collisionSize=blackCollisionSize;

			if (this.isBlack[note] === false) {
				meshId = whiteKeyMesh.id;
				mattId = this.ourApp.whiteMat.id;
				collisionMeshID = whiteKeyCollisionMesh.id;
				collisionSize=whiteCollisionSize;
			}

			const position = new MRE.Vector3(
				this.computepositionitionX(i),
				this.yOffset[note],
				this.zOffset[note]);

			const positionCollision = position.clone();
			positionCollision.z = this.zOffsetCollision[note]; //different zPos

			const keyActor = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					name: 'PianoKey' + i,
					parentId: this.keyboardParent.id,
					transform: {
						local: { position: position }
					},
					appearance:
					{
						meshId: meshId,
						materialId: mattId
					},
				}
			});
			await keyActor.created();

			const keyCollisionActor = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					name: 'CollisionPianoKey' + i,
					parentId: this.keyboardParent.id,
					transform: {
						local: { position: positionCollision }
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

			const ourKeyParameters = {
				actor: keyActor,
				collisionActor: keyCollisionActor,
				noteActor: null as MRE.Actor,
				position: position,
				collisionPos: positionCollision,
				touchList: [] as MRE.Actor[],
				worldPos: this.computeWorldPos(position),
				collisionWorldPos: this.computeWorldPos(positionCollision),
				collisionSize: collisionSize
			};

			this.ourKeys.set(i,ourKeyParameters);
			this.setupInteractions(i);
		}

		this.isKeysSetup=true;
	}	

	private setupInteractions(i: number) {
		const keyCollisionActor = this.ourKeys.get(i).collisionActor;

		/*keyCollisionActor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
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
		});*/

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
				this.ourApp.ourConsole.logMessage("PIANO: user released piano note: " + i);

				this.keyReleased(i);
			}
		});

		//TODO: only do release if user had triggered note
		buttonBehavior.onHover("exit", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				const key=this.ourKeys.get(i);
				if(key.touchList.length===0){ //don't allow exist if user is still physicall touching
					this.ourApp.ourConsole.logMessage("PIANO: user left note: " + i);
					this.keyReleased(i);
				}
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

	public isAccidental(n: number): boolean {
		const pitchClass = n % 12;

		if (pitchClass === 1 || pitchClass === 3 || pitchClass === 6 || pitchClass === 8 || pitchClass === 10) {
			return true;
		}

		return false;
	}

	public keyPressed(note: number, vel: number) {
		//this.ourApp.ourConsole.logMessage("piano received note ON message! note: " + note);

		//allow notes not on keyboatd to pass through to staff and waveplayer
		if (this.ourKeys.has(note)===false) {
			const message = [note, vel, 0]; //TODO: should make effort to calculate position
			this.sendData(message, "midi");
			return;
		}

		if(this.ourKeys.has(note)===false){
			return;
		}

		const key=this.ourKeys.get(note);

		const doSharpsComputed = this.getSharpsMode();

		const newPos = key.position.clone();
		newPos.y -= 0.01;
		key.actor.transform.local.position=newPos;

		const message = [note, vel, 0, key.worldPos.x, key.worldPos.y, key.worldPos.z];
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

			const notePosition = key.collisionPos.clone();
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

			if (key.noteActor) { //on the off chance was already created and not destroyed
				key.noteActor.destroy();
				key.noteActor=null;
			}
			key.noteActor=noteNameActor;
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

		if(this.ourKeys.has(note)===false){
			return;
		}

		if (!this.activeNotes.has(note)) {
			//this.ourApp.ourConsole.logMessage("ERROR: keyReleased called for note that was not pressed");
			return;
		}

		const key=this.ourKeys.get(note);

		const message = [note, 0, 0];
		this.sendData(message, "midi")

		key.actor.transform.local.position = key.position;
	
		if (key.noteActor) {
			key.noteActor.destroy();
			key.noteActor = null;
		}

		this.activeNotes.delete(note);
		this.setProperKeyColor(note);
		this.ourIntervals.keyReleased(note);
	}
}
