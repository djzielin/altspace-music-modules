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
import Button from './button';

/**
 * The main class of this app. All the logic goes here.
 */

interface UserProperties {
	name: string;
	userID: MRE.Guid;
	clientId: MRE.Guid;
	ourButton: Button;
}

export default class App {
	public assets: MRE.AssetContainer;

	public ourPiano: Piano = null;
	public ourSpawner: any = null;
	public ourWavPlayer: WavPlayer = null;
	public ourConsole: Console = null;
	public menuBase: MRE.Actor = null;
	
	public boxMesh: MRE.Mesh;
	public redMat: MRE.Material;
	public greenMat: MRE.Material;
	public handGrabMat: MRE.Material;
	
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

	//from functional-tests / user-test.ts
	private formatProperties(props: { [key: string]: string }): string {
		let output = "";
		for (const k in props) {
			if (Object.prototype.hasOwnProperty.call(props, k)) {
				output += `\n   ${k}: ${props[k]}`;
			}
		}
		return output;
	}

	private userJoined(user: MRE.User) {
		this.ourConsole.logMessage("user joined. name: " + user.name + " id: " + user.id);

		const ourRoles = user.properties["altspacevr-roles"];
		if (!ourRoles.includes("moderator") &&
			!ourRoles.includes("presenter") && !ourRoles.includes("terraformer")) {
			this.ourConsole.logMessage("user doesn't have enough roles to have hands added!");
			return;
		}

		//TODO allow us to add in hands later (if user it made moderator for instance)
		const rHand = this.createHand('right-hand', user.id, new MRE.Vector3(0, 0, 0.1),
			new MRE.Vector3(0.06, 0.06, 0.14));
		const lHand = this.createHand('left-hand', user.id, new MRE.Vector3(0, 0, 0.1),
			new MRE.Vector3(0.06, 0.06, 0.14));

		this.allHands.push(rHand);
		this.allHands.push(lHand);

		this.ourConsole.logMessage("  hand array is now size: " + this.allHands.length);

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
			clientId: id,
			ourButton: null as Button
		}
		this.allUsers.push(ourUser);

		this.updateAuthUserDisplay();
	}

	private makeAuthoritative(ourUser: UserProperties)
	{
		this.ourConsole.logMessage("making user: " + ourUser.name + " authoritative!");
		this.session.setAuthoritativeClient(ourUser.clientId); //can't be user.id! needs to be client.id!
		this.updateAuthUserDisplay();
	}

	private updateAuthUserDisplay() {
		if(!this.menuBase){
			return;
		}

		const authoritativeUserID = this.session.authoritativeClient.userId;
		this.ourConsole.logMessage("authoritative user is currently id: " + authoritativeUserID);
		this.ourConsole.logMessage("number of users: "+ this.allUsers.length);

		for (let i = 0; i < this.allUsers.length; i++) {
			const ourUser = this.allUsers[i];
			const areWeAuthoritative=(ourUser.userID === authoritativeUserID);

			const pos= new MRE.Vector3(0-0.6, 0, -0.15 - i * 0.15);

			if(!ourUser.ourButton){ //create a button if we don't already have one
				const ourButton=new Button(this);
				ourButton.createAsync(pos,this.menuBase.id,ourUser.name,ourUser.name,
					false, this.makeAuthoritative.bind(this,ourUser)).then(() => {
					ourUser.ourButton=ourButton;
				});
			} else{
				ourUser.ourButton.setPos(pos);
				ourUser.ourButton.setValue(areWeAuthoritative);
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
				ourUser.ourButton.destroy();
				this.allUsers.splice(i, 1);
				this.updateAuthUserDisplay();
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
	private doReset(){
		process.exit(0);
	}

	public vector2String(v: MRE.Vector3, precision: number) {
		return "{X: " + v.x.toFixed(precision) +
			" Y: " + v.y.toFixed(precision) +
			" Z: " + v.z.toFixed(precision) + "}";
	}

	private async loadAsyncItems() {

		const filename = `${this.baseUrl}/` + "hand_grey.png"; 
		
		const handTexture=this.assets.createTexture("hand", {
			uri: filename
		});

		this.handGrabMat = this.assets.createMaterial('handMat', {
			color: new MRE.Color4(1, 1, 1),
			mainTextureId: handTexture.id
		});

		this.menuBase = MRE.Actor.Create(this.context, {
			actor: {
				name: "menuGrabber",
				transform: {
					local: {
						position: { x: 2, y: 0.1, z: 0 },

					}
				},
				appearance: {
					meshId: this.assets.createBoxMesh('boxMesh', 0.25, 0.1, 0.25).id,
					materialId: this.handGrabMat.id
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Box
					},
					isTrigger: false
				},
				grabbable: true
			}
		});

		this.ourConsole.logMessage("creating console");
		await this.ourConsole.createAsyncItems(this.menuBase);

		this.ourConsole.logMessage("Creating Reset Button ");
		const button=new Button(this);
		await button.createAsync(new MRE.Vector3(0-0.6,0,0.5),this.menuBase.id,"Reset","Reset",
			false, this.doReset.bind(this));

		const authLabel = MRE.Actor.Create(this.context, {
			actor: {
				parentId: this.menuBase.id,
				name: 'authoritativeLabel',
				text: {
					contents: "Authoritative:",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0-0.6, y: 0.101, z: 0.0 },
						rotation: MRE.Quaternion.FromEulerAngles(this.degToRad(90), 0, 0)
					}
				}
			}
		});
		await authLabel.created();

		this.ourConsole.logMessage("Creating Wav Player");
		this.ourWavPlayer=new WavPlayer(this);
		await this.ourWavPlayer.loadAllSounds();

		this.ourConsole.logMessage("creating piano keys"); 
		this.ourPiano = new Piano(this);
		await this.ourPiano.createAllKeys();

		this.ourConsole.logMessage("Loading spawner items");
		this.ourSpawner = new Spawner(this); 
		await this.ourSpawner.createAsyncItems();

		this.updateAuthUserDisplay();
	}

	private started() {
		this.loadAsyncItems().then(() => {
			this.ourConsole.logMessage("all async items created/loaded!");
			this.ourReceiver.ourCallback = this.PianoReceiveCallback.bind(this);			
		});

	}
}
