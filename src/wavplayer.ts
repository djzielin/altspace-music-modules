/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

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
	private ourSounds: Map<number, MRE.Sound> = new Map();

	public playingWavs: WavProperties[]=[]; 

	private polyphonyLimit=10; // TODO: allow these to be set in in-world GUI
	public volume=0.75;
	public cullTime=5000;

	private lowestNote=-1;
	private highestNote=-1;

	public doPedal=true;

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
					ourWave.actor.destroy();
					listOfPlayingWavsToDelete.push(ourWave);
				}
			}

			for (const ourWave of listOfPlayingWavsToDelete) {
				this.removeFromPlaying(ourWave);
			}

		}, 1000);
	}

	public async loadAllSounds(subdir: string) {
		for (let i = 0; i < 128; i++) {
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

			if(this.lowestNote===-1){
				this.lowestNote=i;
			}
			if(this.highestNote===-1){
				this.highestNote=i;
			}
			if(i<this.lowestNote){
				this.lowestNote=i;
			}
			if(i>this.highestNote){
				this.highestNote=i;
			}

			const newSound = this.ourApp.assets.createSound("pianoKey" + i, {
				uri: URL
			});
			await newSound.created;

			this.ourSounds.set(i,newSound);
			this.ourApp.ourConsole.logMessage(" success!");
		}
	}	

	public playSound(note: number, vel: number, pos: MRE.Vector3, audioRange: number) {
		if (!this.ourSounds.has(note)) {
			this.ourApp.ourConsole.logMessage("cant play midi note: " +
				note + " as wav set doesnt contain a ogg for it!");
			if(note<this.lowestNote){				
				do{
					note+=12;
				} while(!this.ourSounds.has(note));

			} else if(note>this.lowestNote){
				do{
					note-=12;
				} while(!this.ourSounds.has(note));
			} else{
				this.ourApp.ourConsole.logMessage("not supporting more complicated interpolation at the moment!");
				return;
			}
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
			volume: (this.volume*(vel/127.0)),
			rolloffStartDistance: audioRange 
		});	

		const ourWave={
			timeStamp: Date.now(),
			actor: soundActor,
			note: note
		}

		this.playingWavs.push(ourWave);		
	}
	
	public stopSound(note: number) {
		if(this.doPedal){
			return; //let all notes ring out
		}

		const listOfPlayingWavsToDelete: WavProperties[] = [];

		for(const ourWave of this.playingWavs){
			if(ourWave.note===note){
				
				ourWave.actor.destroy();
				listOfPlayingWavsToDelete.push(ourWave);
			}
		}
		for (const ourWave of listOfPlayingWavsToDelete) {
			this.removeFromPlaying(ourWave)
		}
	}
}
