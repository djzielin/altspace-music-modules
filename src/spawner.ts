/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import Piano from './piano';

interface BubbleProperties{
	spawnTime: number;
	playTime: number;
	actor: MRE.Actor;
	sound: MRE.MediaInstance;
	isPlaying: boolean;
	isVisible: boolean; 
}

export default class Spawner {

	/**************
	   https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=12
	****************/
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

	private sphereMesh: MRE.Mesh;
	private boxMesh: MRE.Mesh;

	private allBubbles: BubbleProperties[]=[]; //bubbles move into ready, then playing
	private noteMaterials: MRE.Material[] = [];
	private spawnerWidth=0.5;
	private ourSpawner: MRE.Actor;

	constructor(private context: MRE.Context, private baseUrl: string, private assets: MRE.AssetContainer,
		private ourPiano: Piano, private allHands: MRE.Actor[]) {

		setInterval(() => {
			const currentTime = Date.now();
			for (const ourBubble of this.allBubbles) {
				if (ourBubble.isPlaying) {
					if (currentTime - ourBubble.playTime > 5000) {
						MRE.log.info("app","5 seconds has expired, stopping playback");
						ourBubble.sound.stop();
						ourBubble.isPlaying = false;
					}
				}

				if (ourBubble.isVisible) {
					if (currentTime - ourBubble.spawnTime > 10000) {
						MRE.log.info("app","10 seconds has expired, pulling unplayed bubble");
						this.resetBubble(ourBubble.actor);
						ourBubble.isVisible = false;
					}
				}
			}
		}, 1000);
	}

	public async createAsyncItems() {
		this.boxMesh = this.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		await this.boxMesh.created;

		const spawnPos=this.ourPiano.keyboardParent.transform.app.position.clone();
		spawnPos.y+=0.1;
		this.ourSpawner = MRE.Actor.Create(this.context, {
			actor: {
				name: 'spawner',
				transform: {
					app: { position: spawnPos },
					local: {
						scale: new MRE.Vector3(this.spawnerWidth, 0.01, 0.05)
					}
				},
				appearance:
				{
					meshId: this.boxMesh.id
				}
			}
		});

		await this.ourSpawner.created();
		this.ourSpawner.setCollider(MRE.ColliderType.Box, false);

		this.ourSpawner.enableRigidBody({
			enabled: true,
			isKinematic: true,
			useGravity: false
		});
		this.ourSpawner.grabbable = true; //so we can move it around
		this.ourSpawner.subscribe('transform'); //so we can get pos updates

		this.ourSpawner.onGrab("end",()=>{
			for (const ourBubble of this.allBubbles) {
				if (!ourBubble.isVisible){
					this.resetBubble(ourBubble.actor); //redo spawn positions
				}
			}
		});

		for (let i = 0; i < 50; i++) {
			await this.createSphere(
				new MRE.Vector3(0, 0, 0),
				.04,
				this.boxMesh.id);
		}

		MRE.log.info("app", "created all bubbles");

		for (const noteColor of this.noteColors) {
			const ourMat: MRE.Material = this.assets.createMaterial('bubblemat', {
				color: noteColor//,
				//mainTextureId: this.sphereTexture.id
			});
			await ourMat.created;
			this.noteMaterials.push(ourMat);
		}

		MRE.log.info("app", "complete all spawner object creation");
	}

	private async createSphere(pos: MRE.Vector3, scale: number, meshID: MRE.Guid) {
		MRE.log.info("app", "trying to create bubble at: " + pos);
		const bubbleActor = MRE.Actor.Create(this.context, {
			actor: {
				name: 'sphere',
				//parentId: this.bigSpawner.id,
				transform: {
					local: {
						position: pos,
						scale: new MRE.Vector3(scale, scale, scale)
					}
				},
				appearance: {
					meshId: meshID,
					enabled: false
				}
			}
		});
		await bubbleActor.created();

		bubbleActor.subscribe('transform');
		bubbleActor.subscribe('rigidbody');

		const ourBubble={
			spawnTime: -1,
			playTime: -1,
			actor: bubbleActor,
			sound: null as MRE.MediaInstance,
			isPlaying: false,
			isVisible: false
		};

		this.allBubbles.push(ourBubble);

		bubbleActor.setCollider(MRE.ColliderType.Box, false, new MRE.Vector3(1.0, 1.0, 1.0));
		bubbleActor.collider.enabled = false;

		bubbleActor.enableRigidBody({
			enabled: false,
			isKinematic: true,
			useGravity: false
		});

		bubbleActor.collider.onCollision("collision-enter", (data: MRE.CollisionData) => {
			const otherActor = data.otherActor;

			if (this.allHands.includes(otherActor)) { //bubble touches hand
				MRE.log.info("app", "touched one of our hands! lets play a sound!");
				this.playBubble(ourBubble);
			} else {
				MRE.log.info("app", "sphere collided with: " + otherActor.name);
			}
		});

		this.resetBubble(bubbleActor);
	}

