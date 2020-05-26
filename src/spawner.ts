/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import Piano from './piano';
import App from './app';
import { appendFile } from 'fs';

interface BubbleProperties{
	timeStamp: number;
	actor: MRE.Actor;
	soundGUID: MRE.Guid; 
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

	private availableBubbles: BubbleProperties[]=[]; 
	private playingBubbles: BubbleProperties[]=[]; 

	private noteMaterials: MRE.Material[] = [];
	private spawnerWidth=0.5;
	private ourSpawner: MRE.Actor;

	private polyphonyLimit=20; //TODO: allow these to be set in in-world GUI
	private bubbleLimit=50;

	/*
		https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript	
	*/	
	private pad(value: number, maxWidth: number, padChar: string) {
		const n = value.toString();
		return n.length >= maxWidth ? n : new Array(maxWidth - n.length + 1).join(padChar) + n;
	}

	constructor(private context: MRE.Context, private baseUrl: string, private assets: MRE.AssetContainer,
		private ourPiano: Piano, private allHands: MRE.Actor[], private ourApp: App) {

		setInterval(() => { //cull bubbles that have been around too long
			const currentTime = Date.now();
			const listOfAvailableBubblesToDelete: BubbleProperties[]=[];
			const listOfPlayingBubblesToDelete: BubbleProperties[]=[];

			for (const ourBubble of this.availableBubbles) {
				if (currentTime - ourBubble.timeStamp > 10000) {
					this.ourApp.logMessage("10 seconds has expired, pulling unplayed bubble");
					ourBubble.actor.destroy();
					listOfAvailableBubblesToDelete.push(ourBubble);
				}
			}

			for (const ourBubble of this.playingBubbles) {
				if (currentTime - ourBubble.timeStamp > 5000) {
					this.ourApp.logMessage("5 seconds has expired, pulling playing bubble");
					ourBubble.actor.destroy();
					listOfPlayingBubblesToDelete.push(ourBubble);
				}
			}
			
			for(const ourBubble of listOfAvailableBubblesToDelete)
			{
				const index=this.availableBubbles.indexOf(ourBubble);
				if(index>-1){
					this.availableBubbles.splice(index,1);
				}
			}

			for(const ourBubble of listOfPlayingBubblesToDelete)
			{
				const index=this.playingBubbles.indexOf(ourBubble);
				if(index>-1){
					this.availableBubbles.splice(index,1);
				}
			}
	
			const timeNow=new Date(Date.now());			

			this.ourApp.logMessage(
				`Time: ${this.pad(timeNow.getHours(),2,'0')}:`+
				`${this.pad(timeNow.getMinutes(),2,'0')}:` +
				`${this.pad(timeNow.getSeconds(),2,'0')} - ` +
				`${this.playingBubbles.length} playing, ` +
				`${this.availableBubbles.length} playable`);

		}, 1000);
	}

