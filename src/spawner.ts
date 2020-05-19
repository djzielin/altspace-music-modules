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
	private playingBubbles: Map<MRE.Actor, number> = new Map();
	private activeBubbles: MRE.Actor[] = [];
	private ourSpawners: MRE.Actor[]=[];
	//private ourSpawners: MRE.Vector3[]=[];
	private noteMaterials: MRE.Material[] = [];
	private spawnerParent: MRE.Actor;
	private gridParent: MRE.Actor;

	private previousSpawnIndex =0;

	constructor(private context: MRE.Context, private assets: MRE.AssetContainer,
		private ourPiano: Piano, private allHands: MRE.Actor[], private floorPlane: MRE.Actor) {

		this.sphereMesh = this.assets.createSphereMesh('sphere', 0.5, 10, 10);
		const boxMesh = this.assets.createBoxMesh('boxMesh',1.0,1.0,1.0);


		this.spawnerParent = MRE.Actor.Create(this.context, {
			actor: {
				name: 'spawner_parent',
				transform: {
					app: { position: new MRE.Vector3(0, 1, 0) }
				}
			}
		});

		this.gridParent = MRE.Actor.Create(this.context, {
			actor: {
				name: 'spawner_parent',
				parentId: this.spawnerParent.id,
				transform: {
					local: { position: new MRE.Vector3(0, 0, 0) }
				}
				

			}
		});


		this.spawnerParent.setCollider(MRE.ColliderType.Box, false, new MRE.Vector3(2,0.25,2));

		/*this.spawnerParent.enableRigidBody({
			enabled: true,
			isKinematic: true,
			useGravity: false
		});
		this.spawnerParent.grabbable = true; //so we can move it around
		*/

		const lineMat: MRE.Material = this.assets.createMaterial('lineMat', {
			color: new MRE.Color4(0.0,0.5,0.0)
		});


		let numGridCells = 3;
		let oneOverGridNum= 1 / numGridCells;

		for (let y = 0; y < numGridCells+1; y++) {
			let yPos = y * oneOverGridNum-0.5;
			for (let x = 0; x < numGridCells + 1; x++) {
				let xPos = x * oneOverGridNum - 0.5;
				MRE.Actor.Create(this.context, {
					actor: {
						name: 'gridLine' + x + y,
						parentId: this.spawnerParent.id,
						transform: {
							local: {
								position: new MRE.Vector3(xPos, yPos, 0),
								scale: new MRE.Vector3(0.01, 0.01, 1.0)
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
			for (let z = 0; z < numGridCells + 1; z++) {
				let zPos = z * oneOverGridNum - 0.5;
				MRE.Actor.Create(this.context, {
					actor: {
						name: 'gridLine' + y + z,
						parentId: this.spawnerParent.id,
						transform: {
							local: {
								position: new MRE.Vector3(0, yPos, zPos),
								scale: new MRE.Vector3(1.0, 0.01, 0.01)
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

		for (let x = 0; x < numGridCells + 1; x++) {
			let xPos = x * oneOverGridNum - 0.5
			for (let z = 0; z < numGridCells + 1; z++) {
				let zPos = z * oneOverGridNum - 0.5;

				MRE.Actor.Create(this.context, {
					actor: {
						name: 'vertical_gridLine',
						parentId: this.spawnerParent.id,
						transform: {
							local: {
								position: new MRE.Vector3(xPos, 0, zPos),
								scale: new MRE.Vector3(0.01, 1.0, 0.01)
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

		for (let x = 0; x < numGridCells; x++) {
			const xPos = x * oneOverGridNum - 0.5 + oneOverGridNum * 0.5;
			for (let z = 0; z < numGridCells; z++) {
				const zPos = z * oneOverGridNum - 0.5 + oneOverGridNum * 0.5;
				for (let y = 0; y < numGridCells; y++) {
					const yPos = y * oneOverGridNum - 0.5 + oneOverGridNum * 0.5

					const ourSphere = MRE.Actor.Create(this.context, {
						actor: {
							name: 'sphere',
							parentId: this.gridParent.id,
							transform: {
								local: {
									position: new MRE.Vector3(xPos,yPos,zPos),
									scale: new MRE.Vector3(oneOverGridNum,oneOverGridNum,oneOverGridNum)
								}
							},
							appearance: {
								meshId: this.sphereMesh.id//,
								//materialId: this.noteMaterials[noteNum].id
							}
						}
					});

					this.ourSpawners.push(ourSphere);
				}
			}
		}


		for (const noteColor of this.noteColors) {
			const ourMat: MRE.Material = this.assets.createMaterial('bubblemat', {
				color: noteColor
			});
			this.noteMaterials.push(ourMat);
		}
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

	public spawnBubble(note: number, vel: number) {
		const octave = Math.floor(note / 12) - 1;
		const noteNum = note % 12;
		const scale = ((9 - octave) / 8.0) * 0.4;
		let spawnIndex=0;
/*
		do { //make sure we don't spawn into same exact spot
			spawnIndex = Math.floor(Math.random() * this.ourSpawners.length);
		} while (spawnIndex === this.previousSpawnIndex); 

		this.previousSpawnIndex=spawnIndex;	
		const spawnPos=this.ourSpawners[spawnIndex].transform.local.position.clone();
		spawnPos.y= -0.5;

		const ourSphere = MRE.Actor.Create(this.context, {
			actor: {
				name: 'sphere' + note,
				parentId: this.spawnerParent.id,
				transform: {
					local: {
						position: spawnPos,
						scale: new MRE.Vector3(scale, scale, scale)
					}
				},
				appearance: {
					meshId: this.sphereMesh.id,
					materialId: this.noteMaterials[noteNum].id
				}
			}
		});

		//const velFloat=vel/127.0;

		ourSphere.setCollider(MRE.ColliderType.Auto, false);
		ourSphere.enableRigidBody({
			enabled: true,
			isKinematic: false,
			useGravity: false,
			//velocity: new MRE.Vector3(0.0,0,-0.3)
			velocity: new MRE.Vector3(0,-0.3,0)
		});
		ourSphere.subscribe('transform'); //so we can check on position, ect. later


		this.activeBubbles.push(ourSphere);

		const soundInstance: MRE.MediaInstance =
			ourSphere.startSound(this.ourPiano.getSoundGUID(note), {
				doppler: 0,
				pitch: 0.0,
				looping: false,
				paused: true,
				volume: 1.0
			});

		ourSphere.collider.onCollision( "collision-enter", (data: MRE.CollisionData) => {
			MRE.log.info("app","sphere collided with: " + data.otherActor.name);
			
			if(this.allHands.includes(data.otherActor)) { //bubble touches hand
				MRE.log.info("app","  this was one of our hands! lets do something!");
				ourSphere.rigidBody.enabled=false;
				ourSphere.collider.enabled=false;
				ourSphere.appearance.enabled=false;

				soundInstance.resume();
				
				this.playingBubbles.set(ourSphere, Date.now());
				setTimeout(() => {
					MRE.log.info("app","5 seconds has expired. deleting bubble: " + ourSphere.name);
					this.playingBubbles.delete(ourSphere);
					this.removeBubbleFromActiveArray(ourSphere);
					ourSphere.destroy();
				}, 5000); //allow time for sound to play, then delete.
				

				this.spawnParticleEffect(ourSphere.transform.app.position); 
			}			

			if(data.otherActor.id===this.floorPlane.id){ //bubble touches floor
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
		});
		*/
	}

	private removeBubbleFromActiveArray(bubble: MRE.Actor) {
		const bIndex = this.activeBubbles.indexOf(bubble);
		if (bIndex > -1) {
			this.activeBubbles.splice(bIndex, 1);
		}
	}
}
