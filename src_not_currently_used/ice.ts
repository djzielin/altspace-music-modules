/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import App from './app';
import MusicModule from './music_module';

enum AuthType {
	Moderators = 0,
	All = 1,
	SpecificUser = 2
}

interface IceCube{
	actor: MRE.Actor;
	timeTouched: number;
	userInteracting: MRE.Guid;
	objectStatus: number;
	neighborList: number[];
	position: MRE.Vector3;
	velocity: MRE.Vector3;
}


export default class Ice extends MusicModule {
	public ourInteractionAuth = AuthType.All;
	public authorizedUser: MRE.User;
	public ourIceCubes: IceCube[]=[];

	constructor(protected ourApp: App) {
		super(ourApp);

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

	
	public coordMax=20;
	public spacing=0.025;

	private genIndex(x: number, y: number, z: number): number {
		if (x < 0 || x >= this.coordMax) {
			return -1;
		}
		if (y < 0 || y >= this.coordMax) {
			return -1;
		}
		if (z < 0 || z >= this.coordMax){
			return -1;
		}

		return (y*this.coordMax*this.coordMax)+(z*this.coordMax)+x;
	}

	private activateCube(i: number): MRE.Actor{	
		//.ourApp.ourConsole.logMessage("trying to active cube: " + i);

		if(i===-1){
			this.ourApp.ourConsole.logMessage("  cube is out of range!");
			return;
		}


		const ourCube=this.ourIceCubes[i];

		if(ourCube.objectStatus===0 || ourCube.objectStatus===1){
			this.ourApp.ourConsole.logMessage("  has already been activated!");
			return;
		}

		ourCube.objectStatus=1;

		const cubeActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourGrabber.getGUID(),
				name: "iceCube",
				appearance: {
					meshId: this.ourApp.boxMesh.id
					//materialId: mat
				},
				collider: { 
					geometry: { shape: MRE.ColliderType.Box },
					isTrigger: true
				},
				transform: {
					local: {
						position: ourCube.position,
						scale: new MRE.Vector3(this.spacing,this.spacing,this.spacing)
					}
				}
			}
		});
		ourCube.actor=cubeActor;

		cubeActor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
			this.ourApp.ourConsole.logMessage("ICE: trigger enter on cube");

			if (otherActor.name.includes('SpawnerUserHand')) { //bubble touches hand
				const guid = otherActor.name.substr(16);
				//this.ourApp.ourConsole.logMessage("  full user name is: " + otherActor.name);
				//this.ourApp.ourConsole.logMessage("  guid is: " + guid);

				if (this.ourInteractionAuth === AuthType.All || this.ourApp.ourUsers.isAuthorizedString(guid)) { 
					//TODO play cool sound!

					this.ourApp.ourConsole.logMessage("ICE: velocity: " + ourCube.velocity);
					//cubeActor.collider.isTrigger=false;
					//cubeActor.enableRigidBody();
					//cubeActor.rigidBody.addForce(new MRE.Vector3(0,100,0));

					//setTimeout(()=>{
					cubeActor.destroy();
					ourCube.objectStatus=0; //deleted
					//},2000);

					for(const n of ourCube.neighborList){
						this.activateCube(n);
					}
				}

			} else {
				//this.ourApp.ourConsole.logMessage("key collided with: " + otherActor.name);
			}
		});

		return cubeActor;
	}

	public async createAsync(grabPos: MRE.Vector3, rot = new MRE.Quaternion()){
		this.createGrabber(grabPos, rot);

		this.ourApp.ourConsole.logMessage("started ice creation");

		for(let y=0;y<this.coordMax;y++){
			this.ourApp.ourConsole.logMessage("y coord: " + y);

			for(let z=0;z<this.coordMax;z++){
				for(let x=0;x<this.coordMax;x++){
					const pos=new MRE.Vector3(x*this.spacing-1.5,y*this.spacing,z*this.spacing);
					const neighbors: number[]=[
						this.genIndex(x+1,y,z),this.genIndex(x-1,y,z),
						this.genIndex(x,y+1,z),this.genIndex(x,y-1,z),
						this.genIndex(x,y,z+1),this.genIndex(x,y,z-1)];

					const center=new MRE.Vector3(this.coordMax/2,this.coordMax/2,this.coordMax/2);
					const vel=(pos.subtract(center)).normalize();

					const ourCube={
						actor: null as MRE.Actor,
						timeTouched: 0.0,
						userInteracting: null as MRE.Guid,
						objectStatus: -1,
						neighborList: neighbors,
						position: pos,
						velocity:vel
					}
					this.ourIceCubes.push(ourCube);
				}
			}
		}

		this.ourApp.ourConsole.logMessage("now activating some of them");

		for (let y = 0; y < this.coordMax; y++) {
			this.ourApp.ourConsole.logMessage("y coord: " + y);

			if (y === this.coordMax - 1) { //top cap
				for (let z = 0; z < this.coordMax; z++) {
					for (let x = 0; x < this.coordMax; x++) {
						const cubeActor = this.activateCube(this.genIndex(x, y, z));
						if (x === this.coordMax - 1) {
							await cubeActor.created();
						}
					}
				}
			} else {
				let x=0;
				let z = 0;
				for (x = 0; x < this.coordMax; x++) { //bottom row
					const cubeActor = this.activateCube(this.genIndex(x, y, z));
					if (x === this.coordMax - 1) {
						await cubeActor.created();
					}
				}

				z=this.coordMax-1;
				for (x = 0; x < this.coordMax; x++) { //top row
					const cubeActor = this.activateCube(this.genIndex(x, y, z));
					if (x === this.coordMax - 1) {
						await cubeActor.created();
					}
				}

				x = 0;
				for (z = 1; z < this.coordMax-1; z++) { // left column
					const cubeActor = this.activateCube(this.genIndex(x, y, z));
					if (z === this.coordMax - 1) {
						await cubeActor.created();
					}
				}

				x=this.coordMax-1; 
				for (z = 1; z < this.coordMax-1; z++) { //right column
					const cubeActor = this.activateCube(this.genIndex(x, y, z));
					if (z === this.coordMax - 1) {
						await cubeActor.created();
					}
				}
			}
		}
	}
}
