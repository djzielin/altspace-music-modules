/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import { load } from 'dotenv/types';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import { Quaternion, User, Vector3 } from '../../mixed-reality-extension-sdk/packages/sdk/';

import App from './app';
import MusicModule from './backend/music_module';
import PianoIntervals from './piano_intervals';
import PianoLayout from './piano_layout';

enum AuthType {
	Moderators = 0,
	All = 1,
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

interface PianoSavedParams {
	ourInteractionAuth: AuthType;
	keyLowest: number;
	keyHighest: number;
	pianoScale: number;
	doSharps: boolean;
	isTwelveTone: boolean;
	intervalMode: IntervalMode;
	noteNameMode: NoteNameMode;
	moduleType: string; //from music module baseclass
	name: string;       //from music module baseclass
	pos: MRE.Vector3;
	rot: MRE.Quaternion;
} 

export default class Piano extends MusicModule {

	/////////////// SAVED PARAMS ///////////////
	public ourInteractionAuth = AuthType.All;
	public keyLowest = 36;
	public keyHighest = 84;
	public pianoScale = 5.0;
	public doSharps = true;
	public isTwelveTone=true;
	public intervalMode: IntervalMode = IntervalMode.western;
	public noteNameMode: NoteNameMode = NoteNameMode.letter;

	/////////////// RUNTIME ///////////////
	public activeNotes: Set<number> = new Set();
	public ourKeys: Map<number, PianoKey> = new Map();

	public keyboardParent: MRE.Actor;
	public breathAnimData: MRE.AnimationData;

	private ourIntervals: PianoIntervals = null;
	public ourLayout: PianoLayout = null;

	private ourTransformInverse: MRE.Matrix;
	private isKeysSetup = false;
	private keyboardBounds: number[] = [];
	private ourInterval: NodeJS.Timeout = null;

	private initialPos: MRE.Vector3=new Vector3();
	private initialRot: MRE.Quaternion=new Quaternion();

