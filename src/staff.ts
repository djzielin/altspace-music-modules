/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import WavPlayer from './wavplayer';
import GrabButton from './grabbutton';
import StaffSharp from './staffsharp';
import StaffFlat from './staffflat';


interface BubbleProperties{
	timeStamp: number;
	actor: MRE.Actor;
	sharp: StaffSharp;
	flat: StaffFlat;
	bonusLine: MRE.Actor;
	bonusLine2: MRE.Actor;
	pos: MRE.Vector3;
	note: number;
}

enum AuthType {
	Moderators=0,
	All=1,
	SpecificUser=2
  }


export default class Spawner {
	public ourInteractionAuth=AuthType.Moderators;
	public authorizedUser: MRE.User;

	public doSharps=true;
	public staffTime=5.0;
	public spawnerWidth=4.0;
	public spawnerHeight=1.5;
	public showBackground=true;


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

	private staffMidi: number[]=[36,38,40,41,43,45,47,48,50,52,53,55,57,59,
		60,62,64,65,67,69,71,72,74,76,77,79,81,83,84];
	private staffLineIndex: number[]=[43,47,50,53,57,64,67,71,74,77];

	private sphereMesh: MRE.Mesh;
	private boxMesh: MRE.Mesh;

	private staffGrabber: GrabButton=null;

	public availableBubbles: BubbleProperties[]=[]; 
	private annotationList: MRE.Actor[]=[];

	private noteZpos: Map<number,number>=new Map();
	public noteMaterials: MRE.Material[] = [];


	//private bubbleLimit=50;
	public doParticleEffect=true;
	public audioRange=10;

	public ourWavPlayer: WavPlayer;

	public staffBackground: MRE.Actor=null;
	private staffRootTime=-1;

	private isDrawing=false;
	private drawPreviousPos: MRE.Vector3;


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
		let x=pos.x*this.spawnerWidth;
		const z=pos.z*this.spawnerHeight

		x-=(this.spawnerWidth * 0.5 + 0.5);

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
		const scale=(this.spawnerHeight/(this.noteZpos.size+2))*1.75*0.2;

		const drawSegment = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.staffGrabber.getGUID(),
				name: "annotations",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.blackMat.id,
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

