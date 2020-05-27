/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import {Session} from '../../mixed-reality-extension-sdk/packages/sdk/built/internal/adapters/multipeer'

import PianoReceiver from './receiver'
import Piano from './piano'
import Spawner from './spawner'
import { User } from '../../mixed-reality-extension-sdk/packages/sdk/';

/**
 * The main class of this app. All the logic goes here.
 */

interface UserProperties{
	name: string;
	userID: MRE.Guid;
	id: MRE.Guid;
	parentActor: MRE.Actor;
	buttonActor: MRE.Actor;
	labelActor: MRE.Actor;
}

export default class App {
	private assets: MRE.AssetContainer;

	private ourPiano: Piano = null;
	private ourSpawner: any = null;

	private boxMesh: MRE.Mesh;
	private redMat: MRE.Material;
	private greenMat: MRE.Material;

	private consoleTextActor: MRE.Actor=null;
	private consoleText: string[]=[];
	private consoleOn=true;
	private consoleParent: MRE.Actor=null;

	private allUsers: UserProperties[]=[];
	private allHands: MRE.Actor[] =[];

	
	constructor(private context: MRE.Context, private baseUrl: string, 
			private ourReceiver: PianoReceiver, private session: Session) {
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

	private userJoined(user: MRE.User) {
		this.logMessage("user joined. name: " + user.name + " id: " + user.id);

		const rHand=this.createHand('right-hand', user.id, new MRE.Vector3(0, 0,0.1), 
			new MRE.Vector3(0.06, 0.06, 0.14));
		const lHand=this.createHand('left-hand', user.id, new MRE.Vector3(0, 0, 0.1),
			new MRE.Vector3(0.06, 0.06, 0.14));

		this.allHands.push(rHand);
		this.allHands.push(lHand);

		this.logMessage("  hand array is now size: " + this.allHands.length);

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
						position: { x: 0, y: 0.101, z: 0},
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
						position: { x: 0, y: 0.101, z: 0.0},
						rotation: MRE.Quaternion.FromEulerAngles(this.degToRad(90), 0, 0)
					}
				}
			}
		});	

		let id=MRE.ZeroGuid;
		const clients=this.session.clients;
		for (const client of clients) {
			if (client.userId === user.id) {
				id = client.id;
				break;
			}
		}

		const ourUser={
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
				this.logMessage("making user: " + ourUser.name + " authoritative!");
				this.session.setAuthoritativeClient(ourUser.id); //can't be user.id! needs to be id!
				this.updateUserDisplay();
			});


		this.updateUserDisplay();
	}

	private updateUserDisplay()
	{
		const authoritativeUserID=this.session.authoritativeClient.userId;
		this.logMessage("authoritative user is currently id: " + authoritativeUserID);

		for(let i=0;i<this.allUsers.length;i++)	{
			const ourUser=this.allUsers[i];
			ourUser.parentActor.transform.local.position=new MRE.Vector3(0,0,-0.15-i*0.15);
			if(ourUser.userID===authoritativeUserID) {
				ourUser.buttonActor.appearance.material=this.greenMat;
			} else{
				ourUser.buttonActor.appearance.material=this.redMat;
			}
		}
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

		let i=0;
		for(i=0;i<this.allUsers.length;i++)	{
			const ourUser=this.allUsers[i];
			if(ourUser.userID===user.id){
				ourUser.labelActor.destroy();
				ourUser.buttonActor.destroy();
				ourUser.parentActor.destroy();
				this.updateUserDisplay();
			}
		}

		this.allUsers.splice(i,1);

		this.logMessage("  hand array is now size: " + this.allHands.length);
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
		this.consoleParent = MRE.Actor.Create(this.context, {
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
		await this.consoleParent.created();

		const consoleMat = this.assets.createMaterial('consolemat', {
			color: new MRE.Color3(0, 0, 0)
		});
		await consoleMat.created;	

		const consoleBackground = MRE.Actor.Create(this.context, {
			actor: {
				parentId: this.consoleParent.id,
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
				parentId: this.consoleParent.id,
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

	private async createConsoleToggleButton() {

		const button = MRE.Actor.Create(this.context, {
			actor: {
				//parentId: menu.id,
				name: "consoleToggleButton",
				appearance: { 
					meshId: this.boxMesh.id,
					materialId: this.greenMat.id
				},
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: {
						position: { x: 0, y: 0.05, z: 0.3 },
						scale: new MRE.Vector3(0.75, 0.1, 0.1)
					}
				}
			}
		});

		await button.created();

		const buttonLabel = MRE.Actor.Create(this.context, {
			actor: {
				name: 'label',
				text: {
					contents: "Console is On",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 0.101, z: 0.3 },
						rotation: MRE.Quaternion.FromEulerAngles(this.degToRad(90), 0, 0)
					}
				}
			}
		});
		await buttonLabel.created();

		// Set a click handler on the button.
		button.setBehavior(MRE.ButtonBehavior)
			.onClick(() => {
				if (this.consoleOn) {
					this.consoleOn = false;
					if (this.consoleParent) {
						this.consoleParent.appearance.enabled = false;
						button.appearance.material=this.redMat;
					}
					buttonLabel.text.contents = "Console is Off";
				} else {
					this.consoleOn = true;
					if (this.consoleParent) {
						this.consoleParent.appearance.enabled = true;
						button.appearance.material=this.greenMat;
					}
					buttonLabel.text.contents = "Console is On";
				}
			});
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

	

	public vector2String(v: MRE.Vector3, precision: number){
		return 	"{X: " + v.x.toFixed(precision) +
				" Y: " + v.y.toFixed(precision) + 
				" Z: " + v.z.toFixed(precision) + "}";
	}

	private async loadAsyncItems() {
		this.logMessage("Loading async items!");

		this.redMat = this.assets.createMaterial('redmat', {
			color: new MRE.Color4(1, 0, 0)
		});

		this.greenMat = this.assets.createMaterial('redmat', {
			color: new MRE.Color4(0, 1, 0)
		});

		this.logMessage("Creating Console");
		await this.createConsole();

		this.logMessage("Creating Console Toggle Button ");
		await this.createConsoleToggleButton();

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