	/////////////// CONSTANTS ///////////////
	private readonly noteNamesFlats =
		["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
	private readonly noteNamesSharps =
		["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

	private readonly solfegeSharpNames = ["Do", "Di", "Re", "Ri", "Mi", "Fa", "Fi", "Sol", "Si", "La", "Li", "Ti"];
	private readonly solfegeFlatNames = ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Se", "Sol", "Le", "La", "Te", "Ti"];

	public ParametersAsJSON(): string {
		const params = {
			ourInteractionAuth: this.ourInteractionAuth,
			keyLowest: this.keyLowest,
			keyHighest: this.keyHighest,
			pianoScale: this.pianoScale,
			doSharps: this.doSharps,
			isTwelveTone: this.isTwelveTone,
			intervalMode: this.intervalMode,
			noteNameMode: this.noteNameMode,
			moduleType: this.moduleType,
			name: this.name,
			pos: this.ourGrabber.getPos(),
			rot: this.ourGrabber.getRot()
		}

		const jsonString = JSON.stringify(params);
		this.ourApp.ourConsole.logMessage("Piano json is: " + jsonString);
		
		return jsonString;
	}

	public LoadParametersFromJSON(input: string) {
		const loadedParams: PianoSavedParams = JSON.parse(input);

		this.ourInteractionAuth = loadedParams.ourInteractionAuth;
		this.keyLowest = loadedParams.keyLowest;
		this.keyHighest = loadedParams.keyHighest;
		this.pianoScale = loadedParams.pianoScale;
		this.doSharps = loadedParams.doSharps;
		this.isTwelveTone = loadedParams.isTwelveTone;
		this.intervalMode = loadedParams.intervalMode;
		this.noteNameMode = loadedParams.noteNameMode;
		this.moduleType=loadedParams.moduleType;
		this.moduleType=loadedParams.name;
		this.ourGrabber.setPos(loadedParams.pos);
		this.ourGrabber.setRot(loadedParams.rot);
	}

	constructor(protected ourApp: App, public name: string) {
		super(ourApp, name);
		this.moduleType="Piano";

		for (let i = 0; i < 6; i++) {
			this.keyboardBounds.push(0);
		}

		this.ourIntervals = new PianoIntervals(ourApp, this);
		this.ourLayout = new PianoLayout(ourApp, this);

		//let previousHands: Map<MRE.Actor, MRE.Vector3> = new Map();

		this.ourInterval = setInterval(() => {
			//this.ourApp.ourConsole.logMessage("PIANO: doing collision check");

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

	public destroy() {
		this.ourApp.ourConsole.logMessage("PIANO: destroy");
		clearInterval(this.ourInterval);
		//TODO: do we need to delete all objects we created?

		super.destroy();
	}

	public setInitialLocation(pos: MRE.Vector3, rot: MRE.Quaternion){
		this.initialPos=pos;
		this.initialRot=rot;
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

	public computeWorldPos(keyPos: MRE.Vector3): MRE.Vector3 {
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

	public setSize(scale: number) {
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

	private updateLowHighKey(){
		let keyLow=this.keyHighest;
		let keyHigh=this.keyLowest;

		for(const note of this.ourKeys.keys()){
			if(note<keyLow){
				keyLow=note;
			}
			if(note>keyHigh){
				keyHigh=note;
			}
		}
		this.keyHighest=keyHigh;
		this.keyLowest=keyLow;
	}

	public updatePositioning(){
		this.updateKeyboardCenter();
		this.updateWorldPositions();
		this.updateKeyBounds();
		this.updateBoundingBox();
	}

	private computeKeyboardCenterX(): number{
		const highPos = this.ourLayout.computePosX(this.keyHighest) * this.pianoScale;
		const offset = -highPos - 0.5;
		return offset;
	}

	public updateKeyboardCenter() {
		const offset=this.computeKeyboardCenterX();
		this.keyboardParent.transform.local.position.x = offset;
	}

	private isAuthorized(user: MRE.User): boolean {
		if (this.ourInteractionAuth === AuthType.All) {
			return true;
		}
		if (this.ourInteractionAuth === AuthType.Moderators) {
			return this.ourApp.ourUsers.isAuthorized(user);
		}
		/*if (this.ourInteractionAuth === AuthType.SpecificUser) {
			if (user === this.authorizedUser) {
				return true;
			}
		}*/

		return false;
	}	

	public async setTwelveTone(){
		const destroyList: number[]=[];
		for (const note of this.ourKeys.keys()) {
			if(note-Math.trunc(note)>0.0){
				destroyList.push(note);
			}
		}

		for(const n of destroyList){
			this.destroyKey(n);
			await new Promise(resolve => setTimeout(resolve, 50));
		}

		for (const note of this.ourKeys.keys()) {
			if(note-Math.trunc(note)>0.0){
				destroyList.push(note);
			}
		}

		for (const note of this.ourKeys.keys()) {
			this.ourLayout.updateKey(note);
			await new Promise(resolve => setTimeout(resolve, 50));
		}

		this.updateLowHighKey();
		this.updatePositioning();
	}

	public async setTwentyFourTone(){
		//update positions and meshes of existing keys
		for (const note of this.ourKeys.keys()) {
			this.ourLayout.updateKey(note);
			await new Promise(resolve => setTimeout(resolve, 50));
		}

		for (let i = this.keyLowest; i <=this.keyHighest; i+=0.5) {
			if(this.ourKeys.has(i)===false){
				await this.ourLayout.createKey(i);		
			}
		}	

		this.updatePositioning();
	}

	public async createAllKeys() {
		if (!this.ourGrabber) {
			this.createGrabber(this.initialPos, this.initialRot);
		} else {
			this.ourGrabber.setPos(this.initialPos);
			this.ourGrabber.setRot(this.initialRot);
		}

		await this.ourLayout.createAsync();

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

		let increment=1.0;
		if(this.isTwelveTone===false){
			increment=0.5;
		}

		for (let i = this.keyLowest; i <=this.keyHighest; i+=increment) {
			await this.ourLayout.createKey(i);
		}

		this.updatePositioning();
		this.isKeysSetup=true;
		this.ourGrabber.setGrabReleaseCallback(this.updatePositioning.bind(this));

		const param=this.ParametersAsJSON();
		this.LoadParametersFromJSON(param);

	}	

	public async setKeyLowest(n: number) {
		this.ourApp.ourConsole.logMessage("PIANO: low key was: " + this.keyLowest + " requested to: " + n);

		let incrementAmount = 1.0;

		if (this.isTwelveTone === false) {
			incrementAmount = 0.5;
		}

		if (n > this.keyLowest) { //we need to delete some keys!
			for (let i = this.keyLowest; i < n; i += incrementAmount) {
				this.keyReleased(i);
				this.destroyKey(i);
			}
		} else { //we need to add some keys
			for (let i = n; i < this.keyLowest; i += incrementAmount) {
				await this.ourLayout.createKey(i);
			}
		}

		this.keyLowest = n;
		this.updatePositioning();
	}

	public async setKeyHighest(n: number) {
		this.ourApp.ourConsole.logMessage("PIANO: high key was: " + this.keyHighest + " requested to: " + n);

		let incrementAmount = 1.0;

		if (this.isTwelveTone === false) {
			incrementAmount = 0.5;
		}

		if (n < this.keyHighest) { //we need to delete some keys!
			for (let i = n + incrementAmount; i <= this.keyHighest; i += incrementAmount) {
				this.keyReleased(i);
				this.destroyKey(i);
			}
		} else { //we need to add some keys
			for (let i = this.keyHighest + incrementAmount; i <= n; i += incrementAmount) {
				await this.ourLayout.createKey(i);
			}
		}

		this.keyHighest = n;
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

	public setupInteractions(i: number) {
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
		/*let doSharpsComputed = this.doSharps;
		if (this.ourApp.ourStaff) {
			doSharpsComputed = this.ourApp.ourStaff.doSharps;
		}
		return doSharpsComputed;*/
		return this.doSharps;
	}

	public receiveData(data: any[], messageType: string) {
		if(this.isEnabled===false){
			return;
		}
		
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

		this.ourLayout.setFancyKeyColor(note);

		if (this.noteNameMode > 0 && this.isTwelveTone) {
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
			notePosition.y += this.ourLayout.halfinch;
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

			if (this.intervalMode > 0 && this.isTwelveTone) {
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
		this.ourLayout.setProperKeyColor(note);
		this.ourIntervals.keyReleased(note);
	}
}
