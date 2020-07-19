/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import { Session } from '../../mixed-reality-extension-sdk/packages/sdk/built/internal/adapters/multipeer'

import PianoReceiver from './receiver'
import Piano from './piano'
import Spawner from './spawner'
import { User, Quaternion } from '../../mixed-reality-extension-sdk/packages/sdk/';
import OscSender from './sender';
import WavPlayer from './wavplayer';
import Console from './console';
import Button from './button';
import Staff from './staff';
import GrabButton from './grabbutton';
import PianoGui from './piano_gui';

/**
 * The main class of this app. All the logic goes here.
 */

interface UserProperties {
	name: string;
	user: MRE.User;
	userID: MRE.Guid;
	clientId: MRE.Guid;
	authButton: Button;
	handButton: Button;
	lHand: MRE.Actor;
	rHand: MRE.Actor;
	isModerator: boolean;
}

export default class App {
	public assets: MRE.AssetContainer;

	public ourPiano: Piano = null;
	public ourPianoGui: PianoGui = null;

	public ourStaff: Staff=null;

	//public ourPiano2: Piano = null;
	//public ourStaff2: Staff=null;

	public ourSpawner: any = null;
	public ourSpawner2: any = null;
	public ourWavPlayer: WavPlayer = null;
	public ourWavPlayer2: WavPlayer = null;
	public ourConsole: Console = null;
	public menuGrabber: GrabButton=null;

	public boxMesh: MRE.Mesh;
	public redMat: MRE.Material;
	public greenMat: MRE.Material;
	public whiteMat: MRE.Material;
	public blackMat: MRE.Material;
	public handGrabMat: MRE.Material;
	
	public allUsers: UserProperties[] = [];
	public moderatorUsers: MRE.User[] = [];
	//public allHands: MRE.Actor[] = [];

	/*
		https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript	
	*/	
	public pad(value: number, maxWidth: number, padChar: string) {
		const n = value.toString();
		return n.length >= maxWidth ? n : new Array(maxWidth - n.length + 1).join(padChar) + n;
	}
	
	constructor(public context: MRE.Context, public baseUrl: string, public baseDir: string,
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
		this.blackMat = this.assets.createMaterial('blackMat', {
			color: new MRE.Color4(0, 0, 0)
		});
		this.whiteMat = this.assets.createMaterial('whiteMat', {
			color: new MRE.Color4(1, 1, 1)
		});


		this.menuGrabber=new GrabButton(this);
		this.menuGrabber.create(new MRE.Vector3(1, 0.1, 0));

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

		let isModerator=false

		const ourRoles = user.properties["altspacevr-roles"];
		if (ourRoles.includes("moderator") ||
			ourRoles.includes("presenter") || 
			ourRoles.includes("terraformer")) {
			this.ourConsole.logMessage("  user is a moderator!");
			isModerator=true;
		}

		const rHand: MRE.Actor = null;
		const lHand: MRE.Actor = null;
		
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
			user: user,
			userID: user.id,
			clientId: id,
			authButton: null as Button,
			handButton: null as Button,
			rHand: rHand,
			lHand: lHand,
			isModerator: isModerator
		}
		this.allUsers.push(ourUser);
		this.moderatorUsers.push(user);

