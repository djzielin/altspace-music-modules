/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import App from './app';
import MusicModule from './music_module';
import GeoArtifacts from './geo_artifacts';
import { posix } from 'path';

enum AuthType {
	Moderators = 0,
	All = 1,
	SpecificUser = 2
}

interface TravelAnimation {
	animation: MRE.Animation;
	time: number;
	startPos: MRE.Vector3;
	endPos: MRE.Vector3;
}

interface SingleGeo{
	name: string;
	scale: number;
	artifactIndex: number;
	midiNote: number;
	geoPositioner: MRE.Actor;
	geoActor: MRE.Actor;
	position: MRE.Vector3;
	breathAnimation: MRE.Animation;
	growAnimation: MRE.Animation;
	travelAnimation: TravelAnimation;
	userClicked: MRE.Guid;
	insideParticle: MRE.Actor;
}

export default class Geo extends MusicModule {
	public ourInteractionAuth = AuthType.All;
	public authorizedUser: MRE.User;

	private ourGeos: SingleGeo[]=[];

	//public geoParent: MRE.Actor;
	public breathAnimData: MRE.AnimationData;
	public growAnimData: MRE.AnimationData;


	public audioRange = 50.0;
	public geoScale = 1.0;

	public artifacts: GeoArtifacts;
	public geoPositioners: Map<number, MRE.Actor> = new Map();

	
	private keyLocations: Map<number, MRE.Vector3> = new Map();
	private canBePicked: Map<number, boolean> = new Map();

	constructor(protected ourApp: App) {
		super(ourApp);
		this.artifacts = new GeoArtifacts();
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

	private setupBreathAnimation() {
		this.breathAnimData = this.ourApp.assets.createAnimationData("Breath", {
			tracks: [{
				target: MRE.ActorPath("target").transform.local.scale,
				keyframes: [
					{ time: 0.0, value: { x: 1.0, y: 1.0, z: 1.0 } },
					{ time: 0.5, value: { x: 1.0, y: 1.0, z: 1.0 } },
					{ time: 3.0, value: { x: 1.1, y: 1.1, z: 1.1 } },
					{ time: 3.5, value: { x: 1.1, y: 1.1, z: 1.1 } },
					{ time: 6.0, value: { x: 1.0, y: 1.0, z: 1.0 } }
				]
			}]
		});
	}

	private setupgrowAnimation() {
		this.growAnimData = this.ourApp.assets.createAnimationData("Breath", {
			tracks: [{
				target: MRE.ActorPath("target").transform.local.position,
				keyframes: [
					{ time: 0.0, value: { x: 0, y: -0.5, z: 0 } },
					{ time: 0.5, value: { x: 0, y: 0.0, z: 0 } }
				]
			}]
		});
	}

	//TODO: paramaterize this
	private generateRandomPos(scale: number): MRE.Vector3 {
		return new MRE.Vector3(Math.random() * 30 - 10, Math.random() * 2 + 0.5 * scale, Math.random() * 30 - 15);
	}
	
	private createActorFromArtifact(resourceId: string, position: MRE.Vector3, rotation: MRE.Quaternion,
		scale: MRE.Vector3, parentID: MRE.Guid): MRE.Actor {
		const artifact = MRE.Actor.CreateFromLibrary(this.ourApp.context, {
			resourceId: resourceId,
			actor: {
				name: 'artifact' + resourceId,
				parentId: parentID,
				transform: {
					local: {
						position: position,
						rotation: rotation,
						scale: scale
					}
				}
			}
		});
		return artifact;
	}

	public async createAllGeos(pos: MRE.Vector3, rot = new MRE.Quaternion()) {
		if (!this.ourGrabber) {
			this.createGrabber(pos, rot);
		} else {
			this.ourGrabber.setPos(pos);
			this.ourGrabber.setRot(rot);
		}

		this.setupBreathAnimation();
		this.setupgrowAnimation();


		/*this.geoParent = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'keyboard_parent',
				parentId: this.ourGrabber.getGUID(),
				transform: {
					local: {
						position: new MRE.Vector3(0, 0, 0),
						scale: new MRE.Vector3(this.geoScale, this.geoScale, this.geoScale)
					}
				}
			}
		});*/

		this.ourApp.ourConsole.
			logMessage(`GEO: creating new geo installation`);
		//this.ourApp.ourConsole.logMessage(`octaves: ${totalOctaves}`);

		for (let i = 0; i < 75; i++) { //TODO paramaterize this
			const geoIndex = Math.floor(Math.random() * 42); //skip the slanted shape
			this.ourApp.ourConsole.
				logMessage(`GEO: creating geo: ` + i + " index: "
					+ geoIndex + " artifact: " + this.artifacts.artifacts[geoIndex]);
			const geoScale = Math.random() * 1.0 + 0.5;
			const geoPos = this.generateRandomPos(geoScale);
			const midi = Math.floor(Math.random() * 88) + 21;

			// collider type to use with different shapes
			/*	0-6  box
				7-13 sphere
				14-20 box
				21-27 sphere
				28-34 sphere
				35-41 box
				42-48 skip
			*/

			let colliderType = MRE.ColliderType.Sphere;

			if ((geoIndex > -1 && geoIndex < 7) ||
				(geoIndex > 13 && geoIndex < 21) ||
				(geoIndex > 35 && geoIndex < 42)) {
				colliderType = MRE.ColliderType.Box;
			}

			const spawnRot =
				MRE.Quaternion.FromEulerAngles(Math.random() * 360, Math.random() * 360, Math.random() * 360);

			const geoPositioner = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					name: 'individualKeyParent',
					//parentId: this.geoParent.id,
					transform: {
						local: {
							position: geoPos,
							scale: { x: geoScale, y: geoScale, z: geoScale },
							rotation: spawnRot
						}
					}
				}
			});

