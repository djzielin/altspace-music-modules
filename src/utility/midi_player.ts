/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import MusicModule from '../music_module';
import App from '../app';
import MPlayer from 'midi-player-ts';

export default class MidiPlayer extends MusicModule {

	private Player: MPlayer.Player;
	
	constructor(protected ourApp: App) {
		super(ourApp);

		this.Player = new MPlayer.Player();

		// Load a MIDI file
		this.Player.loadFile(`${this.ourApp.baseDir}/` + 'midi/bach_846.mid');
		//this.Player.loadFile(`${this.ourApp.baseDir}/` + 'midi/simultaneous_notes_test.mid');
		this.Player.play();

		this.Player.on('midiEvent', (event: MPlayer.Event) => {
			if(event.name==='Note on'){
				this.ourApp.ourConsole.logMessage("MIDI Player Note On: " + event.noteNumber);
				this.sendMidi(event.noteNumber,event.velocity);
			} 
			if(event.name==='Note off'){
				this.sendMidi(event.noteNumber,0);
			}
		});

		this.Player.on('endOfFile', () => {
			this.Player.loadFile(`${this.ourApp.baseDir}/` + 'midi/bach_846.mid');
			//this.ourApp.ourConsole.logMessage("MIDI Player - END OF FILE");

			setTimeout(() => { //wait just a bit, otherwise the midi-player 'stop' kills us 
				this.Player.play();
			}, 1000);
		});
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