	public async createAsyncItems(pos: MRE.Vector3, rot=new MRE.Quaternion()) {
		this.boxMesh = this.ourApp.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		await this.boxMesh.created;

		this.sphereMesh = this.ourApp.assets.createSphereMesh('sphereMesh',0.5,10,10);
		await this.sphereMesh.created;

		this.staffGrabber=new GrabButton(this.ourApp);
		this.staffGrabber.create(pos,rot);

		const consoleMat = this.ourApp.assets.createMaterial('consolemat', {
			color: new MRE.Color3(1.0,1.0,1.0) //TODO move material over to app
		});
		await consoleMat.created;

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
						position: { x: -(this.spawnerWidth * 0.5 + 0.5), y: 0, z: 0 },
						scale: new MRE.Vector3(this.spawnerWidth, 0.005, this.spawnerHeight)
					}
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Auto
					}
				}
			}
		});
		
		const buttonBehavior = this.staffBackground.setBehavior(MRE.ButtonBehavior);
		buttonBehavior.onButton("pressed", (user: MRE.User, buttonData: MRE.ButtonEventData) => {

			if (this.ourApp.isAuthorized(user)) {
				const pos = buttonData.targetedPoints[0].localSpacePoint;
				const posVector3 = new MRE.Vector3(pos.x, pos.y, pos.z);

				this.ourApp.ourConsole.logMessage("user pressed on staff at: " + posVector3);
				this.ourApp.ourConsole.logMessage("number of points: " + buttonData.targetedPoints.length);

				this.drawStart(posVector3);
			}
		});

		buttonBehavior.onButton("holding", (user: MRE.User, buttonData: MRE.ButtonEventData) => {

			if (this.ourApp.isAuthorized(user)) {
				
				this.ourApp.ourConsole.logMessage("user is holding ");

				for(const point of buttonData.targetedPoints){
					const pos = point.localSpacePoint;
					const posVector3 = new MRE.Vector3(pos.x, pos.y, pos.z);

					if(this.drawPreviousPos.subtract(posVector3).length()>0.02){
						this.drawSegment(this.drawPreviousPos,posVector3);
						this.drawPreviousPos=posVector3;
					}
				}

				this.ourApp.ourConsole.logMessage("number of points: " + buttonData.targetedPoints.length);

			}
		});

		buttonBehavior.onButton("released", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.ourApp.isAuthorized(user)) {
				const pos = buttonData.targetedPoints[0].localSpacePoint;
				const posVector3 = new MRE.Vector3(pos.x, pos.y, pos.z);
				this.ourApp.ourConsole.logMessage("user released on staff at: " + posVector3);
				this.ourApp.ourConsole.logMessage("number of points: " + buttonData.targetedPoints.length);

				this.drawSegment(this.drawPreviousPos,posVector3);
				this.isDrawing=false;
			}
		});

		await this.staffBackground.created();

		const zSpacing = this.spawnerHeight / (this.staffMidi.length + 2);
		const zBase = -(this.spawnerHeight / 2.0) + zSpacing;

		for (let i = 0; i < this.staffMidi.length; i++) {
			this.noteZpos.set(this.staffMidi[i], zBase + (i + 1) * zSpacing);
		}

		for (let i = 0; i < this.staffLineIndex.length; i++) {
			const z = this.noteZpos.get(this.staffLineIndex[i]);

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
							position: new MRE.Vector3(-(this.spawnerWidth*0.5+0.5),0,z),
							scale: new MRE.Vector3(this.spawnerWidth, 0.015, 0.01)
						}
					}
				}
			});
		}

		for (const noteColor of this.noteColors) {
			const ourMat: MRE.Material = this.ourApp.assets.createMaterial('bubblemat', {
				color: noteColor
				//mainTextureId: this.sphereTexture.id
			});
			await ourMat.created;
			this.noteMaterials.push(ourMat);
		}
		this.ourApp.ourConsole.logMessage("completed all staff object creation");

		/*this.ourSpawnerGUI=new SpawnerGUI(this.ourApp, this);
		const guiPos=new MRE.Vector3(pos.x-(this.spawnerWidth*0.5+0.5),0,pos.z);
		await this.ourSpawnerGUI.createAsync(guiPos);
		*/
	}

	private spawnParticleEffect(pos: MRE.Vector3, scale: number, colorIndex: number) {
		if(!this.doParticleEffect){
			return;
		}
		const particleScale=scale*1.0;

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

	public destroyBubble(oldBubble: BubbleProperties) {
		if (oldBubble.actor) {
			oldBubble.actor.destroy();
		}
		if (oldBubble.bonusLine) {
			oldBubble.bonusLine.destroy();
		}
		if (oldBubble.bonusLine2) {
			oldBubble.bonusLine2.destroy();
		}
		if(oldBubble.sharp){
			oldBubble.sharp.destroy();
		}
		if(oldBubble.flat){
			oldBubble.flat.destroy();
		}
	}

	public receiveNote(note: number, vel: number) {
		this.ourApp.ourConsole.logMessage("trying to spawn staff note for: " + note);
		//const octave = Math.floor(note / 12);
		
		const scale = (this.spawnerHeight/(this.noteZpos.size+2))*1.75; 

		if(this.staffRootTime===-1){
			this.staffRootTime=Date.now();
		}

		let isAccidental=false;

		if(!this.noteZpos.has(note)){
			if(note<this.staffMidi[0]){
				this.ourApp.ourConsole.logMessage("note is lower then staff, need 8VB support!");
				return;
			}
			if(note>this.staffMidi[this.staffMidi.length-1]){
				this.ourApp.ourConsole.logMessage("note is high then staff, need 8VA support!");
				return;
			}

			this.ourApp.ourConsole.logMessage("note must be accidental");
			isAccidental=true;
		}

		let timeDiffSeconds=(Date.now()-this.staffRootTime)/1000.0;
		if(timeDiffSeconds>this.staffTime){ //TODO: make this pickable from a GUI
			//clear previous notes
			for (const oldBubble of this.availableBubbles) {
				this.destroyBubble(oldBubble);
			}
			for (const annotations of this.annotationList) {
				annotations.destroy();
			}
			this.availableBubbles=[]; //clear array
			this.annotationList=[];
			this.staffRootTime=Date.now();
			timeDiffSeconds=0;
		}

		const xPos=(timeDiffSeconds/this.staffTime)*this.spawnerWidth*0.9;
	
		this.createNoteAndAccidental(note,vel,isAccidental,this.doSharps,xPos,scale);
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
	
		const spawnPos = new MRE.Vector3(-(this.spawnerWidth*0.5+0.5)-
			(this.spawnerWidth*0.5)*0.9+xPos,
			0.0,zPos);
		this.ourApp.ourConsole.logMessage("going to create note at pos: " + spawnPos);

		const noteNum = adjustedNote % 12;
		const ourBubble = this.createBubble(adjustedNote,spawnPos, scale, this.noteMaterials[noteNum]);
		ourBubble.note=note;

		if(isAccidental){
			if(isSharp){
				const ourSharp=new StaffSharp(this.ourApp, this);
				const sharpPos=spawnPos.clone();
				sharpPos.x-=scale*1.0;
				sharpPos.y+=scale*0.1;
				ourSharp.create(sharpPos,this.staffGrabber.getGUID(),scale,this.noteMaterials[noteNum].id);
				ourBubble.sharp=ourSharp;
			}
			else{
				const ourFlat=new StaffFlat(this.ourApp, this);
				const flatPos=spawnPos.clone();
				flatPos.x-=scale*0.85;
				flatPos.y+=scale*0.1;
				ourFlat.create(flatPos,this.staffGrabber.getGUID(),scale,this.noteMaterials[noteNum].id);
				ourBubble.flat=ourFlat;
			}
		}

		ourBubble.actor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
			this.ourApp.ourConsole.logMessage("trigger enter on staff note!");

			if (otherActor.name.includes('SpawnerUserHand')) { //bubble touches hand
				if(this.ourWavPlayer){
					this.ourWavPlayer.playSound(note,vel,spawnPos, this.audioRange);
				}
				this.spawnParticleEffect(spawnPos, scale, noteNum);
				this.ourApp.ourSender.send(`["/NoteOn",${ourBubble.note}]`);
						
			} else {
				//this.ourApp.ourConsole.logMessage("sphere collided with: " + otherActor.name);
			}
		});

		if (isAccidental) {
			ourBubble.actor.setBehavior(MRE.ButtonBehavior)
				.onButton("released", (user: MRE.User) => {
					const ourRoles = user.properties["altspacevr-roles"];
					if (ourRoles.includes("moderator") ||
						ourRoles.includes("presenter") || ourRoles.includes("terraformer")) {
						this.ourApp.ourConsole.logMessage("user is authorized to toggle sharp/flat");

						this.destroyBubble(ourBubble);
						this.createNoteAndAccidental(note, vel, isAccidental, !isSharp, xPos, scale);
					}
				});
		}
	}

	private createBubble(note: number, pos: MRE.Vector3, scale: number, mat: MRE.Material): BubbleProperties {

		const bubbleActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'sphere',
				parentId: this.staffGrabber.getGUID(),
				transform: {
					local: {
						position: pos,
						scale: new MRE.Vector3(scale, scale, scale)
					}
				},
				appearance: {
					meshId: this.sphereMesh.id,
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
					parentId: this.staffGrabber.getGUID(),
					name: "staffLine",
					appearance: {
						meshId: this.ourApp.boxMesh.id,
						materialId: this.ourApp.blackMat.id
					},
					transform: {
						local: {
							position: pos2,
							scale: new MRE.Vector3(scale*2.0, 0.015, 0.01)
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
					parentId: this.staffGrabber.getGUID(),
					name: "staffLine",
					appearance: {
						meshId: this.ourApp.boxMesh.id,
						materialId: this.ourApp.blackMat.id
					},
					transform: {
						local: {
							position: pos2,
							scale: new MRE.Vector3(scale*2.0, 0.015, 0.01)
						}
					}
				}
			});
		}

		const ourBubble={
			timeStamp: Date.now(),
			actor: bubbleActor,
			sharp: null as StaffSharp,
			flat: null as StaffFlat,
			bonusLine: bonusLineActor,
			bonusLine2: bonusLineActor2,
			pos: pos,
			note: note
		};

		this.availableBubbles.push(ourBubble);

		return ourBubble;
	}
}
