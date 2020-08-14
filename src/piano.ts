/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import GrabButton from './grabbutton';
//import WavPlayer from './wavplayer';
import Staff from './staff';
import MusicModule from './music_module';

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

  interface IntervalDisplay{
	line1: MRE.Actor;
	line2: MRE.Actor;
	line3: MRE.Actor;
	text: MRE.Actor;
	note1: number;
	note2: number;
}

export default class Piano extends MusicModule{
	public ourInteractionAuth=AuthType.All;
	public authorizedUser: MRE.User;

	private activeNotes: Set<number> = new Set();
	private activeIntervals: IntervalDisplay[]=[];
	private ourKeys: Map<number,MRE.Actor>=new Map(); 
	private ourNoteNames: Map<number,MRE.Actor>=new Map();
	private ourKeyColliderPositions: Map<number,MRE.Vector3>=new Map(); 

	public keyboardParent: MRE.Actor;
	//public ourWavPlayer: WavPlayer;

	public keyLowest=36;
	public keyHighest=85;
	public pianoScale=5.0;
	public audioRange=50.0;
	public doSharps=true;

	public intervalMode: IntervalMode=IntervalMode.western;
	public noteNameMode: NoteNameMode=NoteNameMode.letter;

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
	private zOffsetCollision =
		[-this.inch * 1.75, this.inch, -this.inch * 1.75, this.inch, -this.inch * 1.75,
			-this.inch * 1.75, this.inch, -this.inch * 1.75, this.inch, -this.inch * 1.75,
			this.inch, -this.inch * 1.75];
	private octaveSize = this.inch * 7.0;

