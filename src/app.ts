/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import MusicModule from './backend/music_module';
import Console from './backend/console';
import Users from './backend/users';
import Patcher from './backend/patcher';
import PatchPoint from './backend/patch_point';
import Palette from './backend/palette';

import Piano from './piano'
import MicroPiano from './micro_piano'
import Spawner from './spawner'
import Staff from './staff';
import Geo from './geo';
import Spiral from './spiral';

import Se02 from './se02';
//import Tablature from './tablature';

import MidiReceiver from './utility_modules/midi_receiver'
import WavPlayer from './utility_modules/wavplayer';
import Sequencer from './utility_modules/sequencer';
import HeartBeat from './utility_modules/heartbeat';
import MidiPlayer from './utility_modules/midi_player';

import GuiPanel from './gui/gui_panel';
import GrabButton from './gui/grabbutton';
import Button from './gui/button';

import MidiReceiverGui from './gui/midi_receiver_gui';
import HeartBeatGui from './gui/heartbeat_gui';
import GeoGui from './gui/geo_gui';
import SequencerGui from './gui/sequencer_gui';
import WavPlayerGui from './gui/wavplayer_gui';
import SpawnerGui from './gui/spawner_gui';
import PianoGui from './gui/piano_gui';
import StaffGui from './gui/staff_gui';
import MidiPlayerGui from './gui/midi_player_gui';

export default class App {
	public assets: MRE.AssetContainer;
	public ourPatcher: Patcher = null;
	public ourPalette: Palette = null;

	public showGUIs = true;
	public showGrabbers = true;
	
	public allGUIs: GuiPanel[] = [];
	public allModules: MusicModule[] = [];

	public ourPiano: Piano = null;
	public ourMicroPiano: MicroPiano = null;
	public ourSpiral: Spiral = null;
	public ourStaff: Staff = null;
	public ourGeo: Geo = null;

	//public ourIce: Ice=null;

	public ourConsole: Console = null;
	public menuGrabber: GrabButton = null;
	public showGUIsButton: Button = null;
	public showGrabbersButton: Button = null;
	public showPaletteButton: Button = null;

	public boxMesh: MRE.Mesh;
	public sphereMesh: MRE.Mesh;
	
	public redMat: MRE.Material;
	public greenMat: MRE.Material;
	public whiteMat: MRE.Material;
	public blackMat: MRE.Material;
	public grayMat: MRE.Material;
	public darkgrayMat: MRE.Material;
	public grayRedMat: MRE.Material;
	public lightgrayMat: MRE.Material;
	public transparentBlackMat: MRE.Material;
	public transparentWhiteMat: MRE.Material;

	public handMesh: MRE.Mesh = null;
	public handTexture: MRE.Texture = null;
	public handMaterial: MRE.Material = null;

	public ourUsers: Users;


	constructor(public context: MRE.Context, public baseUrl: string,
		public baseDir: string, public instrumentType: string) {
			
		this.ourConsole = new Console(this);
		this.ourPatcher = new Patcher(this);
		this.ourUsers = new Users(this);

		this.assets = new MRE.AssetContainer(context);

		this.context.onUserLeft(user => this.ourUsers.userLeft(user));

		const isGeo = (instrumentType === "geo");
		const createHands = !isGeo;
		const createChest = isGeo;

		this.context.onUserJoined(user => {
			this.ourUsers.userJoined(user,createHands,createChest);
		});

		this.context.onStarted(() => this.started());
		this.context.onStopped(() => this.stopped());
	}

