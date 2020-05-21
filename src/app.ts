/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import PianoReceiver from './receiver'
import Piano from './piano'
import SpawnerGrid from './spawner_grid'

/**
 * The main class of this app. All the logic goes here.
 */


export default class HelloWorld {
	private assets: MRE.AssetContainer;

	private ourPiano: Piano = null;
	private ourSpawner: SpawnerGrid = null;
	private handMesh: MRE.Mesh;

	private allHands: MRE.Actor[] =[];

	constructor(private context: MRE.Context, private baseUrl: string, private ourReceiver: PianoReceiver) {
		MRE.log.info("app", "our constructor started");
		this.assets = new MRE.AssetContainer(context);
		
		this.handMesh=	this.assets.createSphereMesh('sphere', 0.5, 10,10);

		this.context.onStarted(() => this.started());
		this.context.onUserLeft(user => this.userLeft(user));
		this.context.onUserJoined(user => this.userJoined(user));	
	}	

	private PianoReceiveCallback(note: number, vel: number): void {
		MRE.log.info("app", `App received - note: ${note} vel: ${vel}`);

		if (vel > 0) {
			this.ourPiano.playSound(note, vel);
			this.ourPiano.keyPressed(note);
			this.ourSpawner.spawnBubble(note, vel);

		} else {
			this.ourPiano.stopSound(note);
			this.ourPiano.keyReleased(note);
		}
	}

	private createHand(aPoint: string, userID: MRE.Guid, handPos: MRE.Vector3, handScale: MRE.Vector3) {
		const hand = MRE.Actor.Create(this.context, {
			actor: {
				name: aPoint + userID,
				transform: {
					local: {
						position: handPos,
						scale: handScale
					}
				},
				attachment: {
					attachPoint: aPoint as MRE.AttachPoint,
					userId: userID
				},
				appearance:
				{
					meshId: this.handMesh.id,
					enabled: true
				}
			}
		});

		hand.setCollider(MRE.ColliderType.Auto, false);
		hand.enableRigidBody({
			enabled: true,
			isKinematic: true,
			useGravity: false
		});

		return hand;
	}

	private userJoined(user: MRE.User) {
		MRE.log.info("app", "user joined. name: " + user.name + " id: " + user.id);

		const rHand=this.createHand('right-hand', user.id, new MRE.Vector3(0, 0,0.1), new MRE.Vector3(0.1, 0.1, 0.2));
		const lHand=this.createHand('left-hand', user.id, new MRE.Vector3(0, 0, 0.1), new MRE.Vector3(0.1, 0.1, 0.2));

		this.allHands.push(rHand);
		this.allHands.push(lHand);

		MRE.log.info("app", "  hand array is now size: " + this.allHands.length);
	}

	private userLeft(user: MRE.User) {
		MRE.log.info("app", "user left. name: " + user.name + " id: " + user.id);

		const handsToDelete: MRE.Actor[] = [];

		for (let i = 0; i < this.allHands.length; i++) {
			const hand = this.allHands[i];
			const userID = hand.attachment.userId;
			if (userID === user.id) {
				MRE.log.info("app", "  found one of the users hands: " + this.allHands[i].name);
				handsToDelete.push(hand);
			}
		}

		for (const hand of handsToDelete) {
			const hIndex = this.allHands.indexOf(hand);
			if (hIndex > -1) {
				this.allHands.splice(hIndex, 1);
				MRE.log.info("app", "  removed " + hand.name);
			}
		}

		MRE.log.info("app", "  hand array is now size: " + this.allHands.length);
	}

	private Vector2String(v: MRE.Vector3, precision: number){
		return 	"{X: " + v.x.toFixed(precision) +
				" Y: " + v.y.toFixed(precision) + 
				" Z: " + v.z.toFixed(precision) + "}";
	}

	private async loadAsyncItems() {
		MRE.log.info("app", "Loading async items!");
		MRE.log.info("app", "Loading piano items");
		this.ourPiano = new Piano(this.context, this.baseUrl, this.assets);
		await this.ourPiano.createAllKeys();
		await this.ourPiano.loadAllSounds();

		MRE.log.info("app", "Loading spawner items");
		this.ourSpawner = new SpawnerGrid(this.context, this.baseUrl, this.assets,
			this.ourPiano, this.allHands); //TODO pass this better
		await this.ourSpawner.createAsyncItems();
	}
		
	private started() {
		this.loadAsyncItems().then(() => {
			MRE.log.info("app", " all items loaded!");
			this.ourReceiver.ourCallback = this.PianoReceiveCallback.bind(this);
		});

	}
}
