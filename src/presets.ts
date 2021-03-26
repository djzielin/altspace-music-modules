/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

//import MusicModule from './backend/music_module';
//import Console from './backend/console';
//import Users from './backend/users';
//import Patcher from './backend/patcher';
import PatchPoint from './backend/patch_point';
//import Palette from './backend/palette';
import App from './app';


import Piano from './piano'
import Spawner from './spawner'
import Staff from './staff';
import Geo from './geo';
import Spiral from './spiral';

//import Se02 from './se02';

import MidiReceiver from './utility_modules/midi_receiver'
import WavPlayer from './utility_modules/wavplayer';
//import Sequencer from './utility_modules/sequencer';
//import HeartBeat from './utility_modules/heartbeat';
import MidiPlayer from './utility_modules/midi_player';

//import GuiPanel from './gui/gui_panel';
//import GrabButton from './gui/grabbutton';
//import Button from './gui/button';

import MidiReceiverGui from './gui/midi_receiver_gui';
//import HeartBeatGui from './gui/heartbeat_gui';
import GeoGui from './gui/geo_gui';
//import SequencerGui from './gui/sequencer_gui';
import WavPlayerGui from './gui/wavplayer_gui';
import SpawnerGui from './gui/spawner_gui';
import PianoGui from './gui/piano_gui';
import StaffGui from './gui/staff_gui';
import MidiPlayerGui from './gui/midi_player_gui';

export default class Presets {
	constructor(protected ourApp: App) {
	}

	public async spawnPreset(presetName: string) {
		const presetLower = presetName.toLowerCase();

		await this.ourApp.clearAll();

		if (presetLower === "piano") {
			await this.showPianoStaff();
			//await this.showSpiralStaff();
		}

		if (presetLower === "spiral") {
			await this.showSpiral();
		}

		if (presetLower === "geo") {
			await this.showGeo();
		}

		if (presetLower === "spawner") {
			await this.showSpawner();
		}

		this.ourApp.ourConsole.logMessage("Waiting for all patch lines to be created");

		for(const singlePatch of this.ourApp.ourPatcher.ourPatches){
			if(singlePatch.line){
				await singlePatch.line.created();
			}
		}

		this.ourApp.showGUIsButton.setValue(false);
		this.ourApp.showGrabbersButton.setValue(false);
	}

	public async showPianoStaff() {
		let xPos = 1.5;

		const ourWavPlayer = new WavPlayer(this.ourApp, "Wav Player");
		await ourWavPlayer.loadAllSounds("piano",36,84);
		this.ourApp.allModules.push(ourWavPlayer);

		const ourWavPlayerGui = new WavPlayerGui(this.ourApp, ourWavPlayer);
		await ourWavPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano WavPlayer")		
		this.ourApp.allGUIs.push(ourWavPlayerGui);
		xPos -= 1.75;
		
		const ourPiano = new Piano(this.ourApp, "Piano");
		await ourPiano.createAllKeys(new MRE.Vector3(2, 1, 0),
			MRE.Quaternion.FromEulerAngles(-30 * Math.PI / 180, 0, 0));	
		this.ourApp.allModules.push(ourPiano);

		const ourStaff = new Staff(this.ourApp, "Staff");
		await ourStaff.createAsyncItems(new MRE.Vector3(2, 2, 0.5),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 0, 0));		
		this.ourApp.allModules.push(ourStaff);
		
		const ourMidiReceiver = new MidiReceiver(this.ourApp, this.ourApp.port+1, "Midi Receiver");
		this.ourApp.allModules.push(ourMidiReceiver);

		const ourStaffGui = new StaffGui(this.ourApp, ourStaff);
		await ourStaffGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Staff")
		this.ourApp.allGUIs.push(ourStaffGui);
		xPos -= 1.75;

		const ourPianoGui = new PianoGui(this.ourApp, ourPiano);
		await ourPianoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano")
		this.ourApp.allGUIs.push(ourPianoGui);
		//ourPianoGui.removeSharpsButton(); //TODO: should have global sharp/flat button

		xPos -= 1.75;
		const ourMidiPlayer = new MidiPlayer(this.ourApp, "Midi Player");
		const ourMidiPlayerGui = new MidiPlayerGui(this.ourApp, ourMidiPlayer);
		await ourMidiPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Midi Player");
		this.ourApp.allGUIs.push(ourMidiPlayerGui);

