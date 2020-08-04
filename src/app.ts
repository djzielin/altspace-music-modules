/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import { PianoReceiver, RCallback } from './receiver'
import Piano from './piano'
//import Spawner from './spawner'
import OscSender from './sender';
import WavPlayer from './wavplayer';
import Console from './console';
import Button from './button';
import Staff from './staff';
import GrabButton from './grabbutton';
import PianoGui from './piano_gui';
import StaffGui from './staff_gui';
import WavPlayerGui from './wavplayer_gui';
import Users from './users';
import Tablature from './tablature';
import GuiPanel from './gui_panel';

export default class App {
	public assets: MRE.AssetContainer;

	public ourPiano: Piano = null;
	public ourPianoGui: PianoGui = null;

	public ourStaff: Staff = null;
	public ourStaffGui: StaffGui = null;

	public ourTablature: Tablature=null;


	public ourWavPlayer: WavPlayer = null;
	public ourWavPlayerGui: WavPlayerGui = null;

	public showGUIs=false;

	public allGUIs: any[] = [];


	//public ourPiano2: Piano = null;
	//public ourStaff2: Staff=null;

	public ourSpawner: any = null;
	public ourSpawner2: any = null;


	public ourWavPlayer2: WavPlayer = null;
	public ourConsole: Console = null;
	public menuGrabber: GrabButton = null;

	public boxMesh: MRE.Mesh;
	public redMat: MRE.Material;
	public greenMat: MRE.Material;
	public whiteMat: MRE.Material;
	public blackMat: MRE.Material;
	public grayMat: MRE.Material;

	public handMesh: MRE.Mesh = null;
	public handTexture: MRE.Texture = null;
	public handMaterial: MRE.Material = null;

	public ourUsers: Users;

	private receiverCallback: RCallback;

	constructor(public context: MRE.Context, public baseUrl: string, public baseDir: string,
		public ourReceiver: PianoReceiver, public ourSender: OscSender) {
		this.ourConsole = new Console(this);

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
		this.grayMat = this.assets.createMaterial('whiteMat', {
			color: new MRE.Color4(0.5, 0.5, 0.5)
		});

		const filename = `${this.baseUrl}/` + "hand_grey.png";
		this.handTexture = this.assets.createTexture("hand", {
			uri: filename
		});

		this.handMaterial = this.assets.createMaterial('handMat', {
			color: new MRE.Color4(1, 1, 1),
			mainTextureId: this.handTexture.id
		});

		this.handMesh = this.assets.createBoxMesh('boxMesh', 0.25, 0.1, 0.25);

		this.menuGrabber = new GrabButton(this);
		this.menuGrabber.create(new MRE.Vector3(2, 0.1, 0));

		this.ourUsers=new Users(this);

		this.context.onStarted(() => this.started());
		this.context.onStopped(() => this.stopped());
		this.context.onUserLeft(user => this.ourUsers.userLeft(user));
		this.context.onUserJoined(user => this.ourUsers.userJoined(user));
	}

