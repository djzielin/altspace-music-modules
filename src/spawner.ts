/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import App from './app';
import MusicModule from './backend/music_module';
import WavPlayer from './utility_modules/wavplayer';

interface BubbleProperties{
	timeStamp: number;
	actor: MRE.Actor;
	note: number;
	vel: number;
	animation: MRE.Animation;
	startPos: MRE.Vector3;
	endPos: MRE.Vector3;
	time: number;
	collisionPos: MRE.Vector3;
}

enum AuthType {
	Moderators = 0,
	All = 1,
	SpecificUser = 2
}

export default class Spawner extends MusicModule {

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

	private elongatedCubes: string [] = [
		"artifact:1638815768218960841"
	]

	public availableBubbles: BubbleProperties[]=[]; 

	public spawnerWidth=1.0; //0.5;
	public spawnerHeight=0.2;
	public bubbleLimit=200;
	public timeOut=5.0;
	public bubbleSize=0.1; //0.05;
	public bubbleSpeed=0.1;
	public doParticleEffect=false;
	public doPosRandom=true;
	public doPhysics=false;
	public doElongatedCubes=true;
	public ourInteractionAuth = AuthType.All;
	public authorizedUser: MRE.User;

	private noteMaterials: MRE.Material[] = [];

	//public ourSpawner: MRE.Actor;
	public spawnerActor: MRE.Actor;

	//public ourWavPlayer: WavPlayer;

	private ourInterval1: NodeJS.Timeout=null;
	private ourInterval2: NodeJS.Timeout=null;

	private removeFromAvailable(ourBubble: BubbleProperties) {
		const index = this.availableBubbles.indexOf(ourBubble);
		if (index > -1) {
			this.availableBubbles.splice(index, 1);
		}
		ourBubble=null;
	}	

	public destroy() {
		this.ourApp.ourConsole.logMessage("SPAWNER: destroy");

		clearInterval(this.ourInterval1);
		clearInterval(this.ourInterval2);
		
		for (const ourBubble of this.availableBubbles) {
			if (ourBubble.animation) {
				//ourBubble.animation.stop();
				ourBubble.animation.delete();
			}
			ourBubble.actor.destroy();
		}

		super.destroy();
	}

