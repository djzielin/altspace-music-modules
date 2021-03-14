/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import MusicModule from '../backend/music_module';
import App from '../app';
import MPlayer from 'midi-player-ts';
import axios from 'axios';

enum PlayState {
	Stopped = 0,
	Paused = 1,
	Playing = 2
}

enum PlayType {
	Single = 0,
	Loop = 1,
	Playlist = 2
}

export default class MidiPlayer extends MusicModule {

	private Player: MPlayer.Player;

	public currentFileIndex=0;
	public midiFiles: string[]=[];
	public midiFileArrayBuffers: ArrayBuffer[]=[];

	public isLoaded = false;
	public ourPlayState: PlayState=PlayState.Stopped;
	public ourPlayType: PlayType=PlayType.Playlist;

	constructor(protected ourApp: App, public name: string) {
		super(ourApp, name);

		this.midiFiles.push("https://www.mutopiaproject.org/ftp/BachJS/"+
			"BWV846/wtk1-prelude1/wtk1-prelude1.mid");
		this.midiFiles.push("https://www.mutopiaproject.org/ftp/DebussyC/"+
			"L75/debussy_Ste_Bergamesq_Clair/debussy_Ste_Bergamesq_Clair.mid");
		this.midiFiles.push("https://www.mutopiaproject.org/ftp/ChopinFF/"+
			"O9/chopin_nocturne_op9_n2/chopin_nocturne_op9_n2.mid");

		this.Player = new MPlayer.Player();

		this.Player.on('midiEvent', (event: MPlayer.Event) => {
			if (event.name === 'Note on') {
				//this.ourApp.ourConsole.logMessage("MIDI Player Note On: " + event.noteNumber);
				this.sendMidi(event.noteNumber, event.velocity);
			}
			if (event.name === 'Note off') {
				this.sendMidi(event.noteNumber, 0);
			}
		});

		this.loadArrayBuffers();

		this.setupAfterAction();
	}

	private loadArrayBuffers() {
		for (let i = 0; i < this.midiFiles.length; i++) {
			this.midiFileArrayBuffers.push(null);

			axios.get(this.midiFiles[i], { responseType: 'arraybuffer' }).then((response) => {
				// handle success
				this.ourApp.ourConsole.logMessage("Success loading: " + this.midiFiles[i]);

				this.midiFileArrayBuffers[i]=(response.data);
			}).catch((error) => {
				// handle error
				this.ourApp.ourConsole.logMessage("ERROR Loading MIDI");

			});
		}
	}

	private loadFile(){
		this.ourApp.ourConsole.logMessage("MIDI Player - Loading Midi");

		if(this.currentFileIndex<this.midiFiles.length){
			this.ourApp.ourConsole.logMessage("   Loading: " + this.midiFiles[this.currentFileIndex]);
			//this.Player.loadFile(this.midiFiles[this.currentFileIndex]);
			if(this.midiFileArrayBuffers[this.currentFileIndex]){ //null check
				this.Player.loadArrayBuffer(this.midiFileArrayBuffers[this.currentFileIndex]);
			}
		}		
	}

	private setupAfterAction(){
		this.ourApp.ourConsole.logMessage("MIDI Player - Setting up after actions");

		this.Player.on('endOfFile', () => {			
			this.ourApp.ourConsole.logMessage("MIDI Player - END OF FILE");

			setTimeout(() => { //wait just a bit, otherwise the midi-player 'stop' kills us 
				this.ourApp.ourConsole.logMessage("   2 second expired, stopping playback");

				this.setStopped();

				if(this.ourPlayType===PlayType.Playlist){
					this.currentFileIndex=(this.currentFileIndex+1) % this.midiFiles.length;
				}

				if(this.ourPlayType===PlayType.Playlist || this.ourPlayType===PlayType.Loop){
					this.setPlaying();
				}				
			}, 2000);
		});
	}

	public setStopped(){
		this.Player.stop();
		this.ourPlayState=PlayState.Stopped;

		for(let i=0;i<128;i++){ //simulate a note off for all notes
			const sendMessage = [i, 0, 0];
			this.sendData(sendMessage, "midi")
		}
	}

	public setPlaying() {
		this.ourApp.ourConsole.logMessage("MIDI Player - Playing Midi");

		if(this.ourPlayState===PlayState.Playing){
			this.ourApp.ourConsole.logMessage("   already playing. no change");
		}

		if(this.ourPlayState===PlayState.Paused) {
			this.ourApp.ourConsole.logMessage("   was in paused state, trying to play");

			this.Player.play();
			this.ourPlayState=PlayState.Playing;
			return;
		}
		
		if(this.ourPlayState===PlayState.Stopped){
			this.ourApp.ourConsole.logMessage("   was in stopped state.");

			this.loadFile();			
			this.Player.play();
			this.ourPlayState=PlayState.Playing;
			return;
		}
	}

	public setPaused(){
		this.ourApp.ourConsole.logMessage("MIDI Player - Pausing");

		if(this.ourPlayState===PlayState.Playing){
			this.Player.pause();
			this.ourPlayState=PlayState.Paused;
			this.ourApp.ourConsole.logMessage("   pause complete!");
		} else{
			this.ourApp.ourConsole.logMessage("   midi not playing, not doing anything");
		}
	}	

	public setTempo(tempo: number){
		this.Player.tempo=tempo;

		this.Player.pause(); //the library does this for internal tempo change events...
		this.Player.play();
	}

	private sendMidi(note: number, vel: number, channel = 0) {
		const sendMessage = [note, vel, channel];
		this.sendData(sendMessage, "midi")
	}
}