	private PianoReceiveCallback(note: number, vel: number, channel: number): void {
		this.ourConsole.logMessage(`App received - note: ${note} vel: ${vel}`);

		if (vel > 0) {
			//if(this.ourWavPlayer){
			//	this.ourWavPlayer.playSound(note,127,new MRE.Vector3(0,0,0), 20.0);
			//}
			if (this.ourPiano) {
				this.ourPiano.keyPressed(note, vel);
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
			if(this.ourTablature){
				this.ourTablature.receiveNote(note,vel,channel);
			}
		} else {
			//this.ourPiano.stopSound(note);
			if (this.ourPiano) {
				this.ourPiano.keyReleased(note);
			}
		}
	}	

	public degToRad(degrees: number) {
		const pi = Math.PI;
		return degrees * (pi / 180);
	}
	private doReset() {
		process.exit(0);
	}

	public vector2String(v: MRE.Vector3, precision: number) {
		return "{X: " + v.x.toFixed(precision) +
			" Y: " + v.y.toFixed(precision) +
			" Z: " + v.z.toFixed(precision) + "}";
	}

	/*
		https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript	
	*/
	public pad(value: number, maxWidth: number, padChar: string) {
		const n = value.toString();
		return n.length >= maxWidth ? n : new Array(maxWidth - n.length + 1).join(padChar) + n;
	}

	public showAllGuis(b: boolean) {
		for (const singlePanel of this.allGUIs) {
			if (b) {
				singlePanel.show();
			} else {
				singlePanel.hide();
			}
		}
	}	

	private async loadAsyncItems() {
		this.ourConsole.logMessage("creating console");
		await this.ourConsole.createAsyncItems(this.menuGrabber.getGUID());

		this.ourConsole.logMessage("Creating Reset Button ");
		const button = new Button(this);
		await button.createAsync(new MRE.Vector3(-0.7, 0, 0.5), this.menuGrabber.getGUID(), "Reset", "Reset",
			false, this.doReset.bind(this));

		this.ourConsole.logMessage("Creating ShowGUI Button ");
		const guiButton = new Button(this);
		await guiButton.createAsync(new MRE.Vector3(-0.7, 0, 0.1), this.menuGrabber.getGUID(), "GUIs ON", "GUIs OFF",
			this.showGUIs, this.showAllGuis.bind(this));

		let xPos = 0.5;

		this.ourConsole.logMessage("Creating Wav Player");
		this.ourWavPlayer = new WavPlayer(this);
		await this.ourWavPlayer.loadAllSounds("piano");

		this.ourWavPlayerGui = new WavPlayerGui(this, this.ourWavPlayer);
		await this.ourWavPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano WavPlayer")		
		this.allGUIs.push(this.ourWavPlayerGui);
		xPos -= 1.75;

		/*this.ourConsole.logMessage("Creating Wav Player2");
		this.ourWavPlayer2=new WavPlayer(this);
		this.ourWavPlayer2.volume=0.25;
		this.ourWavPlayer2.cullTime=10000;
		await this.ourWavPlayer2.loadAllSounds("vibes");*/

		this.ourConsole.logMessage("creating piano keys");
		this.ourPiano = new Piano(this);
		this.ourPiano.ourWavPlayer = this.ourWavPlayer;
		await this.ourPiano.createAllKeys(new MRE.Vector3(2, 1, 0),
			MRE.Quaternion.FromEulerAngles(-30 * Math.PI / 180, 0, 0));

		this.ourPianoGui = new PianoGui(this, this.ourPiano);
		await this.ourPianoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Main Piano")
		this.allGUIs.push(this.ourPianoGui);
		xPos -= 1.75;

		this.ourConsole.logMessage("Loading staff items");
		this.ourStaff = new Staff(this);
		this.ourStaff.ourWavPlayer = this.ourWavPlayer;
		this.ourPiano.ourStaff=this.ourStaff;
		await this.ourStaff.createAsyncItems(new MRE.Vector3(2, 2, 0.5),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 0, 0));

		this.ourStaffGui = new StaffGui(this, this.ourStaff);
		await this.ourStaffGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Main Staff")
		this.allGUIs.push(this.ourStaffGui);

		this.showAllGuis(false);

		/*this.ourTablature=new Tablature(this);
		await this.ourTablature.createAsyncItems(new MRE.Vector3(2, 3, 0.5),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 0, 0));
		this.ourTablature.ourWavPlayer=this.ourWavPlayer;
		*/

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
	private stopped() {
		MRE.log.info("app", "stopped callback has been called");
		this.ourReceiver.removeReceiver(this.receiverCallback);
	}

	private started() {
		this.ourConsole.logMessage("started callback has begun");

		this.loadAsyncItems().then(() => {
			this.ourConsole.logMessage("all async items created/loaded!");
			this.receiverCallback = this.PianoReceiveCallback.bind(this)
			this.ourReceiver.addReceiver(this.receiverCallback);

			/*
			setInterval(() => {
				let pianoPlayable = 0;
				let vibesPlayable = 0;
				let pianoPlaying = 0;
				let vibesPlaying = 0;

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

				const timeNow = new Date(Date.now());

				this.ourConsole.logMessage(
					`Time: ${this.pad(timeNow.getHours(), 2, '0')}:` +
					`${this.pad(timeNow.getMinutes(), 2, '0')}:` +
					`${this.pad(timeNow.getSeconds(), 2, '0')} - ` +
					`[piano playing: ${pianoPlaying}] - ` +
					`[vibes playing: ${vibesPlaying}]`);
			}, 1000);
			*/
		});
	}
}
