/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import Piano from './piano';

export default class SpawnerFaucet {

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

	private ourBubbles: MRE.Actor[]=[]; //bubbles move into ready, then playing
	private readyToPlayBubbles: Map<MRE.Actor, MRE.MediaInstance> = new Map();
	private playingBubbles: MRE.Actor[]=[];

	private noteMaterials: MRE.Material[] = [];
	private spawnerParent: MRE.Actor;
	private gridParent: MRE.Actor;
	private sphereTexture: MRE.Texture;
	private floorPlane: MRE.Actor=null;
	private ourSpawners: MRE.Actor[]=[];

	private previousSpawnIndex = 0;

	constructor(private context: MRE.Context, private baseUrl: string, private assets: MRE.AssetContainer,
		private ourPiano: Piano, private allHands: MRE.Actor[]) {

	}

	public async createAsyncItems() {
		this.sphereMesh = this.assets.createSphereMesh('sphere', 0.5, 16, 16);
		await this.sphereMesh.created;
		this.boxMesh = this.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		await this.boxMesh.created;

		//https://en.wikipedia.org/wiki/File:Blue_Marble_2002.png
		//const filename = `${this.baseUrl}/` + "Blue_Marble_2002.png";

		//http://paulbourke.net/geometry/spherical/
		const filename = `${this.baseUrl}/` + "soccer_sph.png";

		this.sphereTexture = this.assets.createTexture("earth", {
			uri: filename
		});
		await this.sphereTexture.created;

		this.spawnerParent = MRE.Actor.Create(this.context, {
			actor: {
				name: 'spawner_parent',
				transform: {
					app: { position: new MRE.Vector3(0, 2, 0) }
				}

			}
		});
		await this.spawnerParent.created();

		await this.createFloorPlane();

		const spawnWidth = 0.5;

		this.spawnerParent.setCollider(MRE.ColliderType.Box, false, new MRE.Vector3(spawnWidth,0.1,spawnWidth));

		this.spawnerParent.enableRigidBody({
			enabled: true,
			isKinematic: true,
			useGravity: false
		});
		this.spawnerParent.grabbable = true; //so we can move it around

		for (let z = 0; z < 3; z++) {
			for (let x = 0; x < 3; x++) {
				const spawnVec3 = new MRE.Vector3(x * spawnWidth / 3 - spawnWidth / 2,
					0,
					z * spawnWidth / 3 - spawnWidth / 2);

				const singleSpawner = MRE.Actor.Create(this.context, {
					actor: {
						name: 'spawnActor' + x + '_' + z,
						parentId: this.spawnerParent.id,
						transform: {
							local: {
								position: spawnVec3,
								scale: new MRE.Vector3(0.1, 0.01, 0.1)
							}
						},
						appearance:
						{
							meshId: this.boxMesh.id,
							//materialId: mattId
						},
					}
				});
				await singleSpawner.created();
				singleSpawner.subscribe('transform'); //so we can check on position later
				this.ourSpawners.push(singleSpawner);
			}
		}
	
		for (let i = 0; i < 10; i++) {
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

	private async createFloorPlane() {
		const floorMesh= this.assets.createBoxMesh('floorMesh',1,0.1,1);
		await floorMesh.created;

		this.floorPlane = MRE.Actor.Create(this.context, {
			actor: {
				name: 'floorplane',
				//parentId: this.spawnerParent.id,
				transform: {
					app: {
						position: new MRE.Vector3 (0,1,0), 
					}
				},
				appearance:
				{
					meshId: floorMesh.id,
					enabled: true //set true for debugging
				}
			}
		});
		await this.floorPlane.created();

		this.floorPlane.setCollider(MRE.ColliderType.Auto, false);		
	}

	private async createSphere(pos: MRE.Vector3, scale: number, meshID: MRE.Guid) {
		MRE.log.info("app","trying to create bubble at: " + pos );
		const ourSphere = MRE.Actor.Create(this.context, {
			actor: {
				name: 'sphere',
				//parentId: this.spawnerParent.id,
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
		await ourSphere.created();

		this.ourBubbles.push(ourSphere);

		//ourSphere.setCollider(MRE.ColliderType.Auto, true); //trigger
		ourSphere.setCollider(MRE.ColliderType.Box, false, new MRE.Vector3(1.0, 1.0, 1.0)); 
		ourSphere.collider.enabled=false;

		ourSphere.enableRigidBody({
			enabled: false,
			isKinematic: false,
			useGravity: false
		});

		ourSphere.collider.onCollision("collision-enter", (data: MRE.CollisionData) => {
			//ourSphere.collider.onTrigger('trigger-enter', (otherActor: MRE.Actor) => {
			const otherActor = data.otherActor;

			if (this.allHands.includes(otherActor)) { //bubble touches hand
				MRE.log.info("app", "touched one of our hands! lets play a sound!");
				this.playBubble(ourSphere);
			} else if (data.otherActor.id === this.floorPlane.id) { //bubble touches floor
				MRE.log.info("app", "bubble touched the floor");
				ourSphere.rigidBody.enabled=false;
			} else if (this.readyToPlayBubbles.has(data.otherActor)) { //bubble touches another bubble
				MRE.log.info("app", "touched another bubble!");				
				ourSphere.rigidBody.useGravity = true;				
				data.otherActor.rigidBody.useGravity = true;
			} else{
				MRE.log.info("app", "sphere collided with: " + otherActor.name);
			}
		});
	}

	private spawnParticleEffect(pos: MRE.Vector3){
		const particleActor=MRE.Actor.CreateFromLibrary(this.context, {
			resourceId: "artifact:1474401976627233047",
			actor: {
				name: 'particle burst',
				transform: {
					app:{
						position: pos
					},
					local: {
						scale: { x: 1.0, y: 1.0, z: 1.0}
					}
				}
			}
		});
		setTimeout(() => {
			MRE.log.info("app", "2 seconds has expired. deleting particle effect");
			particleActor.destroy();
		}, 2000);
	}

	public turnOff() {
		for (const [ourSphere, ourSound] of this.readyToPlayBubbles) {
			ourSphere.collider.enabled = false;
			ourSphere.appearance.enabled = false;
			ourSound.stop();
			this.readyToPlayBubbles.delete(ourSphere);
		}

		this.playingBubbles=[];

		this.floorPlane.collider.enabled=false;
	}
	public turnOn()	{
		this.floorPlane.collider.enabled=true;
	}

	private playBubble(ourSphere: MRE.Actor) {
		ourSphere.rigidBody.enabled = false;	
		ourSphere.rigidBody.useGravity=false;
		ourSphere.collider.enabled = false;
		ourSphere.appearance.enabled = false;

		this.readyToPlayBubbles.get(ourSphere).resume(); //start sound
		this.readyToPlayBubbles.delete(ourSphere);
		
		this.playingBubbles.push(ourSphere); //move over to playing list

		setTimeout(() => {
			MRE.log.info("app", "5 seconds has expired. deleting bubble: " + ourSphere.name);
			const bIndex=this.playingBubbles.indexOf(ourSphere);
			if(bIndex>-1){
				this.playingBubbles.splice(bIndex);
			}
		}, 5000); //allow time for sound to play, then delete.
		//this.spawnParticleEffect(ourSphere.transform.app.position);
	}

	public spawnBubble(note: number, vel: number) {
		MRE.log.info("app","trying to spawn bubble for: " + note);
		const octave = Math.floor(note / 12) - 1;
		const noteNum = note % 12;
		const scale = ((9 - octave) / 8.0) * 0.04;
		let spawnIndex = 0;

		do { //make sure we don't spawn into same exact spot
			spawnIndex = Math.floor(Math.random() * this.ourSpawners.length);
		} while (spawnIndex === this.previousSpawnIndex);
		const singleSpawner=this.ourSpawners[spawnIndex];
		MRE.log.error("app","  found a spawn spot: " + spawnIndex);

		this.previousSpawnIndex = spawnIndex;
		
		let ourSphere: MRE.Actor=null;
		ourSphere=this.ourBubbles[0];
		if(this.playingBubbles.includes(ourSphere)){
			MRE.log.error("app","no free bubbles! everything playing!");
			return;
		} else{
			MRE.log.info("app","  first bubble will work" + spawnIndex);
		}

		ourSphere=this.ourBubbles.shift(); //cycle to the back 
		this.ourBubbles.push(ourSphere);

		if (this.readyToPlayBubbles.has(ourSphere)) {
			MRE.log.info("app","  already active, have to disable first");
			this.readyToPlayBubbles.get(ourSphere).stop();
			//this.readyToPlayBubbles.delete(ourSphere);
		}

		ourSphere.transform.local.scale=new MRE.Vector3(scale,scale,scale);

		const soundInstance: MRE.MediaInstance =
			ourSphere.startSound(this.ourPiano.getSoundGUID(note), {
				doppler: 0,
				pitch: 0.0,
				looping: false,
				paused: true,
				volume: 1.0
			});

		this.readyToPlayBubbles.set(ourSphere, soundInstance);

		const spawnPos=singleSpawner.transform.app.position.clone();
		spawnPos.y-= 0.2;
		MRE.log.info("app","  spawning at pos: " + spawnPos);

		ourSphere.rigidBody.movePosition(
			{
				x: spawnPos.x, 
				y: spawnPos.y,
				z: spawnPos.z
			});		

		ourSphere.collider.enabled = true;

		ourSphere.rigidBody.enabled = true;
		ourSphere.rigidBody.useGravity=false;
		ourSphere.rigidBody.velocity={x: 0, y:-0.3, z: 0};
		//ourSphere.rigidBody.velocity={x: 0, y:-0.3+Math.random()*0.0001, z: 0};

		ourSphere.appearance.materialId = this.noteMaterials[noteNum].id;
		ourSphere.appearance.enabled = true;
	}	
}