	public async createAsyncItems() {
		this.boxMesh = this.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		await this.boxMesh.created;

		this.ourSpawner = MRE.Actor.Create(this.context, {
			actor: {
				name: 'spawner',
				transform: {
					app: { position: new MRE.Vector3(0,1.3,0) },
				}
			}
		});

		await this.ourSpawner.created();

		this.ourSpawner.setCollider(MRE.ColliderType.Box, false, {x: this.spawnerWidth, y: 0.01, z: 0.05});
		/*this.ourSpawner.enableRigidBody({
			enabled: true,
			isKinematic: true,
			useGravity: false
		});*/

		this.ourSpawner.grabbable = true; //so we can move it around
		this.ourSpawner.subscribe('transform'); //so we can get pos updates

		MRE.Actor.Create(this.context, {
			actor: {
				name: 'spawner',
				parentId: this.ourSpawner.id,
				transform: {
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


	/*	for (let i = 0; i < 10; i++) {
			await this.createSphere(
				new MRE.Vector3(0, 0, 0),
				.05,
				this.boxMesh.id);
		}

		MRE.log.info("app", "created all bubbles");
*/

		for (const noteColor of this.noteColors) {
			const ourMat: MRE.Material = this.assets.createMaterial('bubblemat', {
				color: noteColor//,
				//mainTextureId: this.sphereTexture.id
			});
			await ourMat.created;
			this.noteMaterials.push(ourMat);
		}

		this.ourApp.logMessage("complete all spawner object creation");
	}

	private async createSphere(pos: MRE.Vector3, scale: number, meshID: MRE.Guid) {
		this.ourApp.logMessage("trying to create bubble at: " + pos);
		const bubbleActor = MRE.Actor.Create(this.context, {
			actor: {
				name: 'sphere',
				parentId: this.ourSpawner.id,
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

		//bubbleActor.subscribe('transform');
		//bubbleActor.subscribe('rigidbody');

		const ourBubble={
			timeStamp: Date.now(),
			actor: bubbleActor,
			soundGUID: MRE.ZeroGuid //TODO GUID
		};

		this.availableBubbles.push(ourBubble);

		bubbleActor.setCollider(MRE.ColliderType.Box, false);
		bubbleActor.collider.enabled = false;

		bubbleActor.enableRigidBody({
			enabled: false,
			isKinematic: false,
			useGravity: false,
			//collisionDetectionMode: MRE.CollisionDetectionMode.ContinuousDynamic
		});

		bubbleActor.collider.onCollision("collision-enter", (data: MRE.CollisionData) => {
			const otherActor = data.otherActor;

			if (this.allHands.includes(otherActor)) { //bubble touches hand
				this.ourApp.logMessage("touched one of our hands! lets play a sound!");
				this.playBubble(ourBubble);
			} else {
				this.ourApp.logMessage("sphere collided with: " + otherActor.name);
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
			this.ourApp.logMessage("2 seconds has expired. deleting particle effect");
			particleActor.destroy();
		}, 2000);
	}

	private resetBubble(ourBubble: MRE.Actor) {
		ourBubble.collider.enabled = false;		
		ourBubble.rigidBody.enabled = false;

		const spawnPos = new MRE.Vector3(
			Math.random() * this.spawnerWidth - this.spawnerWidth * 0.5,
			0.1 + Math.random() * 0.2,
			Math.random() * 0.00001);	

		ourBubble.transform.local.position=spawnPos;
		ourBubble.transform.app.rotation=
			MRE.Quaternion.FromEulerAngles(Math.random()*360,Math.random()*360,Math.random()*360);

		ourBubble.rigidBody.velocity={x:0, y:0, z:0};

		ourBubble.rigidBody.angularVelocity = {
			x: Math.random() * 0.00001,
			y: Math.random() * 0.00001,
			z: Math.random() * 0.00001
		};

		//ourBubble.appearance.enabled = true;
		ourBubble.appearance.enabled = false;
	}

	private playBubble(bubbleProp: BubbleProperties) {		
		/*bubbleProp.sound.resume(); //start sound
		bubbleProp.isPlaying=true;
		bubbleProp.playTime=Date.now();

		this.resetBubble(bubbleProp.actor);
		bubbleProp.isVisible=false;
*/
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
		this.ourApp.logMessage("trying to spawn bubble for: " + note);
		//const octave = Math.floor(note / 12);
		const noteNum = note % 12;
		const scale = 0.05; //this.mapRange(note,21,108,1.0,0.1) * 0.04;
		const speed = -0.1; //this.mapRange(note,21,108,0.1,1.0) * -0.5;

		MRE.log.error("app", "  scale will be: " + scale);
		MRE.log.error("app", "  speed will be: " + speed);

		/*const ourBubble = this.allBubbles.shift(); //cycle to the back 
		this.allBubbles.push(ourBubble);

		if (ourBubble.isPlaying) {
			MRE.log.error("app", "  proposed bubble is still playing, lets first shut it down");
			
			ourBubble.sound.stop();
			ourBubble.isPlaying=false;		
		} 

		if(ourBubble.isVisible) {
			MRE.log.error("app", "  bubble is still visible, lets reset it");
			this.resetBubble(ourBubble.actor);
			ourBubble.isVisible=false;
		}

		ourBubble.actor.transform.local.scale = new MRE.Vector3(scale, scale, scale);
		
		const ourRot=this.ourSpawner.transform.app.rotation;
		const forVec=new MRE.Vector3(0,0,1);
		const spawnForVec=new MRE.Vector3(0,0,0);		
		forVec.rotateByQuaternionToRef(ourRot,spawnForVec);

		const randVec = new MRE.Vector3(
			Math.random() * 0.00001,
			Math.random() * 0.00001,
			Math.random() * 0.00001);

		let velocityVec=spawnForVec.multiplyByFloats(speed,speed,speed);
		velocityVec=velocityVec.add(randVec); //add some noise to bypass observer limitations

		ourBubble.actor.rigidBody.velocity =
		{
			x: velocityVec.x,
			y: velocityVec.y,
			z: velocityVec.z
		};

		ourBubble.actor.rigidBody.angularVelocity={x:0, y:0, z:0};

		ourBubble.actor.collider.enabled = true;
		ourBubble.actor.rigidBody.enabled = true;

		const soundInstance: MRE.MediaInstance =
			ourBubble.actor.startSound(this.ourPiano.getSoundGUID(note), {
				doppler: 0,
				pitch: 0.0,
				looping: false,
				paused: true,
				volume: 1.0,
				rolloffStartDistance: 10.0

			});
		
		ourBubble.spawnTime=Date.now();
		ourBubble.sound=soundInstance;

		ourBubble.actor.appearance.materialId = this.noteMaterials[noteNum].id;
		ourBubble.actor.appearance.enabled = true;
		ourBubble.isVisible=true;
		*/
	}
}
