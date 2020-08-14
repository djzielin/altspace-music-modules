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
import MusicModule from './music_module';
import Sequencer from './sequencer';
import SequencerGui from './sequencer_gui';

interface PatchPointProperties{
	module: MusicModule;
	messageType: string;
	isSender: boolean;
	gui: GuiPanel;
	button: Button;
}

interface PatchProperties{
	sender: PatchPointProperties;
	receiver: PatchPointProperties;
	line: MRE.Actor;
}

export default class App {
	public assets: MRE.AssetContainer;

	public ourPiano: Piano = null;
	public ourPianoGui: PianoGui = null;

	public ourStaff: Staff = null;
	public ourStaffGui: StaffGui = null;

	public ourTablature: Tablature=null;


	public ourWavPlayer: WavPlayer = null;
	public ourWavPlayerGui: WavPlayerGui = null;

	public ourSequencer: Sequencer = null;
	public ourSequencerGui: SequencerGui = null;

	public showGUIs=false;

	public allGUIs: GuiPanel[] = [];

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

	private ourPatches: PatchProperties[]=[]; //TODO patcher could be its own class
	private potentialPatchStack: PatchPointProperties[] = [];

	public isPatchPointEqual(patchP1: PatchPointProperties, patchP2: PatchPointProperties){
		if(patchP1.gui!==patchP2.gui){
			return false;
		}

		if(patchP1.isSender!==patchP2.isSender){
			return false;
		}

		if(patchP1.messageType!==patchP2.messageType){
			return false;
		}
		if(patchP1.module!==patchP2.module){
			return false;
		}
		if(patchP1.button!==patchP2.button){
			return false;
		}

		return true;
	}

	public isPatchEqual(patch1: PatchProperties, patch2: PatchProperties){
		if(!this.isPatchPointEqual(patch1.sender,patch2.sender)){
			return false;
		}

		if(!this.isPatchPointEqual(patch1.receiver,patch2.receiver)){
			return false;
		}

		return true;
	}

	public getPatchPointWorldPosition(patchPoint: PatchPointProperties, isSender: boolean): MRE.Vector3{
		const offset=new MRE.Vector3(0.75/2,0.1/2,0);
		if(!isSender){
			offset.x=-0.75/2
		}

		return patchPoint.gui.transformPoint(patchPoint.button.getHolderPos().add(offset));
	}

	public updatePatchLines(gui: GuiPanel){
		this.ourConsole.logMessage("Grab Release happening. Updating Patcher Lines!");

		for (const existingPatch of this.ourPatches) {
			if(existingPatch.sender.gui===gui || existingPatch.receiver.gui===gui){
				const pos1=this.getPatchPointWorldPosition(existingPatch.sender,true);
				const pos2=this.getPatchPointWorldPosition(existingPatch.receiver,false);
				existingPatch.sender.gui.updatePatchLine(existingPatch.line,pos1,pos2);		
			}
		}
	}

	public showPatchLines(){
		for (const existingPatch of this.ourPatches) {
			if(existingPatch.line){
				existingPatch.line.appearance.enabled=true;
			}
		}
	}

	public hidePatchLines(){
		for (const existingPatch of this.ourPatches) {
			if(existingPatch.line){
				existingPatch.line.appearance.enabled=false;
			}
		}
	}

	public applyPatch(sender: PatchPointProperties, receiver: PatchPointProperties) {
		const newPatch = {
			sender: sender,
			receiver: receiver,
			line: null as MRE.Actor
		}

		for (const existingPatch of this.ourPatches) {
			if (this.isPatchEqual(existingPatch,newPatch)) { //already exists! so DELETE
				this.ourConsole.logMessage("  patch already exists. deleting!");
				sender.module.removeSendDestination(receiver.module);
				if(existingPatch.line){
					existingPatch.line.destroy();
				}
				const index = this.ourPatches.indexOf(existingPatch);
				this.ourPatches.splice(index, 1);

				return;
			}
		}

		this.ourConsole.logMessage("  patch doesn't yet exist. adding!");
		sender.module.sendDestinations.push(receiver.module);

		if (newPatch.sender.gui && newPatch.receiver.gui) {
			const pos1 = this.getPatchPointWorldPosition(newPatch.sender, true);
			const pos2 = this.getPatchPointWorldPosition(newPatch.receiver, false);
			newPatch.line = sender.gui.createPatchLine(pos1, pos2);
		}

		this.ourPatches.push(newPatch);
	}