		const ourMidiReceiverGui = new MidiReceiverGui(this.ourApp, ourMidiReceiver);
		await ourMidiReceiverGui.createAsync(new MRE.Vector3(xPos, 0.1, -2), "Midi Recv")
		this.ourApp.allGUIs.push(ourMidiReceiverGui);
				
		const sendPatchPiano = new PatchPoint();
		sendPatchPiano.module = ourPiano;
		sendPatchPiano.messageType = "midi";
		sendPatchPiano.isSender = true;
		sendPatchPiano.gui = ourPianoGui;
		sendPatchPiano.button = ourPianoGui.sendButton;

		const sendPatchPlayer = new PatchPoint();
		sendPatchPlayer.module = ourMidiPlayer;
		sendPatchPlayer.messageType = "midi";
		sendPatchPlayer.isSender = true;
		sendPatchPlayer.gui = ourMidiPlayerGui;
		sendPatchPlayer.button = ourMidiPlayerGui.sendButton;

		const receivePatchPiano = new PatchPoint();
		receivePatchPiano.module = ourPiano;
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
		receivePatchStaff.module = ourStaff;
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
		sendPatchStaff.module = ourStaff;
		sendPatchStaff.messageType = "midi";
		sendPatchStaff.isSender = true;
		sendPatchStaff.gui = ourStaffGui;
		sendPatchStaff.button = ourStaffGui.sendButton;

		this.ourApp.ourConsole.logMessage("patching midi -> piano");
		this.ourApp.ourPatcher.applyPatch(sendMidi, receivePatchPiano);

		this.ourApp.ourConsole.logMessage("patching player -> piano");
		this.ourApp.ourPatcher.applyPatch(sendPatchPlayer, receivePatchPiano);

		this.ourApp.ourConsole.logMessage("patching piano -> staff");
		this.ourApp.ourPatcher.applyPatch(sendPatchPiano, receivePatchStaff);

		this.ourApp.ourConsole.logMessage("patching piano -> wave player");
		this.ourApp.ourPatcher.applyPatch(sendPatchPiano, receiveWavPlayer);