	private noteNamesFlats =
		["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
	private noteNamesSharps =
		["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

	private intervalNamesSharps = ["P1","m2","M2","m3","M3","P4","A4","P5","m6","M6","m7","M7","P8"];
	private intervalNamesFlats = ["P1","m2","M2","m3","M3","P4","d5","P5","m6","M6","m7","M7","P8"];

	private jazzNames= ["1","♭2","2","min3","maj3","4","♭5","5","♯5","6","7","maj7","oct",
		"♭9","9","♯9","10","11","♯11","12","♭13","13","7","maj7","2oct"];
	private solfegeSharpNames=["Do","Di","Re","Ri","Mi","Fa","Fi","Sol","Si","La","Li","Ti"];
	private solfegeFlatNames=["Do","Ra","Re","Me","Mi","Fa","Se","Sol","Le","La","Te","Ti"];

	private whiteKeyMaterial: MRE.Material = null;
	private blackKeyMaterial: MRE.Material = null;
	private redKeyMaterial: MRE.Material= null;

	private keyLocations: Map<number,MRE.Vector3>=new Map();

	constructor(protected ourApp: App) {
		super(ourApp);
		this.whiteKeyMaterial = this.ourApp.assets.createMaterial('cubemat', {
			color: new MRE.Color4(1, 1, 1)
		});
		this.blackKeyMaterial = this.ourApp.assets.createMaterial('cubemat', {
			color: new MRE.Color4(0, 0, 0)
		});
	}

	public setScale(scale: number){
		this.pianoScale=scale;
		this.keyboardParent.transform.local.scale=new MRE.Vector3(this.pianoScale, this.pianoScale, this.pianoScale);
		this.updateKeyboardCenter();
	}

	public updateKeyboardCenter(){
		const highPos=this.computeKeyPositionX(this.keyHighest)*this.pianoScale;

		const offset=-highPos-0.5;

		this.keyboardParent.transform.local.position.x=offset;
	}

	public setProperKeyColor(midiNote: number) {
		const note = midiNote % 12;

		let matt = this.blackKeyMaterial;

		if (this.zOffset[note] === 0) {
			matt = this.whiteKeyMaterial;
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

	private isAuthorized(user: MRE.User): boolean{
		if(this.ourInteractionAuth===AuthType.All){
			return true;
		}
		if(this.ourInteractionAuth===AuthType.Moderators){
			return this.ourApp.ourUsers.isAuthorized(user);
		}
		if(this.ourInteractionAuth===AuthType.SpecificUser){
			if(user===this.authorizedUser){
				return true;
			}
		}

		return false;
	}

	public destroyKeys(){
		for(const keyActor of this.ourKeys.values()){
			keyActor.destroy();
		}
		this.ourKeys.clear();
		this.keyLocations.clear();

		this.keyboardParent.destroy();
		//this.ourGrabber.destroy();
	}

	private computeKeyPositionX(i: number): number{
		const totalOctaves=Math.ceil((this.keyHighest-this.keyLowest)/12.0);
		const baseOctave=Math.floor(this.keyLowest / 12);
		const octave = Math.floor(i / 12);
		const relativeOctave=octave-baseOctave;
		const note = i % 12;

		return -this.octaveSize * totalOctaves + relativeOctave * this.octaveSize + this.xOffset[note];
	}

	public async createAllKeys(pos: MRE.Vector3,rot=new MRE.Quaternion()) {
		const whiteKeyMesh = this.ourApp.assets.createBoxMesh('box', this.inch * 0.9, this.inch, this.inch * 5.5);
		await whiteKeyMesh.created;
		const whiteKeyCollisionMesh = this.ourApp.assets.createBoxMesh('box', this.inch * 0.9, 
			this.inch, this.inch * 2.0);
		await whiteKeyCollisionMesh.created;

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

		
		if(!this.ourGrabber){
			this.createGrabber(pos,rot);
		}else{
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

		this.ourApp.ourConsole.logMessage(`creating new keyboard with range ${this.keyLowest} to ${this.keyHighest}`);
		//this.ourApp.ourConsole.logMessage(`octaves: ${totalOctaves}`);
		

		for (let i = this.keyLowest; i < this.keyHighest; i++) {
			let meshId: MRE.Guid = blackKeyMesh.id;
			let mattId: MRE.Guid = blackKeyMaterial.id;
			const note = i % 12;
			//const octave = Math.floor(i / 12);

			let collisionMeshID: MRE.Guid = blackKeyMesh.id;

			if (this.zOffset[note] === 0) {
				meshId = whiteKeyMesh.id;
				mattId = whiteKeyMaterial.id;
				collisionMeshID=whiteKeyCollisionMesh.id;
			}

			const keyPos = new MRE.Vector3(
				this.computeKeyPositionX(i), 
				this.yOffset[note],
				this.zOffset[note]);

			this.keyLocations.set(i,keyPos); 

			const keyPosCollision = keyPos.clone();
			keyPosCollision.z=this.zOffsetCollision[note]; //different zPos

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

			this.ourKeyColliderPositions.set(i,keyPosCollision);

			keyCollisionActor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
				this.ourApp.ourConsole.logMessage("trigger enter on piano note!");

				if (otherActor.name.includes('SpawnerUserHand')) { //bubble touches hand
					const guid = otherActor.name.substr(16);
					//this.ourApp.ourConsole.logMessage("  full user name is: " + otherActor.name);
					//this.ourApp.ourConsole.logMessage("  guid is: " + guid);

					if (this.ourInteractionAuth === AuthType.All || this.ourApp.ourUsers.isAuthorizedString(guid)) {
						this.keyPressed(i,100);						
					}

				} else {
					//this.ourApp.ourConsole.logMessage("sphere collided with: " + otherActor.name);
				}
			});

			keyCollisionActor.collider.onTrigger("trigger-exit", (otherActor: MRE.Actor) => {
				this.ourApp.ourConsole.logMessage("trigger enter on piano note!");

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

					this.ourApp.ourConsole.logMessage("user clicked on piano note!");
					this.keyPressed(i,100);
				}
			});
			buttonBehavior.onButton("released", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
				if (this.isAuthorized(user)) {
					this.keyReleased(i);
				}
			});
			buttonBehavior.onHover("exit", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
				if (this.isAuthorized(user)) {
					this.keyReleased(i);
				}
			});

			await keyCollisionActor.created();

			this.ourKeys.set(i,keyActor);
		}
	}