	private createMeshAndMaterial(){
		this.boxMesh = this.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		this.sphereMesh= this.assets.createSphereMesh('sphereMesh',0.5,10,10);

		this.redMat = this.assets.createMaterial('redmat', {
			color: new MRE.Color4(1, 0, 0)
		});

		this.greenMat = this.assets.createMaterial('greenMat', {
			color: new MRE.Color4(0, 1, 0)
		});
		this.blackMat = this.assets.createMaterial('blackMat', {
			color: new MRE.Color4(0, 0, 0)
		});
		this.whiteMat = this.assets.createMaterial('whiteMat', {
			color: new MRE.Color4(1, 1, 1)
		});
		this.transparentBlackMat = this.assets.createMaterial('transblackMat', {
			color: new MRE.Color4(0, 0, 0,0.5),
			alphaMode: MRE.AlphaMode.Blend
		});
		this.transparentWhiteMat = this.assets.createMaterial('transwhiteMat', {
			color: new MRE.Color4(1, 1, 1,0.5),
			alphaMode: MRE.AlphaMode.Blend
		});
		this.grayMat = this.assets.createMaterial('grayMat', {
			color: new MRE.Color4(0.5, 0.5, 0.5)
		});
		this.grayRedMat = this.assets.createMaterial('grayMat', {
			color: new MRE.Color4(0.5, 0.25, 0.25)
		});
		this.lightgrayMat = this.assets.createMaterial('lightgrayMat', {
			color: new MRE.Color4(0.75, 0.75, 0.75)
		});
		this.darkgrayMat = this.assets.createMaterial('lightgrayMat', {
			color: new MRE.Color4(0.25, 0.25, 0.25)
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
		if (b) {
			this.ourConsole.logMessage("trying to show all GUIs");
		} else {
			this.ourConsole.logMessage("trying to hide all GUIs");
		}
		for (const singlePanel of this.allGUIs) {
			if (b) {
				singlePanel.show();

			} else {
				singlePanel.hide();
			}
		}

		if (b) {
			this.ourPatcher.showPatchLines();
		} else {
			this.ourPatcher.hidePatchLines();
		}
	}

	public showAllGrabbers(b: boolean) {
		if (b) {
			this.ourConsole.logMessage("trying to show all grabbers");
			this.menuGrabber.showOnlyGrabber();
		} else {
			this.ourConsole.logMessage("trying to hide all grabbers");
			this.menuGrabber.hideOnlyGrabber();
		}

		for (const singlePanel of this.allGUIs) {
			if (b) {
				singlePanel.showGrabber();

			} else {
				singlePanel.hideGrabber();
			}
		}

		for (const singleModule of this.allModules) {
			if (b) {
				singleModule.showGrabber();

			} else {
				singleModule.hideGrabber();
			}
		}
	}

	public showPalette(b: boolean){
		if(b){
			this.ourPalette.show();

		} else{
			this.ourPalette.hide();
		}
	}

	private async loadAsyncItems() {
		this.ourConsole.logMessage("creating console");
		await this.ourConsole.createAsyncItems(new MRE.Vector3(-2.5, 0, 0.0),this.menuGrabber.getGUID());

		let buttonZPos=0.5;

		this.ourConsole.logMessage("Creating Reset Button ");
		const button = new Button(this);
		await button.createAsync(new MRE.Vector3(-0.7, 0, buttonZPos), this.menuGrabber.getGUID(), "Reset", "Reset",
			false, this.doReset.bind(this));
		buttonZPos -= 0.4;
		button.setElevatedUserOnlyVisibility();

		this.ourConsole.logMessage("Creating ShowGUI Button ");
		this.showGUIsButton = new Button(this);
		await this.showGUIsButton.createAsync(new MRE.Vector3(-0.7, 0, buttonZPos),
			this.menuGrabber.getGUID(), "GUIs ON", "GUIs OFF",
			this.showGUIs, this.showAllGuis.bind(this));
		buttonZPos -= 0.2;
		this.showGUIsButton.setElevatedUserOnlyVisibility();

		this.ourConsole.logMessage("Creating Show Grabbers Button ");
		this.showGrabbersButton = new Button(this);
		await this.showGrabbersButton.createAsync(new MRE.Vector3(-0.7, 0, buttonZPos),
			this.menuGrabber.getGUID(), "Grabbers ON", "Grabbers OFF",
			this.showGrabbers, this.showAllGrabbers.bind(this));
		buttonZPos -= 0.2;
		this.showGrabbersButton.setElevatedUserOnlyVisibility();

		this.ourConsole.logMessage("Creating Show  Pallete Button ");
		this.ourPalette = new Palette(this);
		await this.ourPalette.createBackground(new MRE.Vector3(5, 1.5, 0),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 30 * Math.PI / 180, 0),
			"Palette",
			1.5);
		this.ourPalette.hide();

		this.showPaletteButton = new Button(this);
		await this.showPaletteButton.createAsync(new MRE.Vector3(-0.7, 0, buttonZPos),
			this.menuGrabber.getGUID(), "Palette ON", "Palette OFF",
			false, this.showPalette.bind(this));
		buttonZPos -= 0.2;
		this.showPaletteButton.setElevatedUserOnlyVisibility();

		if(this.instrumentType==="piano"){
			await this.showPianoStaff();
			//await this.showSpiralStaff();
		}

		if(this.instrumentType==="spiral"){
			await this.showSpiralStaff();
		}

		if(this.instrumentType==="geo"){
			await this.showGeoPiano();
		}

		//if(this.instrumentType==="ice"){
		//	await this.showIce();
		//}
		if(this.instrumentType==="spawner"){
			await this.showSpawner();
		}

		//await this.showSequencerPiano();
		
		this.ourConsole.logMessage("Waiting for all patch lines to be created");

		for(const singlePatch of this.ourPatcher.ourPatches){
			if(singlePatch.line){
				await singlePatch.line.created();
			}
		}

		this.showGUIsButton.setValue(false);
		this.showGrabbersButton.setValue(false);

		this.ourConsole.logMessage("Finished creation of all asyn items");
	}

	/*private makeAuthoritative() {
		this.session.setAuthoritativeClient(ourUser.clientId); //can't be user.id! needs to be client.id!
	}*/

	/*private async showIce(){
		this.ourIce=new Ice(this);
		await this.ourIce.createAsync(new MRE.Vector3(0,1,0));
		this.allModules.push(this.ourIce);

		this.ourUsers.showHands();
	}*/

	private async showGeoPiano(){
		let xPos = 1.5;

		const ourWavPlayer = new WavPlayer(this);
		ourWavPlayer.audioRange=10;
		ourWavPlayer.cullTime=0; //don't cull sounds based on time playing
		ourWavPlayer.doPedal=false;
		//await ourWavPlayer.loadAllSounds("GoogleDrive/GeoSound",21,108);
		await ourWavPlayer.loadAllSoundsDirectory("GoogleDrive/GeoSound",21);
		this.allModules.push(ourWavPlayer);

		const ourWavPlayerGui = new WavPlayerGui(this, ourWavPlayer);
		await ourWavPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "WavPlayer")		
		this.allGUIs.push(ourWavPlayerGui);
		xPos -= 1.75;

		this.ourGeo = new Geo(this);

		//TODO, figure out better way to communicate how many samples available to geo 
		await this.ourGeo.createAllGeos(new MRE.Vector3(0, 0, 0),
			MRE.Quaternion.Identity(),
			ourWavPlayer.lowestNote,
			ourWavPlayer.highestNote);

		this.allModules.push(this.ourGeo);

		const ourGeoGui = new GeoGui(this, this.ourGeo);
		await ourGeoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Geo")
		this.allGUIs.push(ourGeoGui);

		const sendPathGeo = new PatchPoint();
		sendPathGeo.module = this.ourGeo;
		sendPathGeo.messageType = "midi";
		sendPathGeo.isSender = true;
		sendPathGeo.gui = ourGeoGui;
		sendPathGeo.button = ourGeoGui.sendButton;

		const receiveWavPlayer = new PatchPoint();
		receiveWavPlayer.module = ourWavPlayer;
		receiveWavPlayer.messageType = "midi";
		receiveWavPlayer.isSender = false;
		receiveWavPlayer.gui = ourWavPlayerGui;
		receiveWavPlayer.button = ourWavPlayerGui.receiveButton;

		this.ourPatcher.applyPatch(sendPathGeo, receiveWavPlayer);
	}

	private async showSE02(){
		this.ourPiano = new Piano(this);
		await this.ourPiano.createAllKeys(new MRE.Vector3(2, 1, 0),
			MRE.Quaternion.FromEulerAngles(-30 * Math.PI / 180, 0, 0));	
		this.allModules.push(this.ourPiano);

		const ourMidiReceiver = new MidiReceiver(this,3902);
		this.allModules.push(ourMidiReceiver);

		const ourSequencer = new Sequencer(this);
		await ourSequencer.createAsyncItems(12,new MRE.Vector3(-1.5, 2.0, 0.0),
			MRE.Quaternion.FromEulerAngles(-45 * Math.PI / 180, 0, 0));
		this.allModules.push(ourSequencer);		

		const ourHeartBeat= new HeartBeat(this);
		this.allModules.push(ourHeartBeat);

		const ourSE = new Se02(this);
		await ourSE.createAsyncItems(new MRE.Vector3(2, 1.75, 0.5),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 0, 0));

		let xPos=1.5;

		const ourPianoGui = new PianoGui(this, this.ourPiano);
		await ourPianoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano")
		this.allGUIs.push(ourPianoGui);
		ourPianoGui.removeSharpsButton(); //TODO: should have global sharp/flat button
		xPos -= 1.75;	

		const ourSequencerGui = new SequencerGui(this, ourSequencer);
		await ourSequencerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano Sequencer")
		this.allGUIs.push(ourSequencerGui);
		xPos -= 1.75;	


		const ourHeartBeatGui = new HeartBeatGui(this, ourHeartBeat);
		await ourHeartBeatGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Heart Beat")
		this.allGUIs.push(ourHeartBeatGui);
		xPos -= 1.75;	

	}

	private async showPianoStaff(){
		let xPos = 1.5;

		const ourWavPlayer = new WavPlayer(this);
		await ourWavPlayer.loadAllSounds("piano",36,84);
		this.allModules.push(ourWavPlayer);

		const ourWavPlayerGui = new WavPlayerGui(this, ourWavPlayer);
		await ourWavPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano WavPlayer")		
		this.allGUIs.push(ourWavPlayerGui);
		xPos -= 1.75;

		/*this.ourMicroPiano = new MicroPiano(this);
		await this.ourMicroPiano.createAllKeys(new MRE.Vector3(2, 1, 0),
			MRE.Quaternion.FromEulerAngles(-30 * Math.PI / 180, 0, 0));	
		this.allModules.push(this.ourMicroPiano);
		*/
		
		this.ourPiano = new Piano(this);
		await this.ourPiano.createAllKeys(new MRE.Vector3(2, 1, 0),
			MRE.Quaternion.FromEulerAngles(-30 * Math.PI / 180, 0, 0));	
		this.allModules.push(this.ourPiano);

		this.ourStaff = new Staff(this);
		await this.ourStaff.createAsyncItems(new MRE.Vector3(2, 2, 0.5),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 0, 0));		
		this.allModules.push(this.ourStaff);
		
		const ourMidiReceiver = new MidiReceiver(this,3902);
		this.allModules.push(ourMidiReceiver);

		const ourStaffGui = new StaffGui(this, this.ourStaff);
		await ourStaffGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Staff")
		this.allGUIs.push(ourStaffGui);
		xPos -= 1.75;

		const ourPianoGui = new PianoGui(this, this.ourPiano);
		await ourPianoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano")
		this.allGUIs.push(ourPianoGui);
		ourPianoGui.removeSharpsButton(); //TODO: should have global sharp/flat button

		const ourMidiReceiverGui = new MidiReceiverGui(this, ourMidiReceiver);
		await ourMidiReceiverGui.createAsync(new MRE.Vector3(xPos, 0.1, -2), "Midi Recv")
		this.allGUIs.push(ourMidiReceiverGui);
		
		const sendPatchPiano = new PatchPoint();
		//sendPatchPiano.module = this.ourMicroPiano;
		sendPatchPiano.module = this.ourPiano;
		sendPatchPiano.messageType = "midi";
		sendPatchPiano.isSender = true;
		sendPatchPiano.gui = ourPianoGui;
		sendPatchPiano.button = ourPianoGui.sendButton;

		const receivePatchPiano = new PatchPoint();
		receivePatchPiano.module = this.ourPiano;
		receivePatchPiano.messageType = "midi";
		receivePatchPiano.isSender = false;
		receivePatchPiano.gui = ourPianoGui;
		receivePatchPiano.button = ourPianoGui.receiveButton;

		const sendMidi = new PatchPoint();
		sendMidi.module = ourMidiReceiver;
		sendMidi.messageType = "midi";
		sendMidi.isSender = true;
		sendMidi.gui = ourMidiReceiverGui;
		sendMidi.button = ourMidiReceiverGui.sendButton;
		
		const receivePatchStaff = new PatchPoint();
		receivePatchStaff.module = this.ourStaff;
		receivePatchStaff.messageType = "midi";
		receivePatchStaff.isSender = false;
		receivePatchStaff.gui = ourStaffGui;
		receivePatchStaff.button = ourStaffGui.receiveButton;

		const receiveWavPlayer = new PatchPoint();
		receiveWavPlayer.module = ourWavPlayer;
		receiveWavPlayer.messageType = "midi";
		receiveWavPlayer.isSender = false;
		receiveWavPlayer.gui = ourWavPlayerGui;
		receiveWavPlayer.button = ourWavPlayerGui.receiveButton;

		const sendPatchStaff = new PatchPoint();
		sendPatchStaff.module = this.ourStaff;
		sendPatchStaff.messageType = "midi";
		sendPatchStaff.isSender = true;
		sendPatchStaff.gui = ourStaffGui;
		sendPatchStaff.button = ourStaffGui.sendButton;

		this.ourConsole.logMessage("patching midi -> piano");
		this.ourPatcher.applyPatch(sendMidi, receivePatchPiano);

		this.ourConsole.logMessage("patching piano -> staff");
		this.ourPatcher.applyPatch(sendPatchPiano, receivePatchStaff);

		this.ourConsole.logMessage("patching piano -> wave player");
		this.ourPatcher.applyPatch(sendPatchPiano, receiveWavPlayer);

		this.ourConsole.logMessage("patching staff -> wave player");
		this.ourPatcher.applyPatch(sendPatchStaff, receiveWavPlayer);
	}

	private async showSpawner(){
		let xPos = 1.5;

		/*const ourWavPlayer = new WavPlayer(this);
		await ourWavPlayer.loadAllSounds("piano",36,84);
		this.allModules.push(ourWavPlayer);

		const ourWavPlayerGui = new WavPlayerGui(this, ourWavPlayer);
		await ourWavPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano WavPlayer")		
		this.allGUIs.push(ourWavPlayerGui);
		xPos -= 1.75;
		*/

		let zPos = 0;

		const ourMidiPlayer = new MidiPlayer(this);			

		const ourMidiPlayerGui = new MidiPlayerGui(this, ourMidiPlayer);
		await ourMidiPlayerGui.createAsync(new MRE.Vector3(-1, 0.1, zPos), "Midi Player");
		this.allGUIs.push(ourMidiPlayerGui);

		const midiPlayerSendPath = new PatchPoint();
		midiPlayerSendPath.module = ourMidiPlayer;
		midiPlayerSendPath.messageType = "midi";
		midiPlayerSendPath.isSender = true;
		midiPlayerSendPath.gui = ourMidiPlayerGui;
		midiPlayerSendPath.button = ourMidiPlayerGui.sendButton;

		const ourWavPlayer = new WavPlayer(this);
		await ourWavPlayer.loadAllSounds("piano",36,84);
		this.allModules.push(ourWavPlayer);

		const ourWavPlayerGui = new WavPlayerGui(this, ourWavPlayer);
		await ourWavPlayerGui.createAsync(new MRE.Vector3(1, 0.1, zPos), "Piano WavPlayer")		
		this.allGUIs.push(ourWavPlayerGui);

		const receiveWavePlayerPatch = new PatchPoint();
		receiveWavePlayerPatch.module = ourWavPlayer;
		receiveWavePlayerPatch.messageType = "midi";
		receiveWavePlayerPatch.isSender = false;
		receiveWavePlayerPatch.gui = ourWavPlayerGui;
		receiveWavePlayerPatch.button = ourWavPlayerGui.receiveButton;

		zPos -= 2;


		for (let i = 0; i < 3; i++) {
			const ourSpawner = new Spawner(this);
			await ourSpawner.createAsyncItems(new MRE.Vector3(2 + i*1.5, 1, 0),
				MRE.Quaternion.FromEulerAngles(0.0 * Math.PI / 180, 0, 0));
			this.allModules.push(ourSpawner);

			const ourMidiReceiver = new MidiReceiver(this, 3931 + i);
			this.allModules.push(ourMidiReceiver);

			const ourSpawnerGui = new SpawnerGui(this, ourSpawner);
			await ourSpawnerGui.createAsync(new MRE.Vector3(1, 0.1, zPos), "Spawner " + (i+1));
			this.allGUIs.push(ourSpawnerGui);

			const ourMidiReceiverGui = new MidiReceiverGui(this, ourMidiReceiver);
			await ourMidiReceiverGui.createAsync(new MRE.Vector3(-1, 0.1, zPos), "Midi Recv" + (i+1));
			this.allGUIs.push(ourMidiReceiverGui);

			zPos -= 2;

			const sendSpawnerPatch = new PatchPoint();
			sendSpawnerPatch.module = ourSpawner;
			sendSpawnerPatch.messageType = "midi";
			sendSpawnerPatch.isSender = true;
			sendSpawnerPatch.gui = ourSpawnerGui;
			sendSpawnerPatch.button = ourSpawnerGui.sendButton; 
	
			const receiveSpawnerPatch = new PatchPoint();
			receiveSpawnerPatch.module = ourSpawner;
			receiveSpawnerPatch.messageType = "midi";
			receiveSpawnerPatch.isSender = false;
			receiveSpawnerPatch.gui = ourSpawnerGui;
			receiveSpawnerPatch.button = ourSpawnerGui.receiveButton;
	
			const sendMidi = new PatchPoint();
			sendMidi.module = ourMidiReceiver;
			sendMidi.messageType = "midi";
			sendMidi.isSender = true;
			sendMidi.gui = ourMidiReceiverGui;
			sendMidi.button = ourMidiReceiverGui.sendButton;

			if(i===0){
				this.ourPatcher.applyPatch(midiPlayerSendPath,receiveSpawnerPatch);
			}
		
			this.ourPatcher.applyPatch(sendMidi, receiveSpawnerPatch);
			this.ourPatcher.applyPatch(sendSpawnerPatch, receiveWavePlayerPatch);

		}	
	}

	private async showSpiralStaff(){
		let xPos = 1.5;

		const ourWavPlayer = new WavPlayer(this);
		await ourWavPlayer.loadAllSounds("piano",36,84);
		this.allModules.push(ourWavPlayer);

		const ourWavPlayerGui = new WavPlayerGui(this, ourWavPlayer);
		await ourWavPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano WavPlayer")		
		this.allGUIs.push(ourWavPlayerGui);
		xPos -= 1.75;

		this.ourSpiral = new Spiral(this);
		await this.ourSpiral.createAllKeys(new MRE.Vector3(2, 0, -1));	
		this.allModules.push(this.ourSpiral);

		this.ourStaff = new Staff(this);
		await this.ourStaff.createAsyncItems(new MRE.Vector3(2, 2, 0.5),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 0, 0));		
		this.allModules.push(this.ourStaff);	

		const ourStaffGui = new StaffGui(this, this.ourStaff);
		await ourStaffGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Staff")
		this.allGUIs.push(ourStaffGui);
		xPos -= 1.75;

		/*const ourPianoGui = new PianoGui(this, this.ourPiano);
		await ourPianoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano")
		this.allGUIs.push(ourPianoGui);
		ourPianoGui.removeSharpsButton(); //TODO: should have global sharp/flat button
*/

		const sendPatchPiano = new PatchPoint();
		sendPatchPiano.module = this.ourSpiral;
		sendPatchPiano.messageType = "midi";
		sendPatchPiano.isSender = true;
		//sendPatchPiano.gui = ourPianoGui;
		//sendPatchPiano.button = ourPianoGui.sendButton;

		const receivePatchStaff = new PatchPoint();
		receivePatchStaff.module = this.ourStaff;
		receivePatchStaff.messageType = "midi";
		receivePatchStaff.isSender = false;
		receivePatchStaff.gui = ourStaffGui;
		receivePatchStaff.button = ourStaffGui.receiveButton;

		this.ourPatcher.applyPatch(sendPatchPiano, receivePatchStaff);

		const receiveWavPlayer = new PatchPoint();
		receiveWavPlayer.module = ourWavPlayer;
		receiveWavPlayer.messageType = "midi";
		receiveWavPlayer.isSender = false;
		receiveWavPlayer.gui = ourWavPlayerGui;
		receiveWavPlayer.button = ourWavPlayerGui.receiveButton;

		this.ourPatcher.applyPatch(sendPatchPiano, receiveWavPlayer);

		const sendPatchStaff = new PatchPoint();
		sendPatchStaff.module = this.ourStaff;
		sendPatchStaff.messageType = "midi";
		sendPatchStaff.isSender = true;
		sendPatchStaff.gui = ourStaffGui;
		sendPatchStaff.button = ourStaffGui.sendButton;

		this.ourPatcher.applyPatch(sendPatchStaff, receiveWavPlayer);
	}


	private async showSequencerPiano(){
		let xPos = 1.5;

		const ourWavPlayer = new WavPlayer(this);
		await ourWavPlayer.loadAllSounds("piano",36,84);
		this.allModules.push(ourWavPlayer);

		const ourWavPlayerGui = new WavPlayerGui(this, ourWavPlayer);
		await ourWavPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano WavPlayer")		
		this.allGUIs.push(ourWavPlayerGui);
		xPos -= 1.75;

		this.ourPiano = new Piano(this);
		await this.ourPiano.createAllKeys(new MRE.Vector3(2, 1, 0),
			MRE.Quaternion.FromEulerAngles(-30 * Math.PI / 180, 0, 0));	
		this.allModules.push(this.ourPiano);

		const ourPianoGui = new PianoGui(this, this.ourPiano);
		await ourPianoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano")
		this.allGUIs.push(ourPianoGui);
		xPos -= 1.75;		

		const ourSequencer = new Sequencer(this);
		await ourSequencer.createAsyncItems(12,new MRE.Vector3(-1.5, 2.0, 0.0),
			MRE.Quaternion.FromEulerAngles(-45 * Math.PI / 180, 0, 0));
		this.allModules.push(ourSequencer);

		const ourSequencerGui = new SequencerGui(this, ourSequencer);
		await ourSequencerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano Sequencer")
		this.allGUIs.push(ourSequencerGui);
		xPos =1.5;			

		const ourHeartBeat= new HeartBeat(this);
		this.allModules.push(ourHeartBeat);

		const ourHeartBeatGui = new HeartBeatGui(this, ourHeartBeat);
		await ourHeartBeatGui.createAsync(new MRE.Vector3(xPos, 0.1, -1.75), "Heart Beat")
		this.allGUIs.push(ourHeartBeatGui);
		xPos -= 1.75;

		const ourWavPlayer2 = new WavPlayer(this);
		await ourWavPlayer2.loadAllSounds("drums/grd-music",48,54);
		this.allModules.push(ourWavPlayer2);

		const ourWavPlayerGui2 = new WavPlayerGui(this, ourWavPlayer2);
		await ourWavPlayerGui2.createAsync(new MRE.Vector3(xPos, 0.1, -1.75), "Drums WavPlayer")		
		this.allGUIs.push(ourWavPlayerGui2);
		xPos -= 1.75;

		const ourSequencer2 = new Sequencer(this);
		await ourSequencer2.createAsyncItems(7, new MRE.Vector3(1.5, 2.0, 0.0),
			MRE.Quaternion.FromEulerAngles(-45 * Math.PI / 180, 0, 0));
		this.allModules.push(ourSequencer2);

		const ourSequencerGui2 = new SequencerGui(this, ourSequencer2);
		await ourSequencerGui2.createAsync(new MRE.Vector3(xPos, 0.1, -1.75), "Drum Sequencer")
		this.allGUIs.push(ourSequencerGui2);
		xPos -= 1.75;

		/////// MIDI

		const sendPatchPiano = new PatchPoint();
		sendPatchPiano.module = this.ourPiano;
		sendPatchPiano.messageType = "midi";
		sendPatchPiano.isSender = true;
		sendPatchPiano.gui = ourPianoGui;
		sendPatchPiano.button = ourPianoGui.sendButton;
		
		const receiveWavPlayer = new PatchPoint();
		receiveWavPlayer.module = ourWavPlayer;
		receiveWavPlayer.messageType = "midi";
		receiveWavPlayer.isSender = false;
		receiveWavPlayer.gui = ourWavPlayerGui;
		receiveWavPlayer.button = ourWavPlayerGui.receiveButton;

		this.ourPatcher.applyPatch(sendPatchPiano, receiveWavPlayer);		

		const sendPatchSequencer = new PatchPoint();
		sendPatchSequencer.module = ourSequencer;
		sendPatchSequencer.messageType = "midi";
		sendPatchSequencer.isSender = true;
		sendPatchSequencer.gui = ourSequencerGui;
		sendPatchSequencer.button = ourSequencerGui.sendButton;

		const receivePatchPiano = new PatchPoint();
		receivePatchPiano.module = this.ourPiano;
		receivePatchPiano.messageType = "midi";
		receivePatchPiano.isSender = false;
		receivePatchPiano.gui = ourPianoGui;
		receivePatchPiano.button = ourPianoGui.receiveButton;

		this.ourPatcher.applyPatch(sendPatchSequencer,receivePatchPiano);	

		const sendPatchSequencer2 = new PatchPoint();
		sendPatchSequencer2.module = ourSequencer2;
		sendPatchSequencer2.messageType = "midi";
		sendPatchSequencer2.isSender = true;
		sendPatchSequencer2.gui = ourSequencerGui2;
		sendPatchSequencer2.button = ourSequencerGui2.sendButton;
		
		const receiveWavPlayer2 = new PatchPoint();
		receiveWavPlayer2.module = ourWavPlayer2;
		receiveWavPlayer2.messageType = "midi";
		receiveWavPlayer2.isSender = false;
		receiveWavPlayer2.gui = ourWavPlayerGui2;
		receiveWavPlayer2.button = ourWavPlayerGui2.receiveButton;

		this.ourPatcher.applyPatch(sendPatchSequencer2, receiveWavPlayer2);	

		///// HEART BEATS
		
		const sendHeartBeat = new PatchPoint();
		sendHeartBeat.module = ourHeartBeat;
		sendHeartBeat.messageType = "heartbeat";
		sendHeartBeat.isSender = true;
		sendHeartBeat.gui = ourHeartBeatGui;
		sendHeartBeat.button = ourHeartBeatGui.sendButton;

		const receiveSequencerHeartBeat = new PatchPoint();
		receiveSequencerHeartBeat.module = ourSequencer;
		receiveSequencerHeartBeat.messageType = "heartbeat";
		receiveSequencerHeartBeat.isSender = false;
		receiveSequencerHeartBeat.gui = ourSequencerGui;
		receiveSequencerHeartBeat.button = ourSequencerGui.receiveButton;


		const receiveSequencerHeartBeat2 = new PatchPoint();
		receiveSequencerHeartBeat2.module = ourSequencer2;
		receiveSequencerHeartBeat2.messageType = "heartbeat";
		receiveSequencerHeartBeat2.isSender = false;
		receiveSequencerHeartBeat2.gui = ourSequencerGui2;
		receiveSequencerHeartBeat2.button = ourSequencerGui2.receiveButton;

		this.ourPatcher.applyPatch(sendHeartBeat,receiveSequencerHeartBeat);
		this.ourPatcher.applyPatch(sendHeartBeat,receiveSequencerHeartBeat2);
	}

	private stopped() {
		MRE.log.info("app", "stopped callback has been called");
	}

	private started() {
		this.ourConsole.logMessage("started callback has begun");

		this.createMeshAndMaterial();

		this.menuGrabber = new GrabButton(this);
		this.menuGrabber.create(new MRE.Vector3(3, 0.1, 0));

		this.loadAsyncItems().then(() => {
			this.ourConsole.logMessage("all async items created/loaded!");
		});
	}
}