		this.ourApp.ourConsole.logMessage("patching staff -> wave player");
		this.ourApp.ourPatcher.applyPatch(sendPatchStaff, receiveWavPlayer);
	}

	public async showGeo() {
		let xPos = 1.5;

		const ourWavPlayer = new WavPlayer(this.ourApp, "Wav Player");
		ourWavPlayer.audioRange = 10;
		ourWavPlayer.cullTime = 0; //don't cull sounds based on time playing
		ourWavPlayer.doPedal = false;
		//await ourWavPlayer.loadAllSounds("GoogleDrive/GeoSound",21,108);
		await ourWavPlayer.loadAllSoundsDirectory("speak", 21);
		this.ourApp.allModules.push(ourWavPlayer);
		ourWavPlayer.volume=0.5;

		const ourWavPlayerGui = new WavPlayerGui(this.ourApp, ourWavPlayer);
		await ourWavPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "WavPlayer")
		this.ourApp.allGUIs.push(ourWavPlayerGui);
		xPos -= 1.75;

		const ourGeo = new Geo(this.ourApp, "Geo");

		//TODO, figure out better way to communicate how many samples available to geo 
		await ourGeo.createAllGeos(new MRE.Vector3(0, 0, 0),
			MRE.Quaternion.Identity(),
			ourWavPlayer.lowestNote,
			ourWavPlayer.highestNote);

		this.ourApp.allModules.push(ourGeo);

		const ourGeoGui = new GeoGui(this.ourApp, ourGeo);
		await ourGeoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Geo")
		this.ourApp.allGUIs.push(ourGeoGui);

		const sendPathGeo = new PatchPoint();
		sendPathGeo.module = ourGeo;
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

		this.ourApp.ourPatcher.applyPatch(sendPathGeo, receiveWavPlayer);
	}

	public async showSpawner() {
		let xPos = -3;
		let zPos = 0;

		
		//======================================================================

		const ourMidiPlayer = new MidiPlayer(this.ourApp, "Midi Player");

		const ourMidiPlayerGui = new MidiPlayerGui(this.ourApp, ourMidiPlayer);
		await ourMidiPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, zPos), "Midi Player");
		this.ourApp.allGUIs.push(ourMidiPlayerGui);

		//======================================================================

		const ourMidiReceiver = new MidiReceiver(this.ourApp, this.ourApp.port+1, "Midi Receiver");
		this.ourApp.allModules.push(ourMidiReceiver);
		
		const ourMidiReceiverGui = new MidiReceiverGui(this.ourApp, ourMidiReceiver);
		await ourMidiReceiverGui.createAsync(new MRE.Vector3(xPos, 0.1, zPos-2), "Midi Recv");
		this.ourApp.allGUIs.push(ourMidiReceiverGui);		
		xPos+=1.75;

		//======================================================================

		const ourSpawner = new Spawner(this.ourApp, "Spawner");
		await ourSpawner.createAsyncItems(new MRE.Vector3(xPos + 2, 1, zPos),
			MRE.Quaternion.FromEulerAngles(0.0 * Math.PI / 180, 0, 0));
		this.ourApp.allModules.push(ourSpawner);		

		const ourSpawnerGui = new SpawnerGui(this.ourApp, ourSpawner);
		await ourSpawnerGui.createAsync(new MRE.Vector3(xPos, 0.1, zPos), "Spawner");
		this.ourApp.allGUIs.push(ourSpawnerGui);
		xPos+=1.75;
		
		//======================================================================

		const ourWavPlayer = new WavPlayer(this.ourApp, "Wav Player");
		await ourWavPlayer.loadAllSounds("piano", 36, 84);
		this.ourApp.allModules.push(ourWavPlayer);

		const ourWavPlayerGui = new WavPlayerGui(this.ourApp, ourWavPlayer);
		await ourWavPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, zPos), "Piano WavPlayer")
		this.ourApp.allGUIs.push(ourWavPlayerGui);

		//======================================================================
		
		const midiPlayerSendPath = new PatchPoint();
		midiPlayerSendPath.module = ourMidiPlayer;
		midiPlayerSendPath.messageType = "midi";
		midiPlayerSendPath.isSender = true;
		midiPlayerSendPath.gui = ourMidiPlayerGui;
		midiPlayerSendPath.button = ourMidiPlayerGui.sendButton;

		const receiveWavePlayerPatch = new PatchPoint();
		receiveWavePlayerPatch.module = ourWavPlayer;
		receiveWavePlayerPatch.messageType = "midi";
		receiveWavePlayerPatch.isSender = false;
		receiveWavePlayerPatch.gui = ourWavPlayerGui;
		receiveWavePlayerPatch.button = ourWavPlayerGui.receiveButton;

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


		this.ourApp.ourPatcher.applyPatch(midiPlayerSendPath, receiveSpawnerPatch);
		this.ourApp.ourPatcher.applyPatch(sendMidi, receiveSpawnerPatch);
		this.ourApp.ourPatcher.applyPatch(sendSpawnerPatch, receiveWavePlayerPatch);

		
	}

	public async showSpiral(){
		let xPos = 1.5;

		const ourWavPlayer = new WavPlayer(this.ourApp, "Wav Player");
		await ourWavPlayer.loadAllSounds("piano",36,84);
		this.ourApp.allModules.push(ourWavPlayer);

		const ourWavPlayerGui = new WavPlayerGui(this.ourApp, ourWavPlayer);
		await ourWavPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano WavPlayer")		
		this.ourApp.allGUIs.push(ourWavPlayerGui);
		xPos -= 1.75;

		const ourSpiral = new Spiral(this.ourApp, "Spiral");
		await ourSpiral.createAllKeys(new MRE.Vector3(2, 0, -1));	
		this.ourApp.allModules.push(ourSpiral);

		const ourStaff = new Staff(this.ourApp, "Staff");
		await ourStaff.createAsyncItems(new MRE.Vector3(2, 2, 0.5),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 0, 0));		
		this.ourApp.allModules.push(ourStaff);	

		const ourStaffGui = new StaffGui(this.ourApp, ourStaff);
		await ourStaffGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Staff")
		this.ourApp.allGUIs.push(ourStaffGui);
		xPos -= 1.75;

		/*const ourPianoGui = new PianoGui(this.ourApp, this.ourApp.ourPiano);
		await ourPianoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano")
		this.ourApp.allGUIs.push(ourPianoGui);
		ourPianoGui.removeSharpsButton(); //TODO: should have global sharp/flat button
*/

		const sendPatchPiano = new PatchPoint();
		sendPatchPiano.module = ourSpiral;
		sendPatchPiano.messageType = "midi";
		sendPatchPiano.isSender = true;
		//sendPatchPiano.gui = ourPianoGui;
		//sendPatchPiano.button = ourPianoGui.sendButton;

		const receivePatchStaff = new PatchPoint();
		receivePatchStaff.module = ourStaff;
		receivePatchStaff.messageType = "midi";
		receivePatchStaff.isSender = false;
		receivePatchStaff.gui = ourStaffGui;
		receivePatchStaff.button = ourStaffGui.receiveButton;

		this.ourApp.ourPatcher.applyPatch(sendPatchPiano, receivePatchStaff);

		const receiveWavPlayer = new PatchPoint();
		receiveWavPlayer.module = ourWavPlayer;
		receiveWavPlayer.messageType = "midi";
		receiveWavPlayer.isSender = false;
		receiveWavPlayer.gui = ourWavPlayerGui;
		receiveWavPlayer.button = ourWavPlayerGui.receiveButton;

		this.ourApp.ourPatcher.applyPatch(sendPatchPiano, receiveWavPlayer);

		const sendPatchStaff = new PatchPoint();
		sendPatchStaff.module = ourStaff;
		sendPatchStaff.messageType = "midi";
		sendPatchStaff.isSender = true;
		sendPatchStaff.gui = ourStaffGui;
		sendPatchStaff.button = ourStaffGui.sendButton;

		this.ourApp.ourPatcher.applyPatch(sendPatchStaff, receiveWavPlayer);
	}

	/*
	private async showSequencerPiano(){
		let xPos = 1.5;

		const ourWavPlayer = new WavPlayer(this.ourApp, "Wav Player");
		await ourWavPlayer.loadAllSounds("piano",36,84);
		this.ourApp.allModules.push(ourWavPlayer);

		const ourWavPlayerGui = new WavPlayerGui(this.ourApp, ourWavPlayer);
		await ourWavPlayerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano WavPlayer")		
		this.ourApp.allGUIs.push(ourWavPlayerGui);
		xPos -= 1.75;

		this.ourApp.ourPiano = new Piano(this.ourApp, "Piano");
		await this.ourApp.ourPiano.createAllKeys(new MRE.Vector3(2, 1, 0),
			MRE.Quaternion.FromEulerAngles(-30 * Math.PI / 180, 0, 0));	
		this.ourApp.allModules.push(this.ourApp.ourPiano);

		const ourPianoGui = new PianoGui(this.ourApp, this.ourApp.ourPiano);
		await ourPianoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano")
		this.ourApp.allGUIs.push(ourPianoGui);
		xPos -= 1.75;		

		const ourSequencer = new Sequencer(this.ourApp, "Sequencer");
		await ourSequencer.createAsyncItems(12,new MRE.Vector3(-1.5, 2.0, 0.0),
			MRE.Quaternion.FromEulerAngles(-45 * Math.PI / 180, 0, 0));
		this.ourApp.allModules.push(ourSequencer);

		const ourSequencerGui = new SequencerGui(this.ourApp, ourSequencer);
		await ourSequencerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano Sequencer")
		this.ourApp.allGUIs.push(ourSequencerGui);
		xPos =1.5;			

		const ourHeartBeat= new HeartBeat(this.ourApp, "Heart Beat");
		this.ourApp.allModules.push(ourHeartBeat);

		const ourHeartBeatGui = new HeartBeatGui(this.ourApp, ourHeartBeat);
		await ourHeartBeatGui.createAsync(new MRE.Vector3(xPos, 0.1, -1.75), "Heart Beat")
		this.ourApp.allGUIs.push(ourHeartBeatGui);
		xPos -= 1.75;

		const ourWavPlayer2 = new WavPlayer(this.ourApp, "Wav Player");
		await ourWavPlayer2.loadAllSounds("drums/grd-music",48,54);
		this.ourApp.allModules.push(ourWavPlayer2);

		const ourWavPlayerGui2 = new WavPlayerGui(this.ourApp, ourWavPlayer2);
		await ourWavPlayerGui2.createAsync(new MRE.Vector3(xPos, 0.1, -1.75), "Drums WavPlayer")		
		this.ourApp.allGUIs.push(ourWavPlayerGui2);
		xPos -= 1.75;

		const ourSequencer2 = new Sequencer(this.ourApp, "Sequencer");
		await ourSequencer2.createAsyncItems(7, new MRE.Vector3(1.5, 2.0, 0.0),
			MRE.Quaternion.FromEulerAngles(-45 * Math.PI / 180, 0, 0));
		this.ourApp.allModules.push(ourSequencer2);

		const ourSequencerGui2 = new SequencerGui(this.ourApp, ourSequencer2);
		await ourSequencerGui2.createAsync(new MRE.Vector3(xPos, 0.1, -1.75), "Drum Sequencer")
		this.ourApp.allGUIs.push(ourSequencerGui2);
		xPos -= 1.75;

		/////// MIDI

		const sendPatchPiano = new PatchPoint();
		sendPatchPiano.module = this.ourApp.ourPiano;
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

		this.ourApp.ourPatcher.applyPatch(sendPatchPiano, receiveWavPlayer);		

		const sendPatchSequencer = new PatchPoint();
		sendPatchSequencer.module = ourSequencer;
		sendPatchSequencer.messageType = "midi";
		sendPatchSequencer.isSender = true;
		sendPatchSequencer.gui = ourSequencerGui;
		sendPatchSequencer.button = ourSequencerGui.sendButton;

		const receivePatchPiano = new PatchPoint();
		receivePatchPiano.module = this.ourApp.ourPiano;
		receivePatchPiano.messageType = "midi";
		receivePatchPiano.isSender = false;
		receivePatchPiano.gui = ourPianoGui;
		receivePatchPiano.button = ourPianoGui.receiveButton;

		this.ourApp.ourPatcher.applyPatch(sendPatchSequencer,receivePatchPiano);	

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

		this.ourApp.ourPatcher.applyPatch(sendPatchSequencer2, receiveWavPlayer2);	

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

		this.ourApp.ourPatcher.applyPatch(sendHeartBeat,receiveSequencerHeartBeat);
		this.ourApp.ourPatcher.applyPatch(sendHeartBeat,receiveSequencerHeartBeat2);
	}*/

	/*
	public async showSE02(){
		this.ourApp.ourPiano = new Piano(this.ourApp, "Piano");
		await this.ourApp.ourPiano.createAllKeys(new MRE.Vector3(2, 1, 0),
			MRE.Quaternion.FromEulerAngles(-30 * Math.PI / 180, 0, 0));	
		this.ourApp.allModules.push(this.ourApp.ourPiano);

		const ourMidiReceiver = new MidiReceiver(this.ourApp,3902,"Midi Receiver");
		this.ourApp.allModules.push(ourMidiReceiver);

		const ourSequencer = new Sequencer(this.ourApp, "Sequencer");
		await ourSequencer.createAsyncItems(12,new MRE.Vector3(-1.5, 2.0, 0.0),
			MRE.Quaternion.FromEulerAngles(-45 * Math.PI / 180, 0, 0));
		this.ourApp.allModules.push(ourSequencer);		

		const ourHeartBeat= new HeartBeat(this.ourApp, "Heartbeat");
		this.ourApp.allModules.push(ourHeartBeat);

		const ourSE = new Se02(this.ourApp, "SE-02");
		await ourSE.createAsyncItems(new MRE.Vector3(2, 1.75, 0.5),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 0, 0));

		let xPos=1.5;

		const ourPianoGui = new PianoGui(this.ourApp, this.ourApp.ourPiano);
		await ourPianoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano")
		this.ourApp.allGUIs.push(ourPianoGui);
		ourPianoGui.removeSharpsButton(); //TODO: should have global sharp/flat button
		xPos -= 1.75;	

		const ourSequencerGui = new SequencerGui(this.ourApp, ourSequencer);
		await ourSequencerGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Piano Sequencer")
		this.ourApp.allGUIs.push(ourSequencerGui);
		xPos -= 1.75;	


		const ourHeartBeatGui = new HeartBeatGui(this.ourApp, ourHeartBeat);
		await ourHeartBeatGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Heart Beat")
		this.ourApp.allGUIs.push(ourHeartBeatGui);
		xPos -= 1.75;	
	}*/
}