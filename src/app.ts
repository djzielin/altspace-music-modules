/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import { Session } from '../../mixed-reality-extension-sdk/packages/sdk/built/internal/adapters/multipeer'

import PianoReceiver from './receiver'
import Piano from './piano'
import Spawner from './spawner'
import { User } from '../../mixed-reality-extension-sdk/packages/sdk/';
import OscSender from './sender';
import WavPlayer from './wavplayer';
import Console from './console';

/**
 * The main class of this app. All the logic goes here.
 */

interface UserProperties {
	name: string;
	userID: MRE.Guid;
	id: MRE.Guid;
	parentActor: MRE.Actor;
	buttonActor: MRE.Actor;
	labelActor: MRE.Actor;
}

export default class App {
	public assets: MRE.AssetContainer;

	public ourPiano: Piano = null;
	public ourSpawner: any = null;
	public ourWavPlayer: WavPlayer = null;
	public ourConsole: Console = null;

	public boxMesh: MRE.Mesh;
	public redMat: MRE.Material;
	public greenMat: MRE.Material;

	public allUsers: UserProperties[] = [];
	public allHands: MRE.Actor[] = [];

	/*
		https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript	
	*/	
	public pad(value: number, maxWidth: number, padChar: string) {
		const n = value.toString();
		return n.length >= maxWidth ? n : new Array(maxWidth - n.length + 1).join(padChar) + n;
	}
	
	constructor(public context: MRE.Context, public baseUrl: string,
		public ourReceiver: PianoReceiver, public ourSender: OscSender, public session: Session) {
		this.ourConsole=new Console(this);

		this.assets = new MRE.AssetContainer(context);
		this.boxMesh = this.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		
		this.redMat = this.assets.createMaterial('redmat', {
			color: new MRE.Color4(1, 0, 0)
		});

		this.greenMat = this.assets.createMaterial('redmat', {
			color: new MRE.Color4(0, 1, 0)
		});

		this.context.onStarted(() => this.started());
		this.context.onUserLeft(user => this.userLeft(user));
		this.context.onUserJoined(user => this.userJoined(user));
	}

	private userJoined(user: MRE.User) {
		this.ourConsole.logMessage("user joined. name: " + user.name + " id: " + user.id);

		const rHand = this.createHand('right-hand', user.id, new MRE.Vector3(0, 0, 0.1),
			new MRE.Vector3(0.06, 0.06, 0.14));
		const lHand = this.createHand('left-hand', user.id, new MRE.Vector3(0, 0, 0.1),
			new MRE.Vector3(0.06, 0.06, 0.14));

		this.allHands.push(rHand);
		this.allHands.push(lHand);

		this.ourConsole.logMessage("  hand array is now size: " + this.allHands.length);

		const buttonParent = MRE.Actor.Create(this.context, {
			actor: {
				name: "userButtonbParent",
				appearance: {},

				transform: {
					local: {
						position: { x: 0, y: 0, z: 0 },
					}
				}
			}
		});

		const button = MRE.Actor.Create(this.context, {
			actor: {
				parentId: buttonParent.id,
				name: "userButton",
				appearance: { meshId: this.boxMesh.id },
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: {
						position: { x: 0, y: 0.05, z: 0 },
						scale: new MRE.Vector3(0.75, 0.1, 0.1)
					}
				}
			}
		});