	public patcherClickEvent(module: MusicModule, messageType: string, isSender: boolean, 
			gui: GuiPanel, button: Button) {
		const patchType: string = isSender ? "sender" : "receiver";
		this.ourConsole.logMessage("received patch point: " + messageType + " " + patchType );
		
		const potentialPatchPoint = {
			module: module,
			messageType: messageType,
			isSender: isSender,
			gui: gui,
			button: button
		}

		this.potentialPatchStack.push(potentialPatchPoint);

		if(this.potentialPatchStack.length===2){ 
			this.ourConsole.logMessage("  have 2 pending patch points, checking if we have a match!");

			let sender: PatchPointProperties=null;
			let receiver: PatchPointProperties=null;

			for(const singlePatchPoint of this.potentialPatchStack){
				if(singlePatchPoint.isSender){
					sender=singlePatchPoint;
				}else{
					receiver=singlePatchPoint;
				}
			}

			if(sender && receiver){ //great, we got both a sender and a receiver
				if(sender.messageType===receiver.messageType){ //do message types match? ie both midi?
					if(sender.gui!==receiver.gui){
						this.ourConsole.logMessage("  we have a match!");
						this.applyPatch(sender,receiver);
					} else{
						this.ourConsole.logMessage("  not allowing user to route back to self");
					}
				} else{
					this.ourConsole.logMessage("  incompatible message type");
				}
			} else {
				this.ourConsole.logMessage("  no match. both are senders or receivers");
			}
		
			sender.button.setValue(true);
			receiver.button.setValue(true);

			this.potentialPatchStack.pop();
			this.potentialPatchStack.pop();
		}
	}

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
		this.menuGrabber.create(new MRE.Vector3(3, 0.1, 0));

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
			//if (this.ourStaff) {
			//	this.ourStaff.receiveNote(note, vel);
			//}
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

		if (b) {
			this.showPatchLines();
		} else {
			this.hidePatchLines();
		}
	}	

	private async loadAsyncItems() {
		this.ourConsole.logMessage("creating console");
		await this.ourConsole.createAsyncItems(new MRE.Vector3(-0.7, 0, 0.9),this.menuGrabber.getGUID());

		this.ourConsole.logMessage("Creating Reset Button ");
		const button = new Button(this);
		await button.createAsync(new MRE.Vector3(-0.7, 0, 0.5), this.menuGrabber.getGUID(), "Reset", "Reset",
			false, this.doReset.bind(this));

		this.ourConsole.logMessage("Creating ShowGUI Button ");
		const guiButton = new Button(this);
		await guiButton.createAsync(new MRE.Vector3(-0.7, 0, 0.1), this.menuGrabber.getGUID(), "GUIs ON", "GUIs OFF",
			this.showGUIs, this.showAllGuis.bind(this));

		let xPos = 1.5;

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
		await this.ourPiano.createAllKeys(new MRE.Vector3(2, 1, 0),
			MRE.Quaternion.FromEulerAngles(-30 * Math.PI / 180, 0, 0));	

		this.ourConsole.logMessage("Loading staff items");
		this.ourStaff = new Staff(this);
		await this.ourStaff.createAsyncItems(new MRE.Vector3(2, 2, 0.5),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 0, 0));			

		this.ourStaffGui = new StaffGui(this, this.ourStaff);
		await this.ourStaffGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Staff")
		this.allGUIs.push(this.ourStaffGui);
		xPos -= 1.75;

		this.ourPianoGui = new PianoGui(this, this.ourPiano);
		await this.ourPianoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano")
		this.allGUIs.push(this.ourPianoGui);
		this.ourPianoGui.removeSharpsButton();


		const sendPatchPiano = {
			module: this.ourPiano,
			messageType: "midi",
			isSender: true,
			gui: this.ourPianoGui,
			button: this.ourPianoGui.sendButton
		}

		const receivePatchStaff = {
			module: this.ourStaff,
			messageType: "midi",
			isSender: false,
			gui: this.ourStaffGui,
			button: this.ourStaffGui.receiveButton
		}
		this.applyPatch(sendPatchPiano,receivePatchStaff);

		const receiveWavPlayer = {
			module: this.ourWavPlayer,
			messageType: "midi",
			isSender: false,
			gui: this.ourWavPlayerGui,
			button: this.ourWavPlayerGui.receiveButton
		}
		this.applyPatch(sendPatchPiano,receiveWavPlayer);

		const sendPatchStaff = {
			module: this.ourStaff,
			messageType: "midi",
			isSender: true,
			gui: this.ourStaffGui,
			button: this.ourStaffGui.sendButton
		}
		this.applyPatch(sendPatchStaff,receiveWavPlayer);

		/*this.ourSequencer = new Sequencer(this);
		await this.ourSequencer.createAsyncItems(new MRE.Vector3(-2, 2.0, 0.0),
			MRE.Quaternion.FromEulerAngles(-45 * Math.PI / 180, 0, 0));

		this.ourSequencerGui = new SequencerGui(this, this.ourSequencer);
		await this.ourSequencerGui.createAsync(new MRE.Vector3(xPos, 0.1, -2), "Sequencer")
		this.allGUIs.push(this.ourSequencerGui);
		*/

	/*	const sendPatchSequencer = {
			module: this.ourSequencer,
			messageType: "midi",
			isSender: true,
			gui: this.ourSequencerGui,
			button: this.ourSequencerGui.sendButton
		}

		const receivePatchPiano = {
			module: this.ourPiano,
			messageType: "midi",
			isSender: false,
			gui: this.ourPianoGui,
			button: this.ourPianoGui.receiveButton
		}

		this.applyPatch(sendPatchSequencer,receivePatchPiano);*/

		this.ourConsole.logMessage("Waiting for all patch lines to be created");

		for(const singlePatch of this.ourPatches){
			await singlePatch.line.created();
		}

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

		this.showAllGuis(false);
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