	private spawnParticleEffect(pos: MRE.Vector3) {
		const particleActor = MRE.Actor.CreateFromLibrary(this.context, {
			resourceId: "artifact:1474401976627233047",
			actor: {
				name: 'particle burst',
				transform: {
					app: {
						position: pos
					},
					local: {
						scale: { x: 1.0, y: 1.0, z: 1.0 }
					}
				}
			}
		});
		setTimeout(() => {
			MRE.log.info("app", "2 seconds has expired. deleting particle effect");
			particleActor.destroy();
		}, 2000);
	}

	private resetBubble(ourBubble: MRE.Actor) {
		ourBubble.appearance.enabled = false;
		ourBubble.rigidBody.enabled = false;
		ourBubble.rigidBody.useGravity = false;
		ourBubble.rigidBody.isKinematic = true;
		ourBubble.collider.enabled = false;		
		
		const spawnPos=this.ourSpawner.transform.app.position.clone();
		spawnPos.y += 0.1 + Math.random() * 0.2;
		spawnPos.x += Math.random() * this.spawnerWidth - this.spawnerWidth * 0.5;
		//spawnPos.z+=Math.random()*this.spawnerWidth-this.spawnerWidth*0.5;
		ourBubble.transform.app.position=spawnPos;
	
		ourBubble.transform.app.rotation=
			MRE.Quaternion.FromEulerAngles(Math.random()*360,Math.random()*360,Math.random()*360);
		ourBubble.rigidBody.velocity={x:0, y:0, z:0};
		ourBubble.rigidBody.angularVelocity={x:0, y:0, z:0};
	}

	private playBubble(bubbleProp: BubbleProperties) {		
		bubbleProp.sound.resume(); //start sound
		bubbleProp.isPlaying=true;
		bubbleProp.playTime=Date.now();

		this.resetBubble(bubbleProp.actor);
		bubbleProp.isVisible=false;

		//spawnParticleEffect(pos: MRE.Vector3);
	}

	private mapRange(input: number, inputLow: number, inputHigh: number, outputLow: number, outputHigh: number) {

		const inputRange = inputHigh - inputLow;
		const inputPercent = (input - inputLow) / inputRange;
		const outputRange = outputHigh - outputLow;
		const output = outputLow + inputPercent * outputRange;

		return output;
	}

	public spawnBubble(note: number, vel: number) {
		MRE.log.info("app", "trying to spawn bubble for: " + note);
		//const octave = Math.floor(note / 12);
		const noteNum = note % 12;
		const scale = 0.05; //this.mapRange(note,21,108,1.0,0.1) * 0.04;
		const speed = -0.1; //this.mapRange(note,21,108,0.1,1.0) * -0.5;

		MRE.log.error("app", "  scale will be: " + scale);
		MRE.log.error("app", "  speed will be: " + speed);

		const ourBubble = this.allBubbles.shift(); //cycle to the back 
		this.allBubbles.push(ourBubble);

		if (ourBubble.isPlaying) {
			MRE.log.error("app", "  proposed bubble is still playing, lets first shut it down");
			
			ourBubble.sound.stop();
			ourBubble.isPlaying=false;		
		} 

		if(ourBubble.isVisible) {
			this.resetBubble(ourBubble.actor);
			ourBubble.isVisible=false;
		}

		ourBubble.actor.transform.local.scale = new MRE.Vector3(scale, scale, scale);

		ourBubble.actor.collider.enabled = true;
		ourBubble.actor.rigidBody.enabled = true;
		ourBubble.actor.rigidBody.isKinematic=false;
		ourBubble.actor.rigidBody.useGravity = false;
		ourBubble.actor.rigidBody.velocity =
			{ x: 0 + Math.random() * 0.00001, z: speed + Math.random() * 0.00001, y: 0 + Math.random() * 0.00001 };

		const soundInstance: MRE.MediaInstance =
			ourBubble.actor.startSound(this.ourPiano.getSoundGUID(note), {
				doppler: 0,
				pitch: 0.0,
				looping: false,
				paused: true,
				volume: 1.0
			});
		
		ourBubble.spawnTime=Date.now();
		ourBubble.sound=soundInstance;

		ourBubble.actor.appearance.materialId = this.noteMaterials[noteNum].id;
		ourBubble.actor.appearance.enabled = true;
		ourBubble.isVisible=true;
	}
}
