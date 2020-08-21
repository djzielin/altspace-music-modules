/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
//import WavPlayer from './wavplayer';
//import GrabButton from './grabbutton';
//import StaffSharp from './staffsharp';
//import StaffFlat from './staffflat';
import Button from './button';
import MusicModule from './music_module';

interface NoteProperties{
	timeStamp: number;
	actor: MRE.Actor;
	sharp: MRE.Actor;
	flat: MRE.Actor;
	bonusLine: MRE.Actor;
	bonusLine2: MRE.Actor;
	pos: MRE.Vector3;
	note: number;
	adjustedNote: number;
}

enum AuthType {
	Moderators=0,
	All=1,
	SpecificUser=2
  }


export default class Staff extends MusicModule {
	public ourInteractionAuth=AuthType.All;
	public authorizedUser: MRE.User;

	public doSharps=true;
	public staffTime=5.0;
	public staffWidth=4.0;
	public staffHeight=1.5;
	public showBackground=true;
	public drawThreshold=0.04;
	public doTypesetOffset=true;

	/*
		169, 30, 16
		252,147,8
		232,227,14
		34,121,18
		23,166,249
		19,0,140
		145,0,190

		a91e10
		fc9308
		e8e30e
		227912
		17a6f9
		13008c
		9100be
	*/

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

	private particleEffects: string [] = [
		"artifact:1537524726837019514", //C
		"artifact:1537524726837019514",
		"artifact:1537524692359840625", //D
		"artifact:1537524692359840625",
		"artifact:1537524704162612084", //E
		"artifact:1537524714388325238", //F
		"artifact:1537524714388325238",
		"artifact:1537524658411144041", //G
		"artifact:1537524658411144041",
		"artifact:1537524667848328043", //A
		"artifact:1537524667848328043",
		"artifact:1537524680699675501"  //B
	];

	private accidentalModels: string[] = [
		"artifact:1540938891551309885", //sharp
		"artifact:1540938899939917891",	//flat
	];

	private staffMidi: number[]=[36,38,40,41,43,45,47,48,50,52,53,55,57,59,
		60,62,64,65,67,69,71,72,74,76,77,79,81,83,84];
	private staffLineIndex: number[]=[43,47,50,53,57,64,67,71,74,77];

	public activeNotes: NoteProperties[]=[]; 
	private annotationList: MRE.Actor[]=[];

	private noteZpos: Map<number,number>=new Map();
	public noteMaterials: MRE.Material[] = [];

	private allStaffLines: MRE.Actor[]=[];

	public doParticleEffect=true;
	public audioRange=50;

	public clearButton: Button=null;
	public showClear=false;

	//public ourWavPlayer: WavPlayer;

	public staffBackground: MRE.Actor=null;
	private staffRootTime=-1;

	private isDrawing=false;
	private drawPreviousPos: MRE.Vector3;
	private drawingUser: MRE.User;

	private computedStaffScale: number;


	constructor(protected ourApp: App) {
		super(ourApp);
	}

	private drawStart(pos: MRE.Vector3){
		if(this.isDrawing){
			return;
		}
		this.drawPreviousPos=pos;
		

		this.isDrawing=true;
	}

	private convertPosBackToGrabberReference(pos: MRE.Vector3){
		let x=pos.x*this.staffWidth;
		const z=pos.z*this.staffHeight

		x-=(this.staffWidth * 0.5 + 0.5);

		return new MRE.Vector3(x,0,z);
	}	

