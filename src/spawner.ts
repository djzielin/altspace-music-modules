/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import Piano from './piano';

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
	private playingBubbles: Map<MRE.Actor, MRE.MediaInstance> = new Map();
	//rivate activeBubbles: MRE.Actor[] = [];
	private ourSpawners: MRE.Actor[]=[];
	//private ourSpawners: MRE.Vector3[]=[];
	private noteMaterials: MRE.Material[] = [];
	private spawnerParent: MRE.Actor;
	private gridParent: MRE.Actor;
	private earthTexture: MRE.Texture;
	private floorPlane: MRE.Actor=null;

	private previousSpawnIndex =0;

	constructor(private context: MRE.Context, private baseUrl: string, private assets: MRE.AssetContainer,
		private ourPiano: Piano, private allHands: MRE.Actor[]) {

		
		this.sphereMesh = this.assets.createSphereMesh('sphere', 0.5, 10, 10);
		const boxMesh = this.assets.createBoxMesh('boxMesh',1.0,1.0,1.0);

		//https://en.wikipedia.org/wiki/File:Blue_Marble_2002.png
		//const filename = `${this.baseUrl}/` + "Blue_Marble_2002.png";

		//http://paulbourke.net/geometry/spherical/
		const filename = `${this.baseUrl}/` + "soccer_sph.png"; 
		
		this.earthTexture=this.assets.createTexture("earth", {
			uri: filename
		});

		this.spawnerParent = MRE.Actor.Create(this.context, {
			actor: {
				name: 'spawner_parent',
				transform: {
					app: { position: new MRE.Vector3(0, 1.5, 0) }
				}
				
			}
		});

		this.createFloorPlane();

		//this.spawnerParent.setCollider(MRE.ColliderType.Box, false, new MRE.Vector3(2,0.25,2));

		/*this.spawnerParent.enableRigidBody({
			enabled: true,
			isKinematic: true,
			useGravity: false
		});
		this.spawnerParent.grabbable = true; //so we can move it around
		*/

		this.gridParent = MRE.Actor.Create(this.context, {
			actor: {
				name: 'grid_parent',
				parentId: this.spawnerParent.id,
				transform: {
					local: { position: new MRE.Vector3(0, 0, 0) }
				},
				appearance:	{
					enabled: true
				}
				

			}
		});	

		const lineMat: MRE.Material = this.assets.createMaterial('lineMat', {
			color: new MRE.Color4(0.0,0.5,0.0)
		});


		let xGridCells = 3;
		let yGridCells = 3;
		let zGridCells = 1;
		let cubeDim=0.75;

		for (let y = 0; y < yGridCells+1; y++) {
			const yPos = y * (cubeDim/yGridCells)-cubeDim/2;
			for (let x = 0; x < xGridCells + 1; x++) {
				const xPos = x * (cubeDim/xGridCells) - cubeDim/2;
				MRE.Actor.Create(this.context, {
					actor: {
						name: 'gridLine' + x + y,
						parentId: this.gridParent.id,
						transform: {
							local: {
								position: new MRE.Vector3(xPos, yPos, 0),
								scale: new MRE.Vector3(0.01, 0.01, cubeDim)
							}
						},
						appearance:
						{
							meshId: boxMesh.id,
							materialId: lineMat.id
						},
					}
				});

			}
			for (let z = 0; z < zGridCells + 1; z++) {
				const zPos = z * (cubeDim/zGridCells) - cubeDim/2;
				MRE.Actor.Create(this.context, {
					actor: {
						name: 'gridLine' + y + z,
						parentId: this.gridParent.id,
						transform: {
							local: {
								position: new MRE.Vector3(0, yPos, zPos),
								scale: new MRE.Vector3(cubeDim, 0.01, 0.01)
							}
						},
						appearance:
						{
							meshId: boxMesh.id,
							materialId: lineMat.id
						},
					}
				});
			}
		}

		for (let x = 0; x < xGridCells + 1; x++) {
			const xPos = x * (cubeDim/xGridCells) - cubeDim/2;
			for (let z = 0; z < zGridCells + 1; z++) {
				const zPos = z * (cubeDim/zGridCells) - cubeDim/2;

				MRE.Actor.Create(this.context, {
					actor: {
						name: 'vertical_gridLine',
						parentId: this.gridParent.id,
						transform: {
							local: {
								position: new MRE.Vector3(xPos, 0, zPos),
								scale: new MRE.Vector3(0.01, cubeDim, 0.01)
							}
						},
						appearance:
						{
							meshId: boxMesh.id,
							materialId: lineMat.id
						},
					}
				});
			}
		}

		for (let x = 0; x < xGridCells; x++) {
			const xPos = (x+0.5) * (cubeDim/xGridCells) - cubeDim/2;
			for (let z = 0; z < zGridCells; z++) {
				const zPos = (z+0.5) * (cubeDim/zGridCells) - cubeDim/2 ;
				for (let y = 0; y < yGridCells; y++) {
					const yPos = (y +0.5)* (cubeDim/yGridCells) - cubeDim/2 ;
					const ourSphere=this.createSphere(new MRE.Vector3(xPos,yPos,zPos), (cubeDim/yGridCells));
					this.ourSpawners.push(ourSphere);
				}
			}
		}


		for (const noteColor of this.noteColors) {
			const ourMat: MRE.Material = this.assets.createMaterial('bubblemat', {
				color: noteColor,
				mainTextureId: this.earthTexture.id
			});
			this.noteMaterials.push(ourMat);
		}
	}

	private createFloorPlane() {
		const floorMesh= this.assets.createBoxMesh('floorMesh',20,0.1,20);
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
					enabled: true //set true for debugging
				}
			}
		});

		this.floorPlane.setCollider(MRE.ColliderType.Auto, false);		
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

	private createSphere(pos: MRE.Vector3, scale: number): MRE.Actor {

	


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
					meshId: this.sphereMesh.id,
					enabled: false
				}
			}
		});

		ourSphere.setCollider(MRE.ColliderType.Auto, true); //trigger
		ourSphere.collider.enabled=false;

		ourSphere.enableRigidBody({
			enabled: true,
			isKinematic: true,
			useGravity: false,
		});

		//ourSphere.collider.onCollision("collision-enter", (data: MRE.CollisionData) => {
		ourSphere.collider.onTrigger('trigger-enter', (otherActor: MRE.Actor) => {
			//const otherActor=data.otherActor;
			MRE.log.info("app", "sphere collided with: " + otherActor.name);

			if (this.allHands.includes(otherActor)) { //bubble touches hand
				MRE.log.info("app", "  this was one of our hands! lets do something!");
				//ourSphere.rigidBody.enabled = false;
				ourSphere.collider.enabled = false;
				ourSphere.appearance.enabled = false;

				this.playingBubbles.get(ourSphere).resume(); //start sound
				
				setTimeout(() => {
					MRE.log.info("app", "5 seconds has expired. deleting bubble: " + ourSphere.name);
					//this.playingBubbles.get(ourSphere).stop(); //make sure sound is done
					this.playingBubbles.delete(ourSphere);
					//ourSphere.destroy();
				}, 5000); //allow time for sound to play, then delete.
				//this.spawnParticleEffect(ourSphere.transform.app.position);
			}

			/*		if(data.otherActor.id===this.floorPlane.id){ //bubble touches floor
						MRE.log.info("app","  bubble touched the floor, destroying");
			
						this.removeBubbleFromActiveArray(ourSphere);
						ourSphere.destroy();
					}
			
					if(this.activeBubbles.includes(data.otherActor)) { //bubble touches another bubble
						MRE.log.info("app","  touched another bubble! destroying");
			
						this.removeBubbleFromActiveArray(ourSphere);
						ourSphere.destroy();
			
						this.removeBubbleFromActiveArray(data.otherActor);
						data.otherActor.destroy();
					}
					*/
		});

		//ourSphere.collider.enabled = false;

		return ourSphere;
	}

	public spawnBubble(note: number, vel: number) {
		MRE.log.info("app","trying to spawn bubble for: " + note);
		const octave = Math.floor(note / 12) - 1;
		const noteNum = note % 12;
		const scale = ((9 - octave) / 8.0) * 0.4;
		let spawnIndex = 0;

		if(this.playingBubbles.size===this.ourSpawners.length){
			MRE.log.info("app", "no free slots, skipping this note spawn");
			return;
		}

		let slotUsed=false;
		do {
			spawnIndex = Math.floor(Math.random() * this.ourSpawners.length);
			slotUsed=this.playingBubbles.has(this.ourSpawners[spawnIndex]);

		} while (slotUsed) //if full, keep looking 

		const ourSphere = this.ourSpawners[spawnIndex];
		const soundInstance: MRE.MediaInstance =
			ourSphere.startSound(this.ourPiano.getSoundGUID(note), {
				doppler: 0,
				pitch: 0.0,
				looping: false,
				paused: true,
				volume: 1.0
			});

		this.playingBubbles.set(ourSphere, soundInstance);

		ourSphere.appearance.enabled = true;
		ourSphere.appearance.materialId = this.noteMaterials[noteNum].id;
		ourSphere.collider.enabled = true;		
	}	

	/*private removeBubbleFromActiveArray(bubble: MRE.Actor) {
		const bIndex = this.activeBubbles.indexOf(bubble);
		if (bIndex > -1) {
			this.activeBubbles.splice(bIndex, 1);
		}
	}*/
}