			const geoActor = MRE.Actor.CreateFromLibrary(this.ourApp.context, {
				resourceId: this.artifacts.artifacts[geoIndex],
				actor: {
					name: 'geo' + i,
					parentId: geoPositioner.id,
					transform: {
						local: {
							scale: new MRE.Vector3(1.0, 1.0, 1.0)
						}
					},
					collider: {
						geometry: {
							shape: colliderType 
						},
						isTrigger: true
					}
				}
			});

			await geoActor.created();

			const oneGeo = {
				name: "geo"+i,
				scale: geoScale,
				artifactIndex: geoIndex,
				midiNote: midi,
				geoPositioner: geoPositioner,
				geoActor: geoActor,
				position: geoPos,
				breathAnimation: null as MRE.Animation,
				growAnimation: null as MRE.Animation,
				travelAnimation: null as TravelAnimation,
				userClicked: null as MRE.Guid,
				insideParticle: null as MRE.Actor
			}


			this.breathAnimData.bind(
				{ target: geoActor },
				{
					speed: (1 / geoScale) * 0.5,
					isPlaying: true,
					wrapMode: MRE.AnimationWrapMode.Loop
				}).then((anim: MRE.Animation) => {
				oneGeo.breathAnimation = anim;
			});

			this.growAnimData.bind(
				{ target: geoPositioner },
				{
					speed: 1,
					isPlaying: false,
					wrapMode: MRE.AnimationWrapMode.Once
				}).then((anim: MRE.Animation) => {
				oneGeo.growAnimation = anim;
			});

			this.ourGeos.push(oneGeo);

