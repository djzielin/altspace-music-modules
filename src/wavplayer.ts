/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';

interface WavProperties{
	timeStamp: number;
	actor: MRE.Actor;
	note: number;
}

export default class WavPlayer {
	private ourSounds: MRE.Sound[] = [];
	private playingWavs: WavProperties[]=[]; 

	private polyphonyLimit=20; //TODO: allow these to be set in in-world GUI

	private noteOrder =
		["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

	private removeFromPlaying(ourWav: WavProperties) {
		const index = this.playingWavs.indexOf(ourWav);
		if (index > -1) {
			this.playingWavs.splice(index, 1);
		}
	}	

	constructor(private ourApp: App) {
		setInterval(() => { //cull bubbles that have been around too long
			const currentTime = Date.now();
			const listOfPlayingWavsToDelete: WavProperties[] = [];

			for (const ourWave of this.playingWavs) {
				if (currentTime - ourWave.timeStamp > 5000) {
					//this.ourApp.ourConsole.logMessage("5 seconds has expired, pulling playing bubble");
					ourWave.actor.destroy();
					listOfPlayingWavsToDelete.push(ourWave);
				}
			}

			for (const ourWave of listOfPlayingWavsToDelete) {
				this.removeFromPlaying(ourWave);
			}

			const timeNow = new Date(Date.now());

			this.ourApp.ourConsole.logMessage(
				`Time: ${this.ourApp.pad(timeNow.getHours(), 2, '0')}:` +
				`${this.ourApp.pad(timeNow.getMinutes(), 2, '0')}:` +
				`${this.ourApp.pad(timeNow.getSeconds(), 2, '0')} - ` +
				`${this.playingWavs.length} playing ` +
				`(${listOfPlayingWavsToDelete.length} culled)`);
		}, 1000);
	}

	public async loadAllSounds() {
		let octave = 0;
		let note = 9;

		for (let i = 21; i < 109; i++) {
			//const filename = `${this.ourApp.baseUrl}/mono_5s_wav/` +
			const filename = `${this.ourApp.baseUrl}/mono_5s_ogg/` +

				"Piano.ff." + this.noteOrder[note] +
				octave.toString() + ".ogg";

			this.ourApp.ourConsole.logMessage("trying to load: " + filename);
			const newSound = this.ourApp.assets.createSound("pianoKey" + i, {
				uri: filename
			});
			await newSound.created;
			this.ourApp.ourConsole.logMessage(" success! " + ((i-20)/109*100.0).toFixed(1) +"% loaded!");
			this.ourSounds.push(newSound);

			note = note + 1;
			if (note === 12) {
				note = 0;
				octave++;
			}
		}
	}	

	public getSoundGUID(note: number) {
		const adjustedNote: number = note - 21;
		return this.ourSounds[adjustedNote].id;
	}

	public playSound(note: number, vel: number, pos: MRE.Vector3, audioRange: number) {
		const adjustedNote: number = note - 21;

		while(this.playingWavs.length>this.polyphonyLimit){
			this.ourApp.ourConsole.logMessage("culling wav. enforcing polyphony limit of: " + this.polyphonyLimit);
			const wavToCull=this.playingWavs.shift();
			wavToCull.actor.destroy();
		}

		const soundActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'sound',
				transform: {
					app: {
						position: pos
					}
				},
			}
		});

		soundActor.startSound(this.ourSounds[adjustedNote].id, {
			doppler: 0,
			pitch: 0.0,
			looping: false,
			paused: false,
			volume: 0.75,
			rolloffStartDistance: audioRange 
		});	

		const ourWave={
			timeStamp: Date.now(),
			actor: soundActor,
			note: note
		}

		this.playingWavs.push(ourWave);		
	}

	/*
	public stopSound(note: number) {
		if (this.activeSounds.has(note)) {
			const playingSoud: MRE.MediaInstance = this.activeSounds.get(note);
			playingSoud.stop();
			this.activeSounds.delete(note);
		}
	}*/
}