	constructor(protected ourApp: App, public name: string) {
		super(ourApp, name);

		this.ourInterval1=setInterval(() => { //cull bubbles that have been around too long
			const currentTime = Date.now();
			const listOfAvailableBubblesToDelete: BubbleProperties[]=[];
			for (const ourBubble of this.availableBubbles) {
				//this.ourApp.ourConsole.logMessage("pos: " + ourBubble.actor.transform.app.position);

				if (currentTime - ourBubble.timeStamp > (this.timeOut * 1000)) {
					if (ourBubble.animation) {
						//ourBubble.animation.stop();
						ourBubble.animation.delete();
					}
					ourBubble.actor.destroy();
					listOfAvailableBubblesToDelete.push(ourBubble);
				}
			}

			for(const ourBubble of listOfAvailableBubblesToDelete){
				this.removeFromAvailable(ourBubble);
			}		
	
			//const timeNow=new Date(Date.now());			

			/*this.ourApp.ourConsole.logMessage(
				`Time: ${this.ourApp.pad(timeNow.getHours(),2,'0')}:`+
				`${this.ourApp.pad(timeNow.getMinutes(),2,'0')}:` +
				`${this.ourApp.pad(timeNow.getSeconds(),2,'0')} - ` +
				`${this.availableBubbles.length} playable `+
				`(${listOfAvailableBubblesToDelete.length} culled)`);*/
		}, 1000);

		this.ourInterval2=setInterval(() => {
			const bubblesToPop: BubbleProperties[] = [];

			for (const ourBubble of this.availableBubbles) {
				if (ourBubble.animation) {
					const completedTime = ourBubble.animation.normalizedTime;
					let computedPos = MRE.Vector3.Lerp(
						ourBubble.startPos,
						ourBubble.endPos,
						completedTime / ourBubble.time);

					computedPos=this.getWorldPos(computedPos); //translate to world coordinates

					
					//this.ourApp.ourConsole.logMessage("computedPos: " + computedPos);
					//this.ourApp.ourConsole.logMessage("reportedPos: " + ourBubble.actor.transform.app.position);


					for (const ourUser of this.ourApp.ourUsers.allUsers) {
						//this.ourApp.ourConsole.logMessage("examining: " + ourUser.name);

						if (ourUser.lHand) {
							const lPos = ourUser.lHand.transform.app.position;
							if (MRE.Vector3.Distance(computedPos, lPos) < 0.15) {
								ourBubble.collisionPos = computedPos;
								bubblesToPop.push(ourBubble);
							}
						}
						if (ourUser.rHand) {
							const rPos = ourUser.rHand.transform.app.position;
							//this.ourApp.ourConsole.logMessage("rpos: " + rPos);

							if (MRE.Vector3.Distance(computedPos, rPos) < 0.15) {
								ourBubble.collisionPos = computedPos;
								bubblesToPop.push(ourBubble);
							}
						}
					}
				}
			}
			for (const ourBubble of bubblesToPop) {
				this.popBubble(ourBubble);
			}		
		}, 100);
	
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

	public async createAsyncItems(pos: MRE.Vector3, rot = new MRE.Quaternion()) {
		if (!this.ourGrabber) {
			this.createGrabber(pos, rot);
		} else {
			this.ourGrabber.setPos(pos);
			this.ourGrabber.setRot(rot);
		}


		/*this.ourSpawner = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourGrabber.getGUID(),
				name: 'spawner',
				transform: {
					app: { position: pos },
				},
				grabbable: true,
				subscriptions: ['transform']
			}
		});

		await this.ourSpawner.created();

		this.ourSpawner.setCollider(MRE.ColliderType.Box, false, {x: this.spawnerWidth, y: 0.01, z: 0.05});
*/

		this.spawnerActor=MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'spawner',
				parentId: this.ourGrabber.getGUID(),
				transform: {
					local: {
						position: new MRE.Vector3(-this.spawnerWidth, 0,0),
						scale: new MRE.Vector3(this.spawnerWidth, 0.01, 0.05)
					}
				},
				appearance:
				{
					meshId: this.ourApp.boxMesh.id
				}
			}
		});
		await this.spawnerActor.created();

		for (const noteColor of this.noteColors) {
			const ourMat: MRE.Material = this.ourApp.assets.createMaterial('bubblemat', {
				color: noteColor
				//mainTextureId: this.sphereTexture.id
			});
			await ourMat.created;
			this.noteMaterials.push(ourMat);
		}
		this.ourApp.ourConsole.logMessage("completed all spawner object creation");
	}

	private createBubbleWithPhysics(pos: MRE.Vector3, rot: MRE.Quaternion, scale: number,
		vel: MRE.Vector3, mat: MRE.Material): BubbleProperties {
		
		const bubbleActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'sphere',
				parentId: this.ourGrabber.getGUID(),
				transform: {
					local: {
						position: pos,
						rotation: rot,
						scale: new MRE.Vector3(scale, scale, scale)
					}
				},
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: mat.id
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Box
					},
					isTrigger: false
				},
				rigidBody: {
					enabled: true,
					useGravity: false,
				}
				//subscriptions: ['transform'],
			}
		});		

		bubbleActor.rigidBody.velocity=vel;

		const ourBubble={
			timeStamp: Date.now(),
			actor: bubbleActor,
			note: 0,
			vel: 0,
			animation: null as MRE.Animation,
			startPos: MRE.Vector3.Zero(),
			endPos: MRE.Vector3.Zero(),
			time: 0,
			collisionPos: MRE.Vector3.Zero()
		};

		this.availableBubbles.push(ourBubble);

		return ourBubble;
	}

	private createBubbleWithAnimations(pos: MRE.Vector3, rot: MRE.Quaternion, dir: MRE.Quaternion, scale: number,
		speed: number, mat: MRE.Material): BubbleProperties {
		
		const bubbleActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'sphere',
				parentId: this.ourGrabber.getGUID(),
				transform: {
					local: {
						position: pos,
						rotation: rot,
						scale: new MRE.Vector3(scale, scale, scale)
					}
				},
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: mat.id
				},
				/*collider: {
					geometry: {
						shape: MRE.ColliderType.Box
					},
					isTrigger: true
				},*/
				subscriptions: ['transform']
			}
		});		

		const forVec = new MRE.Vector3(0, 0, -1);
		const resultVec = new MRE.Vector3(0, 0, 0);
		forVec.rotateByQuaternionToRef(dir, resultVec);

		const totalDist=speed*this.timeOut;
		const newPos = pos.add(resultVec.multiplyByFloats(totalDist,totalDist,totalDist));

		const ourBubble={
			timeStamp: Date.now(),
			actor: bubbleActor,
			note: 0,
			vel: 0,
			animation: null as MRE.Animation,
			startPos: pos,
			endPos: newPos,
			time: this.timeOut,
			collisionPos: MRE.Vector3.Zero()
		};

		this.availableBubbles.push(ourBubble);

		const travelAnimData = this.ourApp.assets.createAnimationData("Travel", {
			tracks: [{
				target: MRE.ActorPath("target").transform.local.position,
				keyframes: [
					{ time: 0.0, value: { x: pos.x, y: pos.y, z: pos.z } },
					{ time: this.timeOut, value: { x: newPos.x, y: newPos.y, z: newPos.z } }
				]
			}
			/*,
			{
				target: MRE.ActorPath("target").transform.local.scale,
				keyframes: [
					{ time: 0.0, value: { x: scale, y: scale, z: scale } },
					{ time: this.timeOut, value: { x: 0.0, y: 0.0, z: 0.0 } }
				]
			}*/
			]
		});

		travelAnimData.bind(
			{ target: bubbleActor },
			{ speed: 1, isPlaying: true, wrapMode: MRE.AnimationWrapMode.Once }).then((ourAnim) => {
		
			ourBubble.animation=ourAnim;

			/*
			ourAnim.finished().then(() => {				
				ourAnim.delete();
			});*/
		});

		return ourBubble;
	}

	private spawnParticleEffect(pos: MRE.Vector3, colorIndex: number) {
		if(!this.doParticleEffect){
			return;
		}
		const particleScale=this.bubbleSize*2.0;

		//this.ourApp.ourConsole.logMessage("creating particle at: " + pos);
		const particleActor = MRE.Actor.CreateFromLibrary(this.ourApp.context, {
			resourceId: this.particleEffects[colorIndex],
			actor: {
				name: 'particle burst',
				transform: {
					app: {
						position: pos
					},
					local: {
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

	private mapRange(input: number, inputLow: number, inputHigh: number, outputLow: number, outputHigh: number) {
		const inputRange = inputHigh - inputLow;
		const inputPercent = (input - inputLow) / inputRange;
		const outputRange = outputHigh - outputLow;
		const output = outputLow + inputPercent * outputRange;

		return output;
	}

	public receiveData(data: any[], messageType: string) {
		if(this.isEnabled===false){
			return;
		}
		
		if (messageType === "midi") {
			if (data.length > 1) {
				if (data[1] > 0) {
					this.spawnBubble(data[0] as number, data[1] as number);
				} else {
					//this.handleRelease(data[0] as number);
				}
			}
		}
	}

	public spawnBubble(note: number, vel: number) {
		this.ourApp.ourConsole.logMessage("trying to spawn bubble for: " + note);
		const octave = Math.floor(note / 12);
		const noteNum = note % 12;
		const scale = this.bubbleSize; //0.05; //this.mapRange(note,21,108,1.0,0.1) * 0.04;
		const speed = this.bubbleSpeed; //0.1; //this.mapRange(note,21,108,0.1,1.0) * -0.5;

		while(this.availableBubbles.length>this.bubbleLimit){
			this.ourApp.ourConsole.logMessage("  culling bubble. enforcing bubble limit of: " + this.bubbleLimit);
			const bubbleToCull=this.availableBubbles.shift();

			if(bubbleToCull.animation){
				//bubbleToCull.animation.stop();
				bubbleToCull.animation.delete();
			}
			bubbleToCull.actor.destroy();
		}

		let spawnPos= new MRE.Vector3(0,0,0);

		if (this.doPosRandom) {
			spawnPos = new MRE.Vector3(
				-this.spawnerWidth+Math.random() * this.spawnerWidth - this.spawnerWidth * 0.5,
				(scale * 2.0) + Math.random() * this.spawnerHeight,
				0.0);
		} else {
			spawnPos = new MRE.Vector3(
				-this.spawnerWidth+this.spawnerWidth * (noteNum / 11) - this.spawnerWidth * 0.5,
				(scale * 2.0) + (octave - 1) / 8 * this.spawnerHeight,
				0.0);
		}

		const spawnRot =
			MRE.Quaternion.FromEulerAngles(Math.random() * 360, Math.random() * 360, Math.random() * 360);

		const spawnerRot = this.ourGrabber.getRot();
		const forVec = new MRE.Vector3(0, 0, 1);
		const spawnForVec = new MRE.Vector3(0, 0, 0);
		forVec.rotateByQuaternionToRef(spawnerRot, spawnForVec);
		const velocityVec = spawnForVec.multiplyByFloats(-speed, -speed, -speed);
		//this.ourApp.ourConsole.logMessage("  bubble velocity vec: " + velocityVec);

		let ourBubble: BubbleProperties=null;

		if (this.doPhysics) {
			ourBubble = this.createBubbleWithPhysics(spawnPos, 
				spawnRot, 
				scale, 
				velocityVec,
				this.noteMaterials[noteNum]);
			
		} else {
			//TODO: make angle a parameter
			const dirRot =
				MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad((Math.random() * 2.0 - 1.0) * 30.0), 0, 0);

			ourBubble = this.createBubbleWithAnimations(spawnPos, 
				spawnRot, 
				dirRot, 
				scale, 
				speed, 
				this.noteMaterials[noteNum]);
		}

		ourBubble.note = note;
		ourBubble.vel = vel;

		/*if (this.doPhysics) {
			ourBubble.actor.collider.onCollision("collision-enter", (data: MRE.CollisionData) => {
				this.ourApp.ourConsole.logMessage("onCollision called!");			

				const otherActor = data.otherActor;

				if (otherActor.name.includes('SpawnerUserHand')) {
					const collisionPos = data.contacts[0].point;
					ourBubble.collisionPos=collisionPos;
					this.popBubble(ourBubble);

				} else {
					//this.ourApp.ourConsole.logMessage("hand collided with: " + otherActor.name);
				}
			});
		} 
		*/
		/*else {
			ourBubble.actor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
				this.ourApp.ourConsole.logMessage("onTrigger called!");			

				if (otherActor.name.includes('SpawnerUserHand')) {
					//TODO: not sure if this returns correct positions!
					const collisionPos = otherActor.transform.app.position; 
					this.popBubble(collisionPos, ourBubble);
				} else {
					//this.ourApp.ourConsole.logMessage("hand collided with: " + otherActor.name);
				}
			});
		}*/
	}

	private popBubble(bubble: BubbleProperties){

		const collisionPos=bubble.collisionPos;

		this.spawnParticleEffect(collisionPos, bubble.note % 12);

		const sendMessage = [bubble.note, bubble.vel, 0, collisionPos.x, collisionPos.y, collisionPos.z];
		this.sendData(sendMessage, "midi")
		
		if(bubble.animation){
			//bubble.animation.stop();
			bubble.animation.delete();
		}
		bubble.actor.destroy();
		this.ourApp.ourConsole.logMessage("bubble popped for note: " + bubble.note);	
		
		this.removeFromAvailable(bubble);
	}
}
