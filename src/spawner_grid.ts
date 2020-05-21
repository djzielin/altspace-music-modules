/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import Piano from './piano';

export default class SpawnerGrid {

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

	private previousSpawnIndex =0;

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
					app: { position: new MRE.Vector3(0, 1.5, 0) }
				}

			}
		});
		await this.spawnerParent.created();

		await this.createFloorPlane();

		const xGridCells = 3;
		const yGridCells = 3;
		const zGridCells = 1;
		const cubeDim = 0.75;

		//so we can move it around
		/*
		this.spawnerParent.setCollider(MRE.ColliderType.Box, false, new MRE.Vector3(2,0.25,2));
		this.spawnerParent.enableRigidBody({
			enabled: true,
			isKinematic: true,
			useGravity: false
		});
		this.spawnerParent.grabbable = true; 
		*/

		for (let x = 0; x < xGridCells; x++) {
			const xPos = (x + 0.5) * (cubeDim / xGridCells) - cubeDim / 2;
			for (let z = 0; z < zGridCells; z++) {
				const zPos = (z + 0.5) * (cubeDim / zGridCells) - cubeDim / 2;
				for (let y = 0; y < yGridCells; y++) {
					const yPos = (y + 0.5) * (cubeDim / yGridCells) - cubeDim / 2;
					await this.createSphere(
						new MRE.Vector3(xPos, yPos, zPos),
						.02, //(cubeDim / yGridCells) * 0.9,
						this.sphereMesh.id);
					//this.boxMesh.id);
				}
			}
		}
		MRE.log.info("app", "created all bubbles");

		for (const noteColor of this.noteColors) {
			const ourMat: MRE.Material = this.assets.createMaterial('bubblemat', {
				color: noteColor,
				mainTextureId: this.sphereTexture.id
			});
			await ourMat.created;
			this.noteMaterials.push(ourMat);
		}

		MRE.log.info("app", "complete all spawner object creation");
	}

	private async createFloorPlane() {
		const floorMesh= this.assets.createBoxMesh('floorMesh',20,0.1,20);
		await floorMesh.created;

		this.floorPlane = MRE.Actor.Create(this.context, {
			actor: {
				name: 'floorplane',
				parentId: this.spawnerParent.id,
				transform: {
					local: {
						position: new MRE.Vector3 (0,-0.75/2-0.1/2,0), //todo reference cube size
					}
				},
				appearance:
				{
					meshId: floorMesh.id,
					enabled: false //set true for debugging
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
				parentId: this.spawnerParent.id,
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
		ourSphere.setCollider(MRE.ColliderType.Sphere, true, 0.5); //trigger
		//ourSphere.setCollider(MRE.ColliderType.Auto, true); //trigger

		ourSphere.collider.onTrigger('trigger-enter', (otherActor: MRE.Actor) => {
			MRE.log.info("app", "sphere collided with: " + otherActor.name);

			if (this.allHands.includes(otherActor)) { //bubble touches hand
				MRE.log.info("app", "  this was one of our hands! lets do something!");
				this.playBubble(ourSphere);
			}
		});

		ourSphere.collider.enabled=false;
		
		//allow user to click on bubble (so still works in desktop mode)
		const clickBehavior = ourSphere.setBehavior(MRE.ButtonBehavior);

		clickBehavior.onClick(() => {
			this.playBubble(ourSphere);
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

	/*public turnOff() {
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
*/
	private playBubble(ourSphere: MRE.Actor) {
		//ourSphere.rigidBody.enabled = false;
		ourSphere.collider.enabled = false;
		ourSphere.appearance.enabled = false;

		this.readyToPlayBubbles.get(ourSphere).resume(); //start sound
		this.readyToPlayBubbles.delete(ourSphere);
		
		this.playingBubbles.push(ourSphere); //move over to playing list

		setTimeout(() => {
			MRE.log.info("app", "5 seconds has expired. deleting bubble: " + ourSphere.name);
			//this.playingBubbles.get(ourSphere).stop(); //make sure sound is done
			const bIndex=this.playingBubbles.indexOf(ourSphere);
			if(bIndex>-1){
				this.playingBubbles.splice(bIndex);
			}
			//ourSphere.destroy();
		}, 5000); //allow time for sound to play, then delete.
		//this.spawnParticleEffect(ourSphere.transform.app.position);
	}

	public spawnBubble(note: number, vel: number) {
		MRE.log.info("app","trying to spawn bubble for: " + note);
		//const octave = Math.floor(note / 12) - 1;
		const noteNum = note % 12;
		//const scale = ((9 - octave) / 8.0) * 0.4;
		let spawnIndex = 0;

		if((this.readyToPlayBubbles.size+this.playingBubbles.length)===this.ourBubbles.length){
			MRE.log.info("app", "no free slots, skipping this note spawn");
			return;
		}

		let slotUsed=false;
		do {
			spawnIndex = Math.floor(Math.random() * this.ourBubbles.length);
			const sphereActor=this.ourBubbles[spawnIndex];
			slotUsed=this.readyToPlayBubbles.has(sphereActor) || this.playingBubbles.includes(sphereActor);
		} while (slotUsed) //if full, keep looking 

		MRE.log.info("app","  spawning at index: " + spawnIndex);

		const ourSphere = this.ourBubbles[spawnIndex];
		const soundInstance: MRE.MediaInstance =
			ourSphere.startSound(this.ourPiano.getSoundGUID(note), {
				doppler: 0,
				pitch: 0.0,
				looping: false,
				paused: true,
				volume: 1.0
			});

		this.readyToPlayBubbles.set(ourSphere, soundInstance);

		ourSphere.appearance.enabled = true;
		MRE.log.info("app","  enabling appearance");
		ourSphere.appearance.materialId = this.noteMaterials[noteNum].id;
		ourSphere.collider.enabled = true;	
		MRE.log.info("app","  enabling collider");

	
	
	}	

	/*private removeBubbleFromActiveArray(bubble: MRE.Actor) {
		const bIndex = this.activeBubbles.indexOf(bubble);
		if (bIndex > -1) {
			this.activeBubbles.splice(bIndex, 1);
		}
	}*/
}
