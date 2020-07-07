/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import WavPlayer from './wavplayer';
import GrabButton from './grabbutton';

interface BubbleProperties{
	timeStamp: number;
	actor: MRE.Actor;
	bonusLine: MRE.Actor;
	bonusLine2: MRE.Actor;
	pos: MRE.Vector3;
	note: number;
}

export default class Spawner {

	/**************
  	 https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=12
	****************/
	/*
	A6CEE3
	1F78B4
	B2DF8A
	33A02C
	FB9A99
	E31A1C
	FDBF6F
	FF7F00
	CAB2D6
	6A3D9A
	FFFF99
	B15928
	*/
	
	private noteColors: MRE.Color4[] = [
		new MRE.Color4(166 / 255, 206 / 255, 227 / 255),
		new MRE.Color4(31 / 255, 120 / 255, 180 / 255),
		new MRE.Color4(178 / 255, 223 / 255, 138 / 255),
		new MRE.Color4(51 / 255, 160 / 255, 44 / 255),
		new MRE.Color4(251 / 255, 154 / 255, 153 / 255),
		new MRE.Color4(227 / 255, 26 / 255, 28 / 255),
		new MRE.Color4(253 / 255, 191 / 255, 111 / 255),
		new MRE.Color4(255 / 255, 127 / 255, 0 / 255),
		new MRE.Color4(202 / 255, 178 / 255, 214 / 255),
		new MRE.Color4(106 / 255, 61 / 255, 154 / 255),
		new MRE.Color4(255 / 255, 255 / 255, 153 / 255),
		new MRE.Color4(177 / 255, 89 / 255, 40 / 255)];

	private particleEffects: string [] = [
		"artifact:1502544138917118217",
		"artifact:1502544125159801091",
		"artifact:1502544152556994829",
		"artifact:1502544200791490851",
		"artifact:1502544158974279955",
		"artifact:1502544131971350791",
		"artifact:1502544211017204009",
		"artifact:1502544145477009675",
		"artifact:1502544192268665119",
		"artifact:1502544182571434268",
		"artifact:1502544165660000535",
		"artifact:1502544173000032538"
	]

	private staffMidi: number[]=[36,38,40,41,43,45,47,48,50,52,53,55,57,59,
		60,62,64,65,67,69,71,72,74,76,77,79,81,83,84];
	private staffLineIndex: number[]=[43,47,50,53,57,64,67,71,74,77];

	private sphereMesh: MRE.Mesh;
	private boxMesh: MRE.Mesh;

	private staffGrabber: GrabButton=null;

	public availableBubbles: BubbleProperties[]=[]; 

	private noteZpos: Map<number,number>=new Map();
	private noteMaterials: MRE.Material[] = [];
	public spawnerWidth=3.0;
	public spawnerHeight=1.5;

	//private bubbleLimit=50;
	public doParticleEffect=true;
	public audioRange=10;
	public ourWavPlayer: WavPlayer;

	private staffBackground: MRE.Actor=null;
	private staffRootTime=-1;
	
	//private ourSpawnerGUI: SpawnerGUI=null;

	private removeFromAvailable(ourBubble: BubbleProperties) {
		const index = this.availableBubbles.indexOf(ourBubble);
		if (index > -1) {
			this.availableBubbles.splice(index, 1);
		}
	}	

	constructor(private ourApp: App) {

		//TODO - update play head here
		/*
		setTimeout(() => {
			this.ourApp.ourConsole.logMessage("3 seconds has expired. deleting particle effect");
			particleActor.destroy();
		}, 3000); 
		*/
	}