	private halfWay(a: MRE.Vector3, b: MRE.Vector3): MRE.Vector3 {
		return (a.add(b)).multiplyByFloats(0.5,0.5,0.5);
	}

	private getLength(a: MRE.Vector3, b: MRE.Vector3): number {
		return (a.subtract(b)).length();
	}

	
	public drawInterval(ourInterval: IntervalDisplay, intervalName: string){
		const notePosition1=this.ourKeyColliderPositions.get(ourInterval.note1).clone();
		const notePosition2=this.ourKeyColliderPositions.get(ourInterval.note2).clone();
		notePosition1.z+=0.02; //so we dont cover the note name
		notePosition2.z+=0.02;
		
		notePosition1.y-=0.01;
		notePosition2.y-=0.01;
		notePosition1.y+=this.halfinch;
		notePosition2.y+=this.halfinch;
		notePosition1.y+=0.001;
		notePosition2.y+=0.001;

		const notePosition1b=notePosition1.clone();
		notePosition1b.y=0;

		const notePosition2b=notePosition2.clone();
		notePosition2b.y=0;

		const halfwayPoint=this.halfWay(notePosition1b,notePosition2b);
		halfwayPoint.y=this.halfinch+0.06;

		const towardsPoint2=(notePosition2b.subtract(notePosition1b)).normalize();

		halfwayPoint.y+=0.06;

		/*if (noteName.includes("#") || noteName.includes("b")) {
			notePosition.x += 0.008;
		} else {
			notePosition.x += 0.016;
		}*/

		const intervalTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'noteName',
				parentId: this.keyboardParent.id,
				transform: {
					local: {
						position: halfwayPoint,
						scale: new MRE.Vector3(this.pianoScale,this.pianoScale,this.pianoScale)
						//rotation: MRE.Quaternion.FromEulerAngles(90 * Math.PI / 180, 0, 0)
					}
				},
				text: {
					contents: intervalName,
					color: { r: 0.25, g: 0.25, b: 0.25 },
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					height: 0.005
				}
			}
		}); 

		/*const arrowActor3 = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.keyboardParent.id,
				name: "arrow",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.redMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfwayPoint,
						scale: new MRE.Vector3(0.002,0.002,0.002)
					}
				}
			}
		});*/

		halfwayPoint.y-=0.01;

		
		const insetAmount=0.01;
		const linePosition1=halfwayPoint.add(towardsPoint2.multiplyByFloats(-insetAmount,-insetAmount,-insetAmount));
		const linePosition2=halfwayPoint.add(towardsPoint2.multiplyByFloats(insetAmount,insetAmount,insetAmount));

		const halfwayLine1=this.halfWay(linePosition1, notePosition1); 
		const distance1=this.getLength(linePosition1, notePosition1);

		const arrowActor1 = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.keyboardParent.id,
				name: "arrow",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.grayMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfwayLine1,
						rotation: MRE.Quaternion.LookAt(notePosition1,linePosition1),
						scale: new MRE.Vector3(0.001,0.001,distance1)
					}
				}
			}
		});

		const halfwayLine2 = this.halfWay(notePosition2, linePosition2);
		const distance2 = this.getLength(notePosition2, linePosition2);

		const arrowActor2 = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.keyboardParent.id,
				name: "arrow",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.grayMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfwayLine2,
						rotation: MRE.Quaternion.LookAt(notePosition2,linePosition2),
						scale: new MRE.Vector3(0.001,0.001,distance2)
					}
				}
			}
		});

		const halfwayLine3=this.halfWay(linePosition1, linePosition2);
		const distance3=this.getLength(linePosition1,linePosition2);

		const arrowActor3 = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.keyboardParent.id,
				name: "arrow",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.grayMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfwayLine3,
						rotation: MRE.Quaternion.LookAt(linePosition1,linePosition2),
						scale: new MRE.Vector3(0.001,0.001,distance3)
					}
				}
			}
		});

		ourInterval.text=intervalTextActor;
		ourInterval.line1=arrowActor1;	
		ourInterval.line2=arrowActor2;
		ourInterval.line3=arrowActor3;
	}

	private addInterval(note1: number, note2: number){
		let noteDistance = note2 - note1;
		this.ourApp.ourConsole.logMessage("computed note distance: " + noteDistance);
		
		let intervalName = "";

		if (this.intervalMode === IntervalMode.western) {
			while (noteDistance > 12) {
				noteDistance -= 12;
			}
			const doSharpsComputed = this.getSharpsMode();
			if(doSharpsComputed){
				intervalName = this.intervalNamesSharps[noteDistance];
			}else{
				intervalName = this.intervalNamesFlats[noteDistance];
			}
		} else if (this.intervalMode === IntervalMode.numerical) {
			while (noteDistance > 11) {
				noteDistance -= 12;
			}
			intervalName = noteDistance.toString();
		} else if (this.intervalMode === IntervalMode.jazz) {
			while (noteDistance > 24) {
				noteDistance -= 12;
			}
			intervalName = this.jazzNames[noteDistance];
		}

		const ourInterval = {
			line1: null as MRE.Actor,
			line2: null as MRE.Actor,
			line3: null as MRE.Actor,
			text: null as MRE.Actor,
			note1: note1,
			note2: note2
		};

		this.ourApp.ourConsole.logMessage("interval name is: " + intervalName);
		this.drawInterval(ourInterval, intervalName);

		this.activeIntervals.push(ourInterval);
	}

	private getSharpsMode(){ //TODO sharp mode should really be pulled out into a global setting
		let doSharpsComputed = this.doSharps;
		if (this.ourApp.ourStaff) {
			doSharpsComputed = this.ourApp.ourStaff.doSharps;
		}
		return doSharpsComputed;
	}

	public receiveData(data: number[]) {
		if (data.length > 1) {
			if (data[1] > 0) {
				this.keyPressed(data[0], data[1]);
			} else {
				this.keyReleased(data[0]);
			}
		}
	}

	

	public keyPressed(note: number, vel: number) {
		//this.ourApp.ourConsole.logMessage("piano received note ON message! note: " + note);

		if (!this.ourKeys.has(note) || (!this.keyLocations.has(note))){
			return;
		}

		const doSharpsComputed = this.getSharpsMode();

		const newPos = this.keyLocations.get(note).clone();
		newPos.y-=0.01;

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

		const message = [note, vel, posInWorld.x, posInWorld.y, posInWorld.z];
		this.sendData(message);

		this.setFancyKeyColor(note);

		if (this.noteNameMode > 0) {
			const noteNum = note % 12;
			let noteName = "";
			let noteHeight=0.005;

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
				noteHeight=noteHeight*0.5;
			}


			const notePosition = this.ourKeyColliderPositions.get(note).clone();
			notePosition.y -= 0.01;
			notePosition.y += this.halfinch;
			notePosition.y += 0.001;

			if (noteName.includes("#") || noteName.includes("b")) {
				notePosition.x += 0.008;
			} else {
				notePosition.x += 0.016;
			}

			//this.ourApp.ourConsole.logMessage("Creating note name: " + noteName + " at pos: " + notePosition);

			const noteNameActor = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					name: 'noteName',
					parentId: this.keyboardParent.id,
					transform: {
						local: {
							position: notePosition,
							scale: new MRE.Vector3(this.pianoScale,this.pianoScale,this.pianoScale),
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

			if(this.ourNoteNames.has(note)){ //on the off chance was already created and not destroyed
				this.ourNoteNames.get(note).destroy();
			}
			this.ourNoteNames.set(note,noteNameActor);
		}	

		if (!this.activeNotes.has(note)) {

			if (this.intervalMode>0) {
				if (this.activeNotes.size > 0) {
					let lowestNote = this.activeNotes.values().next().value;
					let highestNote = lowestNote;

					for (const otherNote of this.activeNotes) {
						if (otherNote !== note) {
							if (otherNote < lowestNote) {
								lowestNote = otherNote;
							}
							if (otherNote > highestNote) {
								highestNote = otherNote;
							}
						}
					}

					if (note < lowestNote || note > highestNote) {
						let note1 = 0;
						let note2 = 0;

						if (note < lowestNote) {
							note1 = note;
							note2 = lowestNote;
						}
						if (note > highestNote) {
							note1 = highestNote;
							note2 = note;
						}
						this.addInterval(note1,note2);
					
					} else {
						for (const singleInterval of this.activeIntervals) {
							if(note>singleInterval.note1 && note<singleInterval.note2){
								const oldNote1=singleInterval.note1;
								const oldNote2=singleInterval.note2;

								this.destroyInterval(singleInterval);
								const index = this.activeIntervals.indexOf(singleInterval);
								this.activeIntervals.splice(index, 1);

								this.addInterval(oldNote1,note); //now have 2 intervals
								this.addInterval(note,oldNote2);
								break;
							}
						}
					}
				}				
			}
			this.activeNotes.add(note);
			//this.ourApp.ourMidiSender.send(`[144,${note},${vel}]`)
		}
	}

	private destroyInterval(singleInterval: IntervalDisplay){
		if (singleInterval.line1) {
			singleInterval.line1.destroy();
		}
		if (singleInterval.line2) {
			singleInterval.line2.destroy();
		}
		if (singleInterval.line3) {
			singleInterval.line3.destroy();
		}
		if (singleInterval.text) {
			singleInterval.text.destroy();
		}
	}

	public keyReleased(note: number) {
		//this.ourApp.ourConsole.logMessage("piano received note OFF message! note: " + note);

		if(!this.ourKeys.has(note)){
			//this.ourApp.ourConsole.logMessage("ERROR: note is outside the range of our piano");
			return;
		}		
		
		if(!this.activeNotes.has(note)){
			//this.ourApp.ourConsole.logMessage("ERROR: keyReleased called for note that was not pressed");
			return;
		}

		//const noteNum = note % 12;

		const message=[note,0];
		this.sendData(message)
		
		const newPos = this.keyLocations.get(note).clone();
		this.ourKeys.get(note).transform.local.position = newPos;

		if(this.ourNoteNames.has(note)){
			const noteName=this.ourNoteNames.get(note);
			noteName.destroy();
		}
		
		//this.ourApp.ourMidiSender.send(`[128,${note},0]`)
		this.activeNotes.delete(note);
		this.setProperKeyColor(note);

		if (this.intervalMode>0) {
			const intervalsToDelete: IntervalDisplay[] = [];

			let outerLeft=-1;
			let outerRight=-1;

			for (const singleInterval of this.activeIntervals) {
				if (singleInterval.note1 === note || singleInterval.note2 === note) {
					if(singleInterval.note1===note){
						outerRight=singleInterval.note2;
					}
					if(singleInterval.note2===note){
						outerLeft=singleInterval.note1;
					}
					this.destroyInterval(singleInterval);
					intervalsToDelete.push(singleInterval);
				}
			}			

			for (const singleInterval of intervalsToDelete) {
				const index = this.activeIntervals.indexOf(singleInterval);
				this.activeIntervals.splice(index, 1);
			}

			if(outerLeft!==-1 && outerRight!==-1){
				this.addInterval(outerLeft,outerRight);
			}
		}
	}
}
