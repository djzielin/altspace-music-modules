/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import PianoReceiver from './receiver'
import Piano from './piano'
import Spawner from './spawner'

/**
 * The main class of this app. All the logic goes here.
 */


export default class App {
	private assets: MRE.AssetContainer;

	private ourPiano: Piano = null;
	private ourSpawner: any = null;
	private boxMesh: MRE.Mesh;
	private consoleTextActor: MRE.Actor=null;
	private consoleText: string[]=[];

	private allHands: MRE.Actor[] =[];

	constructor(private context: MRE.Context, private baseUrl: string, private ourReceiver: PianoReceiver) {
		for(let i=0;i<25;i++){
			this.consoleText.push("");
		}

		this.logMessage("our App constructor started");
		this.assets = new MRE.AssetContainer(context);
		
		//this.boxMesh=	this.assets.createSphereMesh('sphere', 0.5, 10,10);
		this.boxMesh = this.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);

		this.context.onStarted(() => this.started());
		this.context.onUserLeft(user => this.userLeft(user));
		this.context.onUserJoined(user => this.userJoined(user));	
	}	

	private PianoReceiveCallback(note: number, vel: number): void {
		this.logMessage(`App received - note: ${note} vel: ${vel}`);

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
					meshId: this.boxMesh.id,
					enabled: false
				}
			}
		});

		hand.setCollider(MRE.ColliderType.Box, false);
		hand.enableRigidBody({
			enabled: true,
			isKinematic: true,
			useGravity: false//,
			//collisionDetectionMode: MRE.CollisionDetectionMode.Discrete
			//collisionDetectionMode: MRE.CollisionDetectionMode.Continuous
			//collisionDetectionMode: MRE.CollisionDetectionMode.ContinuousDynamic
		});

		//hand.subscribe('transform');
		//hand.subscribe('rigidbody');
		//hand.subscribe('collider');

		return hand;
	}

	private degToRad(degrees: number) {
		const pi = Math.PI;
		return degrees * (pi / 180);
	}
	
	private async createConsole() {
		const consoleParent = MRE.Actor.Create(this.context, {
			actor: {
				name: "parent",
				transform: {
					local: {
						position: { x: 1.5, y: 0, z: 0 },
						scale: new MRE.Vector3(0.5, 0.5, 0.5)
					}
				}
			}
		});
		await consoleParent.created();

		const consoleMat = this.assets.createMaterial('consolemat', {
			color: new MRE.Color3(0, 0, 0)
		});
		await consoleMat.created;	

		const consoleBackground = MRE.Actor.Create(this.context, {
			actor: {
				parentId: consoleParent.id,
				name: "consoleBackground",
				appearance: {
					meshId: this.boxMesh.id,
					materialId: consoleMat.id
				},
				transform: {
					local: {
						position: { x: 0, y: 0.05, z: 0 },
						scale: new MRE.Vector3(4.4, 0.1, 2.5)
					}
				}
			}
		});
		await consoleBackground.created();

		this.consoleTextActor = MRE.Actor.Create(this.context, {
			actor: {
				parentId: consoleParent.id,
				name: 'consoleText',
				text: {
					contents: "test",
					height: 2.0/25,
					anchor: MRE.TextAnchorLocation.TopLeft,
					color: new MRE.Color3(1,1,1)
				},
				transform: {
					local: {
						position: { x: -(4.4/2)+0.05, y: 0.101, z: (2.5/2)-0.05 },
						rotation: MRE.Quaternion.FromEulerAngles(this.degToRad(90), 0, 0)
					}
				}
			}
		});
		await this.consoleTextActor.created();
	
		this.logMessage("log initialized");
	}

	private async createResetButton() {

		const button = MRE.Actor.Create(this.context, {
			actor: {
				//parentId: menu.id,
				name: "resetButton",
				appearance: { meshId: this.boxMesh.id },
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: {
						position: { x: 0, y: 0.05, z: 0 },
						scale: new MRE.Vector3(0.5, 0.1, 0.1)
					}
				}
			}
		});

		await button.created();

		// Set a click handler on the button.
		button.setBehavior(MRE.ButtonBehavior)
			.onClick(() => {
				process.exit(0);
			});


		const buttonLabel = MRE.Actor.Create(this.context, {
			actor: {
				name: 'label',
				text: {
					contents: "Reset",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 0.101, z: 0 },
						rotation: MRE.Quaternion.FromEulerAngles(this.degToRad(90), 0, 0)
					}
				}
			}
		});
		await buttonLabel.created();
	}

	public logMessage(message: string) { //TODO: trim lines longer then 80 width
		MRE.log.info("app", message);

		this.consoleText.push(message);
		this.consoleText.shift();

		if (this.consoleTextActor) {
			let combinedText = "";

			for (const s of this.consoleText) {
				combinedText += s.substr(0,80);
				combinedText += "\n";
			}
			this.consoleTextActor.text.contents = combinedText;
		}
	}

	private userJoined(user: MRE.User) {
		this.logMessage("user joined. name: " + user.name + " id: " + user.id);

		const rHand=this.createHand('right-hand', user.id, new MRE.Vector3(0, 0,0.1), 
			new MRE.Vector3(0.06, 0.06, 0.14));
		const lHand=this.createHand('left-hand', user.id, new MRE.Vector3(0, 0, 0.1),
			new MRE.Vector3(0.06, 0.06, 0.14));

		this.allHands.push(rHand);
		this.allHands.push(lHand);

		this.logMessage("  hand array is now size: " + this.allHands.length);
	}

	private userLeft(user: MRE.User) {
		this.logMessage("user left. name: " + user.name + " id: " + user.id);

		const handsToDelete: MRE.Actor[] = [];

		for (let i = 0; i < this.allHands.length; i++) {
			const hand = this.allHands[i];
			const userID = hand.attachment.userId;
			if (userID === user.id) {
				this.logMessage("  found one of the users hands: " + this.allHands[i].name);
				handsToDelete.push(hand);
			}
		}

		for (const hand of handsToDelete) {
			const hIndex = this.allHands.indexOf(hand);
			if (hIndex > -1) {
				this.allHands.splice(hIndex, 1);
				this.logMessage("  removed " + hand.name);
			}
		}

		this.logMessage("  hand array is now size: " + this.allHands.length);
	}

	private Vector2String(v: MRE.Vector3, precision: number){
		return 	"{X: " + v.x.toFixed(precision) +
				" Y: " + v.y.toFixed(precision) + 
				" Z: " + v.z.toFixed(precision) + "}";
	}

	private async loadAsyncItems() {
		this.logMessage("Loading async items!");
		this.logMessage("Creating Console");
		await this.createConsole();

		this.logMessage("Creating Reset Button ");
		await this.createResetButton();

		this.logMessage("creating piano keys");
		this.ourPiano = new Piano(this.context, this.baseUrl, this.assets);
		await this.ourPiano.createAllKeys();
		await this.ourPiano.loadAllSounds();

		this.logMessage("Loading spawner items");
		this.ourSpawner = new Spawner(this.context, this.baseUrl, this.assets,
			this.ourPiano, this.allHands, this); //TODO pass this better
		await this.ourSpawner.createAsyncItems();
	}
		
	private started() {
		this.loadAsyncItems().then(() => {
			this.logMessage("all async items created/loaded!");
			this.ourReceiver.ourCallback = this.PianoReceiveCallback.bind(this);
		});

	}
}
