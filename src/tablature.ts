/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import WavPlayer from './wavplayer';
import GrabButton from './grabbutton';

interface NoteProperties{
	timeStamp: number;
	actor: MRE.Actor;
	pos: MRE.Vector3;
	note: number;
}

enum AuthType {
	Moderators=0,
	All=1,
	SpecificUser=2
  }


export default class Staff {
	public ourInteractionAuth=AuthType.All;
	public authorizedUser: MRE.User;

	public staffTime=5.0;
	public staffWidth=4.0;
	public staffHeight=0.75;
	public showBackground=true;
	public drawThreshold=0.04;

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

	private stringRoots: number[]=[40,45,50,55,59,64];

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
		"artifact:1520777605018550624", //C
		"artifact:1520777605018550624",
		"artifact:1520777597938565470", //D
		"artifact:1520777597938565470",
		"artifact:1520777583518548308", //E
		"artifact:1520777576572780882", //F
		"artifact:1520777576572780882",
		"artifact:1520777562286981452", //G
		"artifact:1520777562286981452",
		"artifact:1520777568838484302", //A
		"artifact:1520777568838484302",
		"artifact:1520777590866968922"  //B
	]

	private staffGrabber: GrabButton=null;
	public activeNotes: NoteProperties[]=[]; 

	private stringZpos: Map<number,number>=new Map();

	private allStaffLines: MRE.Actor[]=[];

	public doParticleEffect=true;
	public audioRange=50;

	public ourWavPlayer: WavPlayer;

	public staffBackground: MRE.Actor=null;
	private staffRootTime=-1;

	private isDrawing=false;
	private drawPreviousPos: MRE.Vector3;
	private drawingUser: MRE.User;
	private annotationList: MRE.Actor[]=[];

	private computedStaffScale: number;


	constructor(private ourApp: App) {

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
		this.ourApp.ourConsole.logMessage(`tah: ${tah}`);


		const rot=MRE.Quaternion.FromEulerAngles(0,-tah,0);
		const scale=(this.staffHeight/(this.stringZpos.size+2))*1.75*0.2;

		const drawSegment = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.staffGrabber.getGUID(),
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
		this.computedStaffScale = (this.staffHeight/(this.stringZpos.size*(6+2)))*1.75; 
		this.ourApp.ourConsole.logMessage("computed staff scale is: " + this.computedStaffScale);
	}

	private computeZspacing(){
		const zSpacing = this.staffHeight / (this.stringRoots.length + 4);
		const zBase = -(this.staffHeight / 2.0) + zSpacing*(2.5);

		for (let i = 0; i < this.stringRoots.length; i++) {
			this.stringZpos.set(i, zBase + i * zSpacing);
		}
	}

	public updateStaffHeight() {
		this.computeStaffScale();

		this.staffBackground.transform.local.scale.y = this.computedStaffScale * 0.0591;
		this.staffBackground.transform.local.scale.z = this.staffHeight;

		this.computeZspacing();

		for (let i = 0; i < this.allStaffLines.length; i++) {
			const line=this.allStaffLines[i];
			line.transform.local.scale.y = this.computedStaffScale * 0.118;
			line.transform.local.scale.z = this.computedStaffScale * 0.177;

			line.transform.local.position.z = this.stringZpos.get(i);
		}
	}

	public async createAsyncItems(pos: MRE.Vector3, rot=new MRE.Quaternion()) {
		this.ourApp.ourConsole.logMessage("creating staff asyn items");

		this.staffGrabber=new GrabButton(this.ourApp);
		this.staffGrabber.create(pos,rot);

		this.staffBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.staffGrabber.getGUID(),
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

				this.ourApp.ourConsole.logMessage("user pressed on staff at: " + posVector3);
				this.ourApp.ourConsole.logMessage("number of points: " + buttonData.targetedPoints.length);

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
						this.ourApp.ourConsole.logMessage("user is holding ");
						this.ourApp.ourConsole.logMessage("number of points: " + buttonData.targetedPoints.length);

						for (const point of buttonData.targetedPoints) {
							const penPos = point.localSpacePoint;
							const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);
							posVector3.y = this.drawPreviousPos.y; //hack to fix MRE bug
							this.ourApp.ourConsole.logMessage("point: " + posVector3);
							this.ourApp.ourConsole.logMessage("prev: " + this.drawPreviousPos);

							const dist = posVector3.subtract(this.drawPreviousPos).length()
							if (dist > this.drawThreshold) {
								this.ourApp.ourConsole.logMessage("pen dist: " + dist +
									" is greater then threshold: " + this.drawThreshold);
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
				this.ourApp.ourConsole.logMessage("user released on staff at: " + posVector3);
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
				this.ourApp.ourConsole.logMessage("user hover has ended at: " + posVector3);

				if (this.isDrawing) {
					if (this.drawingUser === user) {
						this.drawSegment(this.drawPreviousPos, posVector3);
						this.isDrawing = false;
					}
				}
			}
		});

		
		await this.staffBackground.created();

		this.computeZspacing();
		this.computeStaffScale();

		for (let i = 0; i < this.stringRoots.length; i++) {
			const z = this.stringZpos.get(i);

			const staffLine = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					parentId: this.staffGrabber.getGUID(),
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

		this.ourApp.ourConsole.logMessage("completed all staff object creation");
	}

	private spawnParticleEffect(pos: MRE.Vector3, scale: number, colorIndex: number) {
		if(!this.doParticleEffect){
			return;
		}
		const particleScale=scale*2.0;

		this.ourApp.ourConsole.logMessage("creating particle at: " + pos + " with scale: " + scale);
		const particleActor = MRE.Actor.CreateFromLibrary(this.ourApp.context, {
			resourceId: this.particleEffects[colorIndex],
			actor: {
				name: 'particle burst',
				parentId: this.staffGrabber.getGUID(),
				transform: {
					local: {
						position: pos,
						scale: { x: particleScale, y: particleScale, z: particleScale }
					}
				}
			}
		});
		setTimeout(() => {
			this.ourApp.ourConsole.logMessage("3 seconds has expired. deleting particle effect");
			particleActor.destroy();
		}, 3000);
	}

	public destroyNote(oldNote: NoteProperties, removeFromActiveList: boolean) {
		if (oldNote.actor) {
			oldNote.actor.destroy();
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

	public receiveNote(note: number, vel: number, channel: number) {
		this.ourApp.ourConsole.logMessage("trying to spawn staff note for: " + note);
		//const octave = Math.floor(note / 12);		

		if(this.staffRootTime===-1){
			this.staffRootTime=Date.now();
		}		

		let timeDiffSeconds=(Date.now()-this.staffRootTime)/1000.0;
		if(timeDiffSeconds>this.staffTime){ //TODO: make this pickable from a GUI
			//clear previous notes
			for (const oldNote of this.activeNotes) {
				this.destroyNote(oldNote,false); //will just clear later
			}
			for (const annotations of this.annotationList) {
				annotations.destroy();
			}
			this.activeNotes=[]; //clear array
			this.annotationList=[];
			this.staffRootTime=Date.now();
			timeDiffSeconds=0;
		}

		const xPos=(timeDiffSeconds/this.staffTime)*this.staffWidth*0.9;
	
		this.createNoteAndAccidental(note,vel,channel,xPos,this.computedStaffScale);
	}

	public createNoteAndAccidental(note: number, vel: number, channel: number, xPos: number, scale: number) {
		const zPos=this.stringZpos.get(channel);
	
		const spawnPos = new MRE.Vector3(-(this.staffWidth * 0.5 + 0.5) -
			(this.staffWidth * 0.5) * 0.9 + xPos, 0.2*scale, zPos);

		
		this.ourApp.ourConsole.logMessage("going to create note at pos: " + spawnPos);

		const noteNum = note % 12;
		const ourNote = this.createNote(note, channel, spawnPos, scale, this.noteColors[noteNum]);
		ourNote.note=note;

		ourNote.actor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
			this.ourApp.ourConsole.logMessage("trigger enter on staff note!");

			if (otherActor.name.includes('SpawnerUserHand')) { //note touches hand
				const guid = otherActor.name.substr(16);

				if (this.ourInteractionAuth === AuthType.All || this.ourApp.ourUsers.isAuthorizedString(guid)) {
					if (this.ourWavPlayer) {
						//this.ourWavPlayer.playSound(note, vel, spawnPos);
					}
					this.spawnParticleEffect(spawnPos, scale, noteNum);
					//this.ourApp.ourSender.send(`["/NoteOn",${ourNote.note}]`);
				}
			} else {
				//this.ourApp.ourConsole.logMessage("sphere collided with: " + otherActor.name);
			}
		});		
	}

	private createNote(note: number, channel: number, pos: MRE.Vector3,
		scale: number, color: MRE.Color4): NoteProperties {
		const fretName: string = (note - this.stringRoots[channel]).toString();

		const noteActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'sphere',
				parentId: this.staffGrabber.getGUID(),
				transform: {
					local: {
						position: pos,
						scale: new MRE.Vector3(scale, scale, scale),
						rotation: MRE.Quaternion.FromEulerAngles(90 * Math.PI / 180, 0, 0)
					}
				},
				text: {
					contents: fretName,
					color: { r: color.r, g: color.g, b: color.b },
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					height: 3
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Sphere
					},
					isTrigger: true
				}
			}
		});

		const ourNote = {
			timeStamp: Date.now(),
			actor: noteActor,
			pos: pos,
			note: note,
			adjustedNote: note
		};

		this.activeNotes.push(ourNote);

		return ourNote;
	}
}