	private drawSegment(startPos: MRE.Vector3, endPos: MRE.Vector3){
		const sPos=this.convertPosBackToGrabberReference(startPos);
		const ePos=this.convertPosBackToGrabberReference(endPos);

		const halfPos=(sPos.add(ePos)).multiply(new MRE.Vector3(0.5,0.5,0.5));	
		const length=(sPos.subtract(ePos)).length();

		const y=ePos.z-sPos.z;
		const x=ePos.x-sPos.x;

		//this.ourApp.ourConsole.logMessage(`hyp: ${length} opp: ${opposite}`);

		const tah=Math.atan2(y,x);
		//this.ourApp.ourConsole.logMessage(`tah: ${tah}`);


		const rot=MRE.Quaternion.FromEulerAngles(0,-tah,0);
		const scale=(this.staffHeight/(this.noteZpos.size+2))*1.75*0.2;

		const drawSegment = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourGrabber.getGUID(),
				name: "annotations",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.grayMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfPos,
						rotation: rot,
						scale: new MRE.Vector3(length,scale,scale)
					}
				}
			}
		});

		this.annotationList.push(drawSegment);
	}

	public updateStaffWidth() {
		this.staffBackground.transform.local.position.x = -(this.staffWidth * 0.5 + 0.5);
		this.staffBackground.transform.local.scale.x = this.staffWidth;

		for (const line of this.allStaffLines) {
			line.transform.local.position.x = -(this.staffWidth * 0.5 + 0.5);
			line.transform.local.scale.x = this.staffWidth;
		}
	}

	private computeStaffScale(){
		this.computedStaffScale = (this.staffHeight/(this.noteZpos.size+2))*1.75; 
		//this.ourApp.ourConsole.logMessage("computed staff scale is: " + this.computedStaffScale);
	}

	public updateStaffHeight() {
		this.computeStaffScale();

		this.staffBackground.transform.local.scale.y = this.computedStaffScale * 0.0591;
		this.staffBackground.transform.local.scale.z = this.staffHeight;

		const zSpacing = this.staffHeight / (this.staffMidi.length + 2);
		const zBase = -(this.staffHeight / 2.0) + zSpacing;

		for (let i = 0; i < this.staffMidi.length; i++) {
			this.noteZpos.set(this.staffMidi[i], zBase + (i + 1) * zSpacing);
		}

		for (let i = 0; i < this.allStaffLines.length; i++) {
			const line = this.allStaffLines[i];

			line.transform.local.scale.y = this.computedStaffScale * 0.118;
			line.transform.local.scale.z = this.computedStaffScale * 0.177;

			line.transform.local.position.z = this.noteZpos.get(this.staffLineIndex[i]);
		}
	}

	public async createAsyncItems(pos: MRE.Vector3, rot=new MRE.Quaternion()) {
		this.ourApp.ourConsole.logMessage("STAFF: creating staff asyn items");	

		this.createGrabber(pos,rot);

		this.ourApp.ourConsole.logMessage("STAFF: Creating Clear Button ");
		this.clearButton = new Button(this.ourApp);
		await this.clearButton.createAsync(new MRE.Vector3(0.0, 0, 0.5), this.ourGrabber.getGUID(), "Clear", "Clear",
			false, this.doClear.bind(this),0.4,0.4);
		this.clearButton.doVisualUpdates=false;
		this.clearButton.setVisible(this.showClear);

		this.staffBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourGrabber.getGUID(),
				name: "staffBackground",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.whiteMat.id,
					enabled: this.showBackground
				},
				transform: {
					local: {
						position: new MRE.Vector3(-(this.staffWidth * 0.5 + 0.5), 0, 0 ),
						scale: new MRE.Vector3(this.staffWidth, 0.005, this.staffHeight)
					}
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Auto
					}
				}
			}
		});

		this.updateStaffWidth();
		
		const buttonBehavior = this.staffBackground.setBehavior(MRE.ButtonBehavior);

		buttonBehavior.onButton("pressed", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.ourApp.ourUsers.isAuthorized(user)) {
				const penPos = buttonData.targetedPoints[0].localSpacePoint;
				const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);

				//this.ourApp.ourConsole.logMessage("user pressed on staff at: " + posVector3);
				//this.ourApp.ourConsole.logMessage("number of points: " + buttonData.targetedPoints.length);

				if(!this.isDrawing){
					this.drawStart(posVector3);
					this.drawingUser=user;
				}
			}
		});

		buttonBehavior.onButton("holding", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.ourApp.ourUsers.isAuthorized(user)) {

				if (this.isDrawing) {
					if (this.drawingUser === user) {
						//this.ourApp.ourConsole.logMessage("user is holding ");
						//this.ourApp.ourConsole.logMessage("number of points: " + buttonData.targetedPoints.length);

						for (const point of buttonData.targetedPoints) {
							const penPos = point.localSpacePoint;
							const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);
							posVector3.y = this.drawPreviousPos.y; //hack to fix MRE bug
							//this.ourApp.ourConsole.logMessage("point: " + posVector3);
							//this.ourApp.ourConsole.logMessage("prev: " + this.drawPreviousPos);

							const dist = posVector3.subtract(this.drawPreviousPos).length()
							if (dist > this.drawThreshold) {
								//this.ourApp.ourConsole.logMessage("pen dist: " + dist +
								//	" is greater then threshold: " + this.drawThreshold);
								this.drawSegment(this.drawPreviousPos, posVector3);
								this.drawPreviousPos = posVector3;
							}
						}
					}

				}
			}
		});

		buttonBehavior.onButton("released", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.ourApp.ourUsers.isAuthorized(user)) {
				const penPos = buttonData.targetedPoints[0].localSpacePoint;
				const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);
				//this.ourApp.ourConsole.logMessage("user released on staff at: " + posVector3);
				posVector3.y = this.drawPreviousPos.y; //hack to fix MRE bug

				if (this.isDrawing) {
					if (this.drawingUser === user) {
						this.drawSegment(this.drawPreviousPos, posVector3);
						this.isDrawing = false;
					}
				}
			}
		});


		buttonBehavior.onHover("exit", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.ourApp.ourUsers.isAuthorized(user)) {
				const penPos = buttonData.targetedPoints[0].localSpacePoint;
				const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);
				//this.ourApp.ourConsole.logMessage("user hover has ended at: " + posVector3);

				if (this.isDrawing) {
					if (this.drawingUser === user) {
						this.drawSegment(this.drawPreviousPos, posVector3);
						this.isDrawing = false;
					}
				}
			}
		});

		
		await this.staffBackground.created();

		const zSpacing = this.staffHeight / (this.staffMidi.length + 2);
		const zBase = -(this.staffHeight / 2.0) + zSpacing;

		for (let i = 0; i < this.staffMidi.length; i++) {
			this.noteZpos.set(this.staffMidi[i], zBase + (i + 1) * zSpacing);
		}

		this.computeStaffScale();

		for (let i = 0; i < this.staffLineIndex.length; i++) {
			const z = this.noteZpos.get(this.staffLineIndex[i]);

			const staffLine = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					parentId: this.ourGrabber.getGUID(),
					name: "staffLine",
					appearance: {
						meshId: this.ourApp.boxMesh.id,
						materialId: this.ourApp.blackMat.id //this.ourApp.whiteMat.id 
					},
					transform: {
						local: {
							position: new MRE.Vector3(-(this.staffWidth * 0.5 + 0.5), 0, z),
							scale: new MRE.Vector3(this.staffWidth,
								this.computedStaffScale * 0.118,
								this.computedStaffScale * 0.177)
						}
					}
				}
			});
			this.allStaffLines.push(staffLine);
		}

		this.updateStaffWidth();
		this.updateStaffHeight();

		for (const noteColor of this.noteColors) {
			const ourMat: MRE.Material = this.ourApp.assets.createMaterial('notemat', {
				color: noteColor
				//mainTextureId: this.sphereTexture.id
			});
			await ourMat.created;
			this.noteMaterials.push(ourMat);
		}

		this.ourApp.ourConsole.logMessage("STAFF: completed all staff object creation");
	}

	private spawnParticleEffect(pos: MRE.Vector3, scale: number, colorIndex: number) {
		if(!this.doParticleEffect){
			return;
		}
		const particleScale=scale*1.0;

		this.ourApp.ourConsole.logMessage("STAFF: creating particle at: " + pos + " with scale: " + scale);
		const particleActor = MRE.Actor.CreateFromLibrary(this.ourApp.context, {
			resourceId: this.particleEffects[colorIndex],
			actor: {
				name: 'particle burst',
				parentId: this.ourGrabber.getGUID(),
				transform: {
					local: {
						position: pos,
						scale: { x: particleScale, y: particleScale, z: particleScale }
					}
				}
			}
		});
		setTimeout(() => {
			this.ourApp.ourConsole.logMessage("STAFF: 3 seconds has expired. deleting particle effect");
			particleActor.destroy();
		}, 3000);
	}

	public destroyNote(oldNote: NoteProperties, removeFromActiveList: boolean) {
		if (oldNote.actor) {
			oldNote.actor.destroy();
		}
		if (oldNote.bonusLine) {
			oldNote.bonusLine.destroy();
		}
		if (oldNote.bonusLine2) {
			oldNote.bonusLine2.destroy();
		}
		if(oldNote.sharp){
			oldNote.sharp.destroy();
		}
		if(oldNote.flat){
			oldNote.flat.destroy();
		}
		if(removeFromActiveList){
			const index = this.activeNotes.indexOf(oldNote);
			if (index > -1) {
				this.activeNotes.splice(index, 1);
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

	public doClear() {
		this.ourApp.ourConsole.logMessage("STAFF: clearing staff");
		//clear previous notes
		for (const oldNote of this.activeNotes) {
			this.destroyNote(oldNote, false); //will just clear later
		}
		for (const annotations of this.annotationList) {
			annotations.destroy();
		}
		this.activeNotes = []; //clear array
		this.annotationList = [];
		this.staffRootTime = -1;
	}

	public receiveData(data: number[], messageType: string) {
		if (messageType === "midi") {
			if (data.length > 1) {
				this.receiveNote(data[0], data[1]);
			}
		}
	}

	private receiveNote(note: number, vel: number) {
		if (vel === 0) { //dont do anything for note off
			return;
		}

		this.ourApp.ourConsole.logMessage("STAFF: trying to spawn staff note for: " + note);
		//const octave = Math.floor(note / 12);		

		if(this.staffRootTime===-1){
			this.staffRootTime=Date.now();
		}

		let isAccidental=false;

		if(!this.noteZpos.has(note)){
			if(note<this.staffMidi[0]){
				this.ourApp.ourConsole.logMessage("STAFF: note is lower then staff, need 8VB support!");
				return;
			}
			if(note>this.staffMidi[this.staffMidi.length-1]){
				this.ourApp.ourConsole.logMessage("STAFF: note is high then staff, need 8VA support!");
				return;
			}

			//this.ourApp.ourConsole.logMessage("note must be accidental");
			isAccidental=true;
		}

		let timeDiffSeconds = (Date.now() - this.staffRootTime) / 1000.0;
		//this.ourApp.ourConsole.logMessage("note time: " + timeDiffSeconds);

		if (timeDiffSeconds > this.staffTime) { 
			this.doClear();
			this.staffRootTime=Date.now();
			timeDiffSeconds = 0;
		}

		const xPos=(timeDiffSeconds/this.staffTime)*this.staffWidth*0.9;
	
		this.createNoteAndAccidental(note,vel,isAccidental,this.doSharps,xPos,this.computedStaffScale);
	}

	public createAccidental(i: number, pos: MRE.Vector3, scale: number): MRE.Actor {
		
		this.ourApp.ourConsole.logMessage("STAFF: creating accidental");
		const accidentalActor = MRE.Actor.CreateFromLibrary(this.ourApp.context, {
			resourceId: this.accidentalModels[i],
			actor: {
				name: 'accidentalModel',
				parentId: this.ourGrabber.getGUID(),
				transform: {
					local: {
						position: pos,
						scale: new MRE.Vector3(scale,scale,scale)
					}
				}
			}
		});

		return accidentalActor;
	}


	public createNoteAndAccidental(note: number, vel: number, isAccidental: boolean, isSharp: boolean, 
		xPos: number, scale: number) {
		let adjustedNote=note;
		if(isAccidental){
			if(isSharp){			
				adjustedNote=note-1;
			}else{
				adjustedNote=note+1;
			}
		} 
		
		const zPos=this.noteZpos.get(adjustedNote);
	
		const spawnPos = new MRE.Vector3(-(this.staffWidth * 0.5 + 0.5) -
			(this.staffWidth * 0.5) * 0.9 + xPos, 0.0, zPos);

		if (this.doTypesetOffset) {
			for (const existingNote of this.activeNotes) {
				const staffDist = Math.abs(existingNote.adjustedNote - adjustedNote);
				if (staffDist < 3) { //could be neighbors
					const noteDist = Math.abs(existingNote.pos.x - spawnPos.x);
					if (noteDist < (scale*0.9)) {
						spawnPos.x = (existingNote.pos.x+(scale*0.9));
						//this.ourApp.ourConsole.logMessage("notes are too close, doing typesetting adjustment");
						break; //only ever do one adjustment
					}
				}
			}
		}

		//this.ourApp.ourConsole.logMessage("going to create note: " + note + " at pos: " + spawnPos);

		const notAdjustedNoteNum=note % 12;
		const noteNum = adjustedNote % 12;
		const ourNote = this.createNote(adjustedNote,spawnPos, scale, this.noteMaterials[noteNum]);
		ourNote.note=note;
		ourNote.adjustedNote=adjustedNote;

		if (isAccidental) {
			if (isSharp) {
				const sharpPos = spawnPos.clone();
				sharpPos.x -= scale * 1.25;
				sharpPos.y += scale * 0.1;
				ourNote.sharp=this. createAccidental(0,sharpPos,scale)
			} else {
				const flatPos = spawnPos.clone();
				flatPos.x -= scale * 0.85;
				flatPos.y += scale * 0.1;
				flatPos.z += scale *0.2;
				ourNote.flat=this. createAccidental(1,flatPos,scale)
			}
		}

		ourNote.actor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
			//.ourApp.ourConsole.logMessage("trigger enter on staff note!");

			if (otherActor.name.includes('SpawnerUserHand')) { //note touches hand
				const guid = otherActor.name.substr(16);
				//this.ourApp.ourConsole.logMessage("  full user name is: " + otherActor.name);
				//this.ourApp.ourConsole.logMessage("  guid is: " + guid);

				if (this.ourInteractionAuth === AuthType.All || this.ourApp.ourUsers.isAuthorizedString(guid)) {
					const posInWorld: MRE.Vector3 = this.getWorldPos(spawnPos);
					const message = [note, vel, 0, posInWorld.x, posInWorld.y, posInWorld.z];
					this.sendData(message,"midi");

					this.spawnParticleEffect(spawnPos, scale, noteNum);
					//this.ourApp.ourSender.send(`["/NoteOn",${ourNote.note}]`);
				}
			} else {
				//this.ourApp.ourConsole.logMessage("sphere collided with: " + otherActor.name);
			}
		});

		//can toggle between flats and sharps on black keys
		if (notAdjustedNoteNum===1 || notAdjustedNoteNum===3 || 
			notAdjustedNoteNum===6 || notAdjustedNoteNum===8 || notAdjustedNoteNum===10) {
			ourNote.actor.setBehavior(MRE.ButtonBehavior)
				.onButton("released", (user: MRE.User) => {
					if (this.isAuthorized(user)){
						this.destroyNote(ourNote,true);
						this.createNoteAndAccidental(note, vel, isAccidental, !isSharp, xPos, scale);
					}
				});
		}

		//can toggle between sharps and natural
		if (notAdjustedNoteNum === 5 || notAdjustedNoteNum === 0) {
			ourNote.actor.setBehavior(MRE.ButtonBehavior)
				.onButton("released", (user: MRE.User) => {
					if (this.isAuthorized(user)) {
						this.destroyNote(ourNote,true);
						if (isAccidental) {
							this.createNoteAndAccidental(note, vel, false, false, xPos, scale);
						} else {
							this.createNoteAndAccidental(note, vel, true, true, xPos, scale);
						}
					}
				});
		}

		//can toggle between flat and natural
		if (notAdjustedNoteNum === 4 || notAdjustedNoteNum === 11) {
			ourNote.actor.setBehavior(MRE.ButtonBehavior)
				.onButton("released", (user: MRE.User) => {
					if (this.isAuthorized(user)) {
						this.destroyNote(ourNote,true);
						if (isAccidental) {
							this.createNoteAndAccidental(note, vel, false, false, xPos, scale);
						} else {
							this.createNoteAndAccidental(note, vel, true, false, xPos, scale);
						}
					}
				});
		}
	}

	private createNote(note: number, pos: MRE.Vector3, scale: number, mat: MRE.Material): NoteProperties {

		const noteActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'sphere',
				parentId: this.ourGrabber.getGUID(),
				transform: {
					local: {
						position: pos,
						scale: new MRE.Vector3(scale, scale, scale)
					}
				},
				appearance: {
					meshId: this.ourApp.sphereMesh.id,
					materialId: mat.id
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Sphere
					},
					isTrigger: true
				}
			}
		});		

		let bonusLineActor: MRE.Actor=null;
		let bonusLineActor2: MRE.Actor=null;

		//1st bonus line
		if(note===36 || note===40 || note===60 || note===81 || note===84 || note===83 || note===38){
			const pos2=pos.clone();			

			if(note===38){
				const note2=40;
				const z=this.noteZpos.get(note2);
				pos2.z=z;
			}
			if(note===83){
				const note2=81;
				const z=this.noteZpos.get(note2);
				pos2.z=z;
			}

			bonusLineActor = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					parentId: this.ourGrabber.getGUID(),
					name: "staffLine",
					appearance: {
						meshId: this.ourApp.boxMesh.id,
						materialId: this.ourApp.blackMat.id
					},
					transform: {
						local: {
							position: pos2,
							scale: new MRE.Vector3(scale*1.5, 
								this.computedStaffScale*0.118, 
								this.computedStaffScale*0.177)
						}
					}
				}
			});
		}

		//2nd bonus line
		if(note===36 || note===84){ 
			let note2=0;
			if(note===36){
				note2=40;
			}
			if(note===84){
				note2=81;
			}

			const z=this.noteZpos.get(note2);
			const pos2=pos.clone();
			pos2.z=z;
			bonusLineActor2 = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					parentId: this.ourGrabber.getGUID(),
					name: "staffLine",
					appearance: {
						meshId: this.ourApp.boxMesh.id,
						materialId: this.ourApp.blackMat.id
					},
					transform: {
						local: {
							position: pos2,
							scale: new MRE.Vector3(scale*1.5, 
								this.computedStaffScale*0.118, 
								this.computedStaffScale*0.177)
						}
					}
				}
			});
		}

		const ourNote={
			timeStamp: Date.now(),
			actor: noteActor,
			sharp: null as MRE.Actor,
			flat: null as MRE.Actor,
			bonusLine: bonusLineActor,
			bonusLine2: bonusLineActor2,
			pos: pos,
			note: note,
			adjustedNote: note
		};

		this.activeNotes.push(ourNote);

		return ourNote;
	}
}
