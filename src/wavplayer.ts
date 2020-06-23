/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import fs from 'fs';

interface WavProperties{
	timeStamp: number;
	actor: MRE.Actor;
	note: number;
}

export default class WavPlayer {
	//private ourSounds: MRE.Sound[] = [];
	private ourSounds: Map<number, MRE.Sound> = new Map();

	private playingWavs: WavProperties[]=[]; 

	private polyphonyLimit=10; //TODO: allow these to be set in in-world GUI
	public volume=0.75;
	public cullTime=5000;

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
				if (currentTime - ourWave.timeStamp > this.cullTime) {
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

	public async loadAllSounds(subdir: string) {
		let octave = 0;
		let note = 9;

		for (let i = 0; i < 128; i++) {
			//const filename =` +
			const filename = `${subdir}/${i}.ogg`;
			const URL = `${this.ourApp.baseUrl}/` + filename;
			const diskLocation=`${this.ourApp.baseDir}/` + filename;

			try {
				if (fs.existsSync(diskLocation)) {
					this.ourApp.ourConsole.logMessage("found a ogg file for midi note: " + i);
				} else {
					continue;
				}
			} catch (err) {
				continue;
			}			

			const newSound = this.ourApp.assets.createSound("pianoKey" + i, {
				uri: URL
			});
			await newSound.created;
			this.ourApp.ourConsole.logMessage(" success!");
			//this.ourSounds.push(newSound);
			this.ourSounds.set(i,newSound);

			note = note + 1;
			if (note === 12) {
				note = 0;
				octave++;
			}
		}
	}	

	/*public getSoundGUID(note: number) {
		//const adjustedNote: number = note - 21;
		
		return this.ourSounds[adjustedNote].id;
	}*/

	public playSound(note: number, vel: number, pos: MRE.Vector3, audioRange: number) {
		//const adjustedNote: number = note - 21;

		if (!this.ourSounds.has(note)) {
			this.ourApp.ourConsole.logMessage("cant play midi note: " +
				note + " as wav set doesnt contain a ogg for it!");
		}

		const ourSound=this.ourSounds.get(note);

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

		soundActor.startSound(ourSound.id, {
			doppler: 0,
			pitch: 0.0,
			looping: false,
			paused: false,
			volume: this.volume,
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