		const buttonLabel = MRE.Actor.Create(this.context, {
			actor: {
				parentId: buttonParent.id,
				name: 'label',
				text: {
					contents: user.name,
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

		MRE.Actor.Create(this.context, {
			actor: {
				name: 'authoritativeLabel',
				text: {
					contents: "Authoritative:",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 0.101, z: 0.0 },
						rotation: MRE.Quaternion.FromEulerAngles(this.degToRad(90), 0, 0)
					}
				}
			}
		});

		let id = MRE.ZeroGuid;
		const clients = this.session.clients;
		for (const client of clients) {
			if (client.userId === user.id) {
				id = client.id;
				break;
			}
		}

		const ourUser = {
			name: user.name,
			userID: user.id,
			id: id,
			parentActor: buttonParent,
			buttonActor: button,
			labelActor: buttonLabel
		}

		this.allUsers.push(ourUser);

		button.setBehavior(MRE.ButtonBehavior)
			.onClick(() => {
				this.ourConsole.logMessage("making user: " + ourUser.name + " authoritative!");
				this.session.setAuthoritativeClient(ourUser.id); //can't be user.id! needs to be id!
				this.updateUserDisplay();
			});


		this.updateUserDisplay();
	}

	private updateUserDisplay() {
		const authoritativeUserID = this.session.authoritativeClient.userId;
		this.ourConsole.logMessage("authoritative user is currently id: " + authoritativeUserID);
		this.ourConsole.logMessage("number of users: "+ this.allUsers.length);
		for (let i = 0; i < this.allUsers.length; i++) {
			const ourUser = this.allUsers[i];
			ourUser.parentActor.transform.local.position = new MRE.Vector3(0, 0, -0.15 - i * 0.15);
			if (ourUser.userID === authoritativeUserID) {
				ourUser.buttonActor.appearance.material = this.greenMat;
			} else {
				ourUser.buttonActor.appearance.material = this.redMat;
			}
		}
	}

	private userLeft(user: MRE.User) {
		this.ourConsole.logMessage("user left. name: " + user.name + " id: " + user.id);

		const handsToDelete: MRE.Actor[] = [];

		for (let i = 0; i < this.allHands.length; i++) {
			const hand = this.allHands[i];
			const userID = hand.attachment.userId;
			if (userID === user.id) {
				this.ourConsole.logMessage("  found one of the users hands: " + this.allHands[i].name);
				handsToDelete.push(hand);
			}
		}

		for (const hand of handsToDelete) {
			const hIndex = this.allHands.indexOf(hand);
			if (hIndex > -1) {
				this.allHands.splice(hIndex, 1);
				this.ourConsole.logMessage("  removed " + hand.name);
			}
		}

		this.ourConsole.logMessage("  hand array is now size: " + this.allHands.length);
		
		for (let i=0; i < this.allUsers.length; i++) {
			const ourUser = this.allUsers[i];
			if (ourUser.userID === user.id) {
				ourUser.labelActor.destroy();
				ourUser.buttonActor.destroy();
				ourUser.parentActor.destroy();
				this.allUsers.splice(i, 1);
				this.updateUserDisplay();
				break;
			}
		}

		this.ourConsole.logMessage("  user array is now size: " + this.allUsers.length);


	}

	private PianoReceiveCallback(note: number, vel: number): void {
		this.ourConsole.logMessage(`App received - note: ${note} vel: ${vel}`);

		if (vel > 0) {
			//this.ourPiano.playSound(note, vel);
			this.ourPiano.keyPressed(note);
			this.ourSpawner.spawnBubble(note, vel);

		} else {
			//this.ourPiano.stopSound(note);
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

	public degToRad(degrees: number) {
		const pi = Math.PI;
		return degrees * (pi / 180);
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
						position: { x: 0, y: 0.05, z: 0.5 },
						scale: new MRE.Vector3(0.75, 0.1, 0.1)
					}
				}
			}
		});

		await button.created();

		// Set a click handler on the button.
		// TODO: maybe have extra prompt?
		// TODO: check user to to make sure performer
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
						position: { x: 0, y: 0.101, z: 0.5 },
						rotation: MRE.Quaternion.FromEulerAngles(this.degToRad(90), 0, 0)
					}
				}
			}
		});
		await buttonLabel.created();
	}

	public vector2String(v: MRE.Vector3, precision: number) {
		return "{X: " + v.x.toFixed(precision) +
			" Y: " + v.y.toFixed(precision) +
			" Z: " + v.z.toFixed(precision) + "}";
	}

	private async loadAsyncItems() {
		this.ourConsole.logMessage("creating console");
		await this.ourConsole.createAsyncItems();

		this.ourConsole.logMessage("Creating Reset Button ");
		await this.createResetButton();

		this.ourConsole.logMessage("Creating Wav Player");
		this.ourWavPlayer=new WavPlayer(this);
		await this.ourWavPlayer.loadAllSounds();

		this.ourConsole.logMessage("creating piano keys");
		this.ourPiano = new Piano(this);
		await this.ourPiano.createAllKeys();

		this.ourConsole.logMessage("Loading spawner items");
		this.ourSpawner = new Spawner(this); 
		await this.ourSpawner.createAsyncItems();
	}

	private started() {
		this.loadAsyncItems().then(() => {
			this.ourConsole.logMessage("all async items created/loaded!");
			this.ourReceiver.ourCallback = this.PianoReceiveCallback.bind(this);
		});

	}
}