	public async createAsyncItems(pos: MRE.Vector3) {
		this.boxMesh = this.ourApp.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		await this.boxMesh.created;

		this.sphereMesh = this.ourApp.assets.createSphereMesh('sphereMesh',0.5,10,10);
		await this.sphereMesh.created;

		this.staffGrabber=new GrabButton(this.ourApp);
		this.staffGrabber.create(pos);

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
					materialId: consoleMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: { x: -(this.spawnerWidth*0.5+0.5), y: 0, z: 0},
						scale: new MRE.Vector3(this.spawnerWidth, 0.005, this.spawnerHeight)
					}
				}
			}
		});
		await this.staffBackground.created();

		const zSpacing=this.spawnerHeight/(this.staffMidi.length+2);
		const zBase= -(this.spawnerHeight/2.0)+zSpacing;

		for(let i=0;i<this.staffMidi.length;i++){
			this.noteZpos.set(this.staffMidi[i],zBase+(i+1)*zSpacing);
		}

		for(let i=0;i<this.staffLineIndex.length;i++){
			const z=this.noteZpos.get(this.staffLineIndex[i]);

			const staffLine = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					parentId: this.staffGrabber.getGUID(),
					name: "staffLine",
					appearance: {
						meshId: this.ourApp.boxMesh.id,
						materialId: this.ourApp.blackMat.id
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

		if(note===36 || note===40 || note===60 || note===81 || note===84){
			//const z=this.noteZpos.get(note);

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
							position: pos,
							scale: new MRE.Vector3(scale*2.0, 0.015, 0.01)
						}
					}
				}
			});
		}

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
			bonusLine: bonusLineActor,
			bonusLine2: bonusLineActor2,
			pos: pos,
			note: note
		};

		this.availableBubbles.push(ourBubble);

		return ourBubble;
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


	public receiveNote(note: number, vel: number) {
		this.ourApp.ourConsole.logMessage("trying to spawn staff note for: " + note);
		//const octave = Math.floor(note / 12);
		const noteNum = note % 12;
		const scale = (this.spawnerHeight/(this.noteZpos.size+2))*1.5; 

		/*while(this.availableBubbles.length>this.bubbleLimit){
			this.ourApp.ourConsole.logMessage("culling bubble. enforcing bubble limit of: " + this.bubbleLimit);
			const bubbleToCull=this.availableBubbles.shift();
			bubbleToCull.actor.destroy();
		}*/

		if(this.staffRootTime===-1){
			this.staffRootTime=Date.now();
		}

		if(!this.noteZpos.has(note)){
			this.ourApp.ourConsole.logMessage("note out of range!");
			return;
		}

		let timeDiffSeconds=(Date.now()-this.staffRootTime)/1000.0;
		if(timeDiffSeconds>5.0){
			//clear previous notes
			for (const oldBubble of this.availableBubbles) {
				if (oldBubble.actor) {
					oldBubble.actor.destroy();
				}
				if (oldBubble.bonusLine) {
					oldBubble.bonusLine.destroy();
				}
				if (oldBubble.bonusLine2) {
					oldBubble.bonusLine2.destroy();
				}
			}
			this.availableBubbles=[]; //clear array
			this.staffRootTime=Date.now();
			timeDiffSeconds=0;
		}
		const xPos=(timeDiffSeconds/5.0)*this.spawnerWidth*0.9;

		const spawnPos = new MRE.Vector3(-(this.spawnerWidth*0.5+0.5)-
			(this.spawnerWidth*0.5)*0.9+xPos,
			0.0,this.noteZpos.get(note));
		this.ourApp.ourConsole.logMessage("going to create note at pos: " + spawnPos);

		const ourBubble = this.createBubble(note,spawnPos, scale, this.noteMaterials[noteNum]);
		ourBubble.note=note;

		ourBubble.actor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
			this.ourApp.ourConsole.logMessage("trigger enter on staff note!");

			if (otherActor.name.includes('SpawnerUserHand')) { //bubble touches hand
				if(this.ourWavPlayer){
					this.ourWavPlayer.playSound(note,127,spawnPos, this.audioRange);
				}
				this.spawnParticleEffect(spawnPos, scale, noteNum);
				this.ourApp.ourSender.send(`["/NoteOn",${ourBubble.note}]`);
						
			} else {
				//this.ourApp.ourConsole.logMessage("sphere collided with: " + otherActor.name);
			}
		});
	}
}