			this.setupInteractions(oneGeo);
		}
	}

	private clickOnGeo(oneGeo: SingleGeo, userID: MRE.Guid){
		this.ourApp.ourConsole.logMessage("GEO: user clicked on: " + oneGeo.name);

		let oldPos = oneGeo.position.clone();

		if (oneGeo.travelAnimation) {
			this.ourApp.ourConsole.logMessage("GEO:   stopping current travel animation");

			const ourAnim=oneGeo.travelAnimation;
			ourAnim.animation.stop();
			const completedTime = ourAnim.animation.normalizedTime;
			oldPos = MRE.Vector3.Lerp(ourAnim.startPos, ourAnim.endPos, completedTime / ourAnim.time);

			const index = this.ourApp.context.animations.indexOf(ourAnim.animation);
			if (index > -1) {
				this.ourApp.context.animations.splice(index, 1); //remove from global list
			}
			ourAnim.animation.delete();
			oneGeo.travelAnimation=null;
		}

		//oneGeo.growAnimation.play(true);
		
		this.ourApp.ourConsole.logMessage("GEO:   available. so activating! " + oneGeo.name);
		oneGeo.userClicked=userID;

		this.geoPressed(oneGeo);

		const newPos = this.generateRandomPos(oneGeo.scale);

		const dist = MRE.Vector3.Distance(oldPos, newPos);
		const speed = Math.random() * 0.5 + 0.5;
		const time = dist / speed;
		this.ourApp.ourConsole.logMessage("GEO:   time for travel: " + time);

		const travelAnimData = this.ourApp.assets.createAnimationData("Travel" + oneGeo.name, {
			tracks: [{
				target: MRE.ActorPath("target").transform.local.position,
				keyframes: [
					{ time: 0.0, value: { x: oldPos.x, y: oldPos.y, z: oldPos.z } },
					{ time: time, value: { x: newPos.x, y: newPos.y, z: newPos.z } }
				]
			}]
		});

		oneGeo.position = newPos;

		
		const userChest = this.ourApp.ourUsers.getUserChest(userID);
		if (userChest) {
			this.ourApp.ourConsole.logMessage("GEO:  chestID: " + userChest.id);

			const pos1 = userChest.transform.app.position;
			const pos2 = oldPos;
			const d = MRE.Vector3.Distance(pos1, pos2);
			const scale = d / 10;

			this.ourApp.ourConsole.logMessage("GEO:  chest pos: " + pos1);

			const projectileParticle = this.createActorFromArtifact(this.artifacts.particleEffects[0],
				userChest.transform.app.position.add(new MRE.Vector3(0,0.0,0)),
				MRE.Quaternion.LookAt(pos1,pos2), 
				new MRE.Vector3(0.5, 0.5, scale), 
				MRE.ZeroGuid);
			this.ourApp.ourConsole.logMessage("GEO:  created particle!");

			setTimeout(() => {
				projectileParticle.destroy();
			}, 2000);
		} else {
			this.ourApp.ourConsole.logMessage("GEO:   ERROR - no user chest");
		}


		/*if (!oneGeo.insideParticle) {
			const s=0.05;
			const insideParticle = this.createActorFromArtifact(this.artifacts.particleEffects[1], //3
				MRE.Vector3.Zero(), 
				MRE.Quaternion.Identity(),
				new MRE.Vector3(s, s, s), 
				oneGeo.geoPositioner.id);
			this.ourApp.ourConsole.logMessage("GEO:  created insideParticle!");
			oneGeo.insideParticle = insideParticle;
		}*/
		travelAnimData.bind(
			{ target: oneGeo.geoPositioner },
			{ speed: 1, isPlaying: true, wrapMode: MRE.AnimationWrapMode.Once }).then((ourAnim) => {
			
			const ourAnimation = {
				animation: ourAnim,
				time: time,
				startPos: oldPos,
				endPos: newPos
			}

			oneGeo.travelAnimation = ourAnimation;
			ourAnim.finished().then(() => {
				const index = this.ourApp.context.animations.indexOf(ourAnim);
				if (index > -1) {
					this.ourApp.context.animations.splice(index, 1); //remove from global list
				}
				ourAnim.delete();
				oneGeo.travelAnimation = null;

				if(oneGeo.insideParticle){
					oneGeo.insideParticle.destroy();
					oneGeo.insideParticle=null;
				}
			});
		});
	}

	private setupInteractions(oneGeo: SingleGeo) {
		const collisionActor = oneGeo.geoActor;

		//no touches for the moment
		/*collisionActor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
			this.ourApp.ourConsole.logMessage("GEO: trigger enter on piano note!");

			if (otherActor.name.includes('SpawnerUserHand') && !this.doGeo) { //bubble touches hand
				const guid = otherActor.name.substr(16);
				//this.ourApp.ourConsole.logMessage("  full user name is: " + otherActor.name);
				//this.ourApp.ourConsole.logMessage("  guid is: " + guid);

				if (this.ourInteractionAuth === AuthType.All || this.ourApp.ourUsers.isAuthorizedString(guid)) {
					this.keyPressed(i, 100);
				}

			} else {
				this.ourApp.ourConsole.logMessage("key collided with: " + otherActor.name);
			}
		});

		collisionActor.collider.onTrigger("trigger-exit", (otherActor: MRE.Actor) => {
			this.ourApp.ourConsole.logMessage("GEO: trigger enter on piano note!");

			if (otherActor.name.includes('SpawnerUserHand') && !this.doGeo) { //bubble touches hand
				const guid = otherActor.name.substr(16);
				//this.ourApp.ourConsole.logMessage("  full user name is: " + otherActor.name);
				//this.ourApp.ourConsole.logMessage("  guid is: " + guid);

				if (this.ourInteractionAuth === AuthType.All || this.ourApp.ourUsers.isAuthorizedString(guid)) {
					this.keyReleased(i);
				}

			} else {
				//this.ourApp.ourConsole.logMessage("sphere collided with: " + otherActor.name);
			}
		});*/

		const buttonBehavior = collisionActor.setBehavior(MRE.ButtonBehavior);
		buttonBehavior.onButton("pressed", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				this.clickOnGeo(oneGeo,user.id);
			} else {
				this.ourApp.ourConsole.logMessage("GEO: user not authorized to click: " + oneGeo.name);
			}
		});

		//TODO: only do release if user had triggered note
		buttonBehavior.onButton("released", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				if(oneGeo.userClicked===user.id){
					this.geoReleased(oneGeo)
					oneGeo.userClicked=null;
				}
			}
		});

		//TODO: only do release if user had triggered note
		buttonBehavior.onHover("exit", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				if(oneGeo.userClicked===user.id){
					this.geoReleased(oneGeo)
					oneGeo.userClicked=null;
				}
			}
		});
	}

	public receiveData(data: any[], messageType: string) {
		if (messageType === "midi") {
			if (data.length > 1) {
				const note = data[0] as number;
				const vel = data[1] as number;

				this.keyPressed(note, vel);
			}
		}
	}

	public keyPressed(note: number, vel: number) {
		let foundGeo: SingleGeo = null;

		for (const geo of this.ourGeos) {
			if (geo.midiNote === note) {
				foundGeo = geo;
				break;
			}
		}

		if (foundGeo) {
			if (vel > 0) {
				this.clickOnGeo(foundGeo, MRE.ZeroGuid);
			} else {
				this.geoReleased(foundGeo);
			}
		}
	}

	public keyReleased(note: number){
		this.keyPressed(note, 0);
	}

	public geoPressed(oneGeo: SingleGeo) {	
		/*const mKeyboard = MRE.Matrix.Compose(
			this.geoParent.transform.local.scale,
			this.geoParent.transform.local.rotation,
			this.geoParent.transform.local.position);
*/
		const mPoint = MRE.Matrix.Compose(
			new MRE.Vector3(1, 1, 1),
			MRE.Quaternion.Identity(),
			new MRE.Vector3(0,0,0));

		// transformedPoint = mPoint.multiply(mKeyboard);
		const posInWorld = this.getWorldPosFromMatrix(mPoint);

		const message = [oneGeo.midiNote, 100, 0, 
			posInWorld.x, posInWorld.y, posInWorld.z, 
			oneGeo.geoPositioner.id.toString()];
		this.sendData(message, "midi");
	}

	public geoReleased(oneGeo: SingleGeo) {		
		const message = [oneGeo.midiNote, 0, 0];
		this.sendData(message, "midi");
	}
}