		this.updateUserButtons();
	}

	public findUserRecord(userID: MRE.Guid): UserProperties{
		for(let i=0;i<this.allUsers.length;i++){
			const ourUser=this.allUsers[i];
			if(ourUser.userID===userID){
				return ourUser;
			}
		}

		this.ourConsole.logMessage("ERROR: can't find userID: " + userID);
		return null;
	}

	private makeAuthoritative(ourUser: UserProperties) {
		this.ourConsole.logMessage("making user: " + ourUser.name + " authoritative!");
		this.session.setAuthoritativeClient(ourUser.clientId); //can't be user.id! needs to be client.id!
		this.updateUserButtons();
	}

	private updateUserHands(ourUser: UserProperties) {
		if(ourUser.handButton.getValue()){
			/*ourUser.rHand = this.createHand('right-hand', ourUser.userID, new MRE.Vector3(0, 0, 0.1),
				new MRE.Vector3(0.06, 0.06, 0.14));
			ourUser.lHand = this.createHand('left-hand', ourUser.userID, new MRE.Vector3(0, 0, 0.1),
				new MRE.Vector3(0.06, 0.06, 0.14));*/
			this.ourConsole.logMessage("creating hands for: " + ourUser.name);

	
			ourUser.rHand = this.createHand('right-hand', ourUser.userID, new MRE.Vector3(0, 0, 0.1),
				new MRE.Vector3(0.03, 0.03, 0.14));
			ourUser.lHand = this.createHand('left-hand', ourUser.userID, new MRE.Vector3(0, 0, 0.1),
				new MRE.Vector3(0.03, 0.03, 0.14));

		} else{
			this.ourConsole.logMessage("removing hands for: " + ourUser.name);

			if(ourUser.rHand){
				ourUser.rHand.destroy();
				ourUser.rHand=null;
			}

			if(ourUser.lHand){
				ourUser.lHand.destroy();
				ourUser.lHand=null;
			}
		}
	}

	private updateUserButtons() {
		this.ourConsole.logMessage("updating user buttons");
		const authoritativeUserID = this.session.authoritativeClient.userId;
		this.ourConsole.logMessage("  authoritative user is currently id: " + authoritativeUserID);
		this.ourConsole.logMessage("  number of users: " + this.allUsers.length);

		let userCount = 0;
		for (let i = 0; i < this.allUsers.length; i++) {
			const ourUser = this.allUsers[i];

			if (ourUser.isModerator) {
				const authButtonPos = new MRE.Vector3(0.6, 0, 0.35 - userCount * 0.15);
				const areWeAuthoritative = (ourUser.userID === authoritativeUserID);

				this.ourConsole.logMessage("  user: " + ourUser.name + " is Auth: " + areWeAuthoritative);
				if (!ourUser.authButton) { //create a button if we don't already have one
					this.ourConsole.logMessage("  user needs an Auth button: " + ourUser.name);
					const ourButton = new Button(this);
					ourButton.createAsync(authButtonPos, this.menuGrabber.getGUID(), ourUser.name, ourUser.name,
						areWeAuthoritative, this.makeAuthoritative.bind(this, ourUser)).then(() => {
							ourUser.authButton = ourButton;
							ourButton.doVisualUpdates = false; //we'll handle toggling
						});
				} else {
					ourUser.authButton.setPos(authButtonPos);
					ourUser.authButton.setValue(areWeAuthoritative);
				}

				userCount++;
			}

			const handButtonPos = new MRE.Vector3(1.5 + Math.floor(i / 10) * 1.0, 0, 0.35 + -(i % 10) * 0.15);

			if (!ourUser.handButton) { //create a button if we don't already have one
				this.ourConsole.logMessage("  user needs an Hand button: " + ourUser.name);
				const ourButton = new Button(this);
				ourButton.createAsync(handButtonPos, this.menuGrabber.getGUID(), ourUser.name, ourUser.name,
					false, this.updateUserHands.bind(this, ourUser)).then(() => {
						ourUser.handButton = ourButton;
					});
			} else {
				ourUser.handButton.setPos(handButtonPos);
			}
		}
	}

	private userLeft(user: MRE.User) {
		this.ourConsole.logMessage("user left. name: " + user.name + " id: " + user.id);
		this.ourConsole.logMessage("  user array pre-deletion is size: " + this.allUsers.length);
		for (let i = 0; i < this.allUsers.length; i++) {
			const ourUser = this.allUsers[i];

			if (ourUser.userID === user.id) {
				if (ourUser.authButton) {
					ourUser.authButton.destroy();
				}
				if (ourUser.handButton) {
					ourUser.handButton.destroy();
				}
				this.allUsers.splice(i, 1);
				this.updateUserButtons();
				break;
			}
		}

		this.ourConsole.logMessage("  user array is now size: " + this.allUsers.length);
	}

	private PianoReceiveCallback(note: number, vel: number): void {
		this.ourConsole.logMessage(`App received - note: ${note} vel: ${vel}`);

		if (vel > 0) {
			//if(this.ourWavPlayer){
			//	this.ourWavPlayer.playSound(note,127,new MRE.Vector3(0,0,0), 20.0);
			//}
			if (this.ourPiano) {
				this.ourPiano.keyPressed(note);
			}
			if (this.ourSpawner) {
				this.ourSpawner.spawnBubble(note, vel);
			}
			if (this.ourSpawner2) {
				this.ourSpawner2.spawnBubble(note, vel);
			}
			if (this.ourStaff) {
				this.ourStaff.receiveNote(note, vel);
			}
		} else {
			//this.ourPiano.stopSound(note);
			if (this.ourPiano) {
				this.ourPiano.keyReleased(note);
			}
		}
	}

	private createHand(aPoint: string, userID: MRE.Guid, handPos: MRE.Vector3, handScale: MRE.Vector3) {
		const hand = MRE.Actor.Create(this.context, {
			actor: {
				name: 'SpawnerUserHand',
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

	public isAuthorized(user: MRE.User): boolean {
		const ourRoles = user.properties["altspacevr-roles"];

		if (ourRoles.includes("moderator") || ourRoles.includes("presenter") || ourRoles.includes("terraformer")) {
			return true;
		}

		return false;
	}

	private async loadAsyncItems() {
		this.ourConsole.logMessage("creating console");
		await this.ourConsole.createAsyncItems(this.menuGrabber.getGUID());

		this.ourConsole.logMessage("Creating Reset Button ");
		const button=new Button(this);
		await button.createAsync(new MRE.Vector3(0-0.6,0,0.5),this.menuGrabber.getGUID(),"Reset","Reset",
			false, this.doReset.bind(this));

		const authLabel = MRE.Actor.Create(this.context, {
			actor: {
				parentId: this.menuGrabber.getGUID(),
				name: 'authoritativeLabel',
				text: {
					contents: "Authoritative:",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0.5, y: 0.101, z: 0.5 },
						rotation: MRE.Quaternion.FromEulerAngles(this.degToRad(90), 0, 0)
					}
				}
			}
		});
		await authLabel.created();

		const handLabel = MRE.Actor.Create(this.context, {
			actor: {
				parentId: this.menuGrabber.getGUID(),
				name: 'hasHandsLabel',
				text: {
					contents: "Has Hands:",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 1.5, y: 0.101, z: 0.5 },
						rotation: MRE.Quaternion.FromEulerAngles(this.degToRad(90), 0, 0)
					}
				}
			}
		});
		await handLabel.created();

		

		this.ourConsole.logMessage("Creating Wav Player");
		this.ourWavPlayer=new WavPlayer(this);
		await this.ourWavPlayer.loadAllSounds("piano");
/*
		this.ourConsole.logMessage("Creating Wav Player2");
		this.ourWavPlayer2=new WavPlayer(this);
		this.ourWavPlayer2.volume=0.25;
		this.ourWavPlayer2.cullTime=10000;
		await this.ourWavPlayer2.loadAllSounds("vibes");
*/
		this.ourConsole.logMessage("creating piano keys"); 
		this.ourPiano = new Piano(this);
		await this.ourPiano.createAllKeys(new MRE.Vector3(2, 1, 0),
			Quaternion.FromEulerAngles(-30* Math.PI / 180,0,0));

		this.ourPiano.ourWavPlayer=this.ourWavPlayer;
		this.ourPianoGui=new PianoGui(this,this.ourPiano);
		await this.ourPianoGui.createAsync(new MRE.Vector3(-3,0.1,0),"Main Piano")

		this.ourConsole.logMessage("Loading staff items");
		this.ourStaff = new Staff(this); 
		this.ourStaff.ourWavPlayer=this.ourWavPlayer;
		await this.ourStaff.createAsyncItems(new MRE.Vector3(2,2,0.5), 
			Quaternion.FromEulerAngles(-90* Math.PI / 180,0,0));
		this.ourStaff.ourWavPlayer=this.ourWavPlayer;

		this.ourPiano.ourStaff=this.ourStaff;


	/*	this.ourConsole.logMessage("creating piano keys"); 
		this.ourPiano2 = new Piano(this);
		await this.ourPiano2.createAllKeys(new MRE.Vector3(1.0, 1, 3));
		this.ourPiano2.ourWavPlayer=this.ourWavPlayer;


		this.ourConsole.logMessage("Loading staff items");
		this.ourStaff2 = new Staff(this); 
		this.ourStaff2.ourWavPlayer=this.ourWavPlayer;
		await this.ourStaff2.createAsyncItems(new MRE.Vector3(-4,1,0));
		this.ourStaff2.ourWavPlayer=this.ourWavPlayer;

		this.ourPiano2.ourStaff=this.ourStaff2;*/
/*
		this.ourConsole.logMessage("Loading spawner items");
		this.ourSpawner = new Spawner(this); 
		this.ourSpawner.ourWavPlayer=this.ourWavPlayer;
		await this.ourSpawner.createAsyncItems(new MRE.Vector3(0,1.3,0));

		this.ourConsole.logMessage("Loading spawner2 items");
		this.ourSpawner2 = new Spawner(this); 
		this.ourSpawner2.ourWavPlayer=this.ourWavPlayer2;
		await this.ourSpawner2.createAsyncItems(new MRE.Vector3(-2,1.3,0));

*/
		
	}

	private started() {
		this.loadAsyncItems().then(() => {
			this.ourConsole.logMessage("all async items created/loaded!");
			this.ourReceiver.ourCallback = this.PianoReceiveCallback.bind(this);

			setInterval(() => { 
				let pianoPlayable=0;
				let vibesPlayable = 0;
				let pianoPlaying = 0;
				let vibesPlaying =0;

				if (this.ourSpawner) { //prevent errors, in case this isn't setup yet
					pianoPlayable = this.ourSpawner.availableBubbles.length;
				}

				if (this.ourSpawner2) {
					vibesPlayable = this.ourSpawner2.availableBubbles.length;
				}

				if (this.ourWavPlayer) {
					pianoPlaying = this.ourWavPlayer.playingWavs.length;
				}

				if (this.ourWavPlayer2) {
					vibesPlaying = this.ourWavPlayer2.playingWavs.length;
				}

				const timeNow=new Date(Date.now());			

				this.ourConsole.logMessage(
					`Time: ${this.pad(timeNow.getHours(), 2, '0')}:` +
					`${this.pad(timeNow.getMinutes(), 2, '0')}:` +
					`${this.pad(timeNow.getSeconds(), 2, '0')} - ` +
					`[piano playing: ${pianoPlaying} playable: ${pianoPlayable}] - ` +
					`[vibes playing: ${vibesPlaying} playable: ${vibesPlayable}]`);
			}, 2000);
		});
	}
}
