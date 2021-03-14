/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import { User } from '../../mixed-reality-extension-sdk/packages/sdk/';

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

interface PianoKey{
	actor: MRE.Actor;
	collisionActor: MRE.Actor;
	noteActor: MRE.Actor;
	position: MRE.Vector3;
	collisionPos: MRE.Vector3;
	touchList: MRE.Actor[];
	worldPos: MRE.Vector3;
	keyBounds: number[];
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
	public keyHighest = 84;
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


	private whiteKeySize: MRE.Vector3;
	private whiteCollisionSize: MRE.Vector3;

	private blackKeySize: MRE.Vector3;
	private blackCollisionSize: MRE.Vector3;	 

	private whiteKeyMesh: MRE.Mesh;
	private whiteKeyCollisionMesh: MRE.Mesh;
	private blackKeyMesh: MRE.Mesh; 

	private keyboardBounds: number[]=[];

	constructor(protected ourApp: App, public name: string) {
		super(ourApp, name);

		for(let i=0;i<6;i++){
			this.keyboardBounds.push(0);
		}
	
		this.whiteKeySize=new MRE.Vector3(this.inch * 0.9, this.inch, this.inch * 5.5);
		this.whiteCollisionSize=new MRE.Vector3( this.inch * 0.9,this.inch, this.inch * 2.0);
		this.blackKeySize=new MRE.Vector3(this.halfinch, this.inch, this.inch * 3.5);
		this.blackCollisionSize=this.blackKeySize.clone();		
		
		this.ourIntervals = new PianoIntervals(ourApp, this);

		//let previousHands: Map<MRE.Actor, MRE.Vector3> = new Map();

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
				for (const [hand, handPos] of allHands) {
					//this.ourApp.ourConsole.logMessage("hand pos: " + handPos);

					if (this.isInsideBoundingBox(handPos)) {
						this.ourApp.ourConsole.logMessage("hand is inside piano bounding box!");
						for (const [note, key] of this.ourKeys) {

							//experiments with lerping between current and prev hand pos
							//if(previousHands.has(hand)){
							//	const prevPos=previousHands.get(hand);
							//	for(let t=0.0;t<=1.0;t+=0.1){
							//		const interpPos=MRE.Vector3.Lerp(prevPos,handPos,t);
							//		this.handleKeyTouch(note, key, hand, interpPos);
							//	} else {
							//	this.handleKeyTouch(note, key, hand, handPos);
							//}							

							this.handleKeyTouch(note, key, hand, handPos);
						}
					} else {
						for (const [note, key] of this.ourKeys) {
							this.touchRelease(note, key, hand);
						}
					}
				}
				//previousHands=allHands;
			}
		}, 100);
	}

	private isInsideBoundingBox(pos: MRE.Vector3) {

		if (pos.x < this.keyboardBounds[0] &&
			pos.x > this.keyboardBounds[1]) {

			if (pos.y < this.keyboardBounds[2] &&
				pos.y > this.keyboardBounds[3]) {

				if (pos.z < this.keyboardBounds[4] &&
					pos.z > this.keyboardBounds[5]) {
					return true;
				}
			}
		}
		return false;
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

	private updateWorldPositions() {
		for (const key of this.ourKeys.values()) {
			key.worldPos = this.computeWorldPos(key.position);
			key.collisionWorldPos = this.computeWorldPos(key.collisionPos);
		}

		this.computeTransformInverseMatrix4();
	}

	private handleKeyTouch(note: number, key: PianoKey, hand: MRE.Actor, handPosition: MRE.Vector3){

		/*if (note === 36) {
			this.ourApp.ourConsole.logMessage("note 36 pos: " + key.position +
				" handPos: " + handPosition);
		}*/

		const keyPos = key.collisionPos;

		if (handPosition.x < key.keyBounds[0] &&
			handPosition.x > key.keyBounds[1]) {

			//if (note === 36) { this.ourApp.ourConsole.logMessage("hand is inside Y"); }

			if (handPosition.y < key.keyBounds[2] &&
				handPosition.y > key.keyBounds[3]) {

				//if (note === 36) { this.ourApp.ourConsole.logMessage("hand is inside X"); }

				if (handPosition.z < key.keyBounds[4] &&
					handPosition.z > key.keyBounds[5]) {
					//if (note === 36) { this.ourApp.ourConsole.logMessage("hand is inside Z"); }

					if (key.touchList.includes(hand) === false) { //only play when first touched
						this.ourApp.ourConsole.logMessage("piano key touched: " + note);

						this.keyPressed(note, 100);
						key.touchList.push(hand);
					}
					return;
				}
			}
		}

		this.touchRelease(note,key,hand);
	}

	public touchRelease(note: number, key: PianoKey, hand: MRE.Actor) {
		const index = key.touchList.indexOf(hand);
		if (index !== -1) {
			this.ourApp.ourConsole.logMessage("piano key released: " + note);
			key.touchList.splice(index, 1);
			this.keyReleased(note);
		}
	}

	public setScale(scale: number) {
		this.pianoScale = scale;

		if (this.isKeysSetup) {
			this.keyboardParent.transform.local.scale =
				new MRE.Vector3(this.pianoScale, this.pianoScale, this.pianoScale);
			
			this.updatePositioning();
		} else{
			this.ourApp.ourConsole.logMessage("ERROR: trying to set scale before setup is complete!");
		}
	}

	private updateBoundingBox(){
		for(let i=0;i<6;i++){
			this.keyboardBounds[i]=0;
		}	

		for(const key of this.ourKeys.values()){
			this.keyboardBounds[0]=Math.max(key.keyBounds[0],this.keyboardBounds[0])
			this.keyboardBounds[1]=Math.min(key.keyBounds[1],this.keyboardBounds[1])
			this.keyboardBounds[2]=Math.max(key.keyBounds[2],this.keyboardBounds[2])
			this.keyboardBounds[3]=Math.min(key.keyBounds[3],this.keyboardBounds[3])
			this.keyboardBounds[4]=Math.max(key.keyBounds[4],this.keyboardBounds[4])
			this.keyboardBounds[5]=Math.min(key.keyBounds[5],this.keyboardBounds[5])
		}
		this.ourApp.ourConsole.logMessage("PIANO BOUNDING BOX IS NOW:");
		this.ourApp.ourConsole.logMessage("X: " + this.keyboardBounds[0] + " " + this.keyboardBounds[1]);
		this.ourApp.ourConsole.logMessage("Y: " + this.keyboardBounds[2] + " " + this.keyboardBounds[3]);
		this.ourApp.ourConsole.logMessage("Z: " + this.keyboardBounds[4] + " " + this.keyboardBounds[5]);

	}

	private updateKeyBounds(){

		for(const key of this.ourKeys.values()){
			key.keyBounds[0]=key.collisionPos.x + key.collisionSize.x * 0.5;
			key.keyBounds[1]=key.collisionPos.x - key.collisionSize.x * 0.5;

			key.keyBounds[2]=key.collisionPos.y + key.collisionSize.y * 0.5;
			key.keyBounds[3]=key.collisionPos.y - key.collisionSize.y * 0.5;

			key.keyBounds[4]=key.collisionPos.z + key.collisionSize.z * 0.5;
			key.keyBounds[5]=key.collisionPos.z - key.collisionSize.z * 0.5;
		}
	}

	public updatePositioning(){
		this.updateKeyboardCenter();
		this.updateWorldPositions();
		this.updateKeyBounds();
		this.updateBoundingBox();
	}

	private computeKeyboardCenterX(): number{
		const highPos = this.computePosX(this.keyHighest) * this.pianoScale;
		const offset = -highPos - 0.5;
		return offset;
	}

	public updateKeyboardCenter() {
		const offset=this.computeKeyboardCenterX();
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

	private computePosX(i: number): number {
		const centerNote=60;
		let noteDiff=i-centerNote;
		let baseX=0.0;

		const octaves=Math.floor(noteDiff/12.0);
		baseX+=octaves*this.octaveSize;
		noteDiff-=octaves*12;

		if(noteDiff>0){
			baseX+=this.xOffset[noteDiff]; //add remaining notes
		}
		if(noteDiff<0){
			baseX-=this.octaveSize; //go down one octave
			baseX+=this.xOffset[12+noteDiff]; //and back up
		}

		return baseX;
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

		this.whiteKeyMesh = this.ourApp.assets.createBoxMesh('box',
			this.whiteKeySize.x,
			this.whiteKeySize.y,
			this.whiteKeySize.z);
		await this.whiteKeyMesh.created;

		this.whiteKeyCollisionMesh = this.ourApp.assets.createBoxMesh('box',
			this.whiteCollisionSize.x,
			this.whiteCollisionSize.y,
			this.whiteCollisionSize.z);
		await this.whiteKeyCollisionMesh.created;

		this.blackKeyMesh = this.ourApp.assets.createBoxMesh('box',
			this.blackKeySize.x,
			this.blackKeySize.y,
			this.blackKeySize.z);
		await this.blackKeyMesh.created;

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
						position: new MRE.Vector3(this.computeKeyboardCenterX(), 0, 0),
						scale: new MRE.Vector3(this.pianoScale, this.pianoScale, this.pianoScale)
					}
				}
			}
		});
		await this.keyboardParent.created();

		this.ourApp.ourConsole.
			logMessage(`PIANO: creating new keyboard with range ${this.keyLowest} to ${this.keyHighest}`);

		for (let i = this.keyLowest; i <=this.keyHighest; i++) {
			await this.createKey(i);
		}

		this.updatePositioning();
		this.isKeysSetup=true;
		this.ourGrabber.setGrabReleaseCallback(this.updatePositioning.bind(this));
	}	

	private async createKey(i: number) {
		this.ourApp.ourConsole.logMessage("PIANO: creating key: " + i);

		const pitchClass = i % 12;
		//const octave = Math.floor(i / 12);

		let meshId: MRE.Guid = this.blackKeyMesh.id;
		let mattId: MRE.Guid = this.ourApp.almostBlackMat.id;
		let collisionMeshID: MRE.Guid = this.blackKeyMesh.id;
		let collisionSize = this.blackCollisionSize;

		if (this.isBlack[pitchClass] === false) {
			meshId = this.whiteKeyMesh.id;
			mattId = this.ourApp.whiteMat.id;
			collisionMeshID = this.whiteKeyCollisionMesh.id;
			collisionSize = this.whiteCollisionSize;
		}

		const position = new MRE.Vector3(
			this.computePosX(i),
			this.yOffset[pitchClass],
			this.zOffset[pitchClass]);

		const positionCollision = position.clone();
		positionCollision.z = this.zOffsetCollision[pitchClass]; //different zPos

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
			collisionSize: collisionSize,
			keyBounds: [] as number[]
		};

		for(let e=0;e<6;e++){
			ourKeyParameters.keyBounds.push(0);
		}

		this.ourKeys.set(i, ourKeyParameters);
		this.setupInteractions(i);
	}

	public async setKeyLowest(n: number){
		this.ourApp.ourConsole.logMessage("PIANO: low key was: " + this.keyLowest + " requested to: " + n);

		if(n>this.keyLowest){ //we need to delete some keys!
			for(let i=this.keyLowest;i<n;i++){
				this.keyReleased(i);
				this.destroyKey(i);
			}
		} else{ //we need to add some keys
			for(let i=n;i<this.keyLowest;i++){
				await this.createKey(i);
			}
		}

		this.keyLowest=n;
		this.updatePositioning();
	}

	public async setKeyHighest(n: number){
		this.ourApp.ourConsole.logMessage("PIANO: high key was: " + this.keyHighest + " requested to: " + n);

		if(n<this.keyHighest){ //we need to delete some keys!
			for(let i=n+1;i<=this.keyHighest;i++){
				this.keyReleased(i);
				this.destroyKey(i);
			}
		} else{ //we need to add some keys
			for(let i=this.keyHighest+1;i<=n;i++){
				await this.createKey(i);
			}
		}

		this.keyHighest=n;
		this.updatePositioning();
	}

	public destroyKey(i: number){
		this.ourApp.ourConsole.logMessage("PIANO: destroying key: " + i);

		if(this.ourKeys.has(i)){
			const key=this.ourKeys.get(i);
			key.actor.destroy();
			key.collisionActor.destroy();
			if(key.noteActor){
				key.noteActor.destroy();
			}
			key.touchList=null;
			this.ourKeys.delete(i);
		}
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

		buttonBehavior.onButton("released", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				this.ourApp.ourConsole.logMessage("PIANO: user released piano note: " + i);

				this.keyReleased(i);
			}
		});

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
