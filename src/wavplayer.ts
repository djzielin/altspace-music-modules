/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import fs from 'fs';
import MusicModule from './music_module';

interface WavProperties{
	timeStamp: number;
	actor: MRE.Actor;
	media: MRE.MediaInstance;
	note: number;
	vol: number;
}

export default class WavPlayer extends MusicModule{
	private ourSounds: Map<number, MRE.Sound> = new Map();

	public playingWavs: WavProperties[]=[]; 

	public polyphonyLimit=10; // TODO: allow these to be set in in-world GUI
	public volume=0.75;
	public cullTime=5000;
	public doPedal=true;

	public audioRange=3;

	private lowestNote=-1;
	private highestNote=-1;

	private noteOrder =
		["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

	private removeFromPlaying(ourWav: WavProperties) {
		const index = this.playingWavs.indexOf(ourWav);
		if (index > -1) {
			this.playingWavs.splice(index, 1);
		}
	}	

	constructor(protected ourApp: App) {
		super(ourApp);

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
		//for (let i = 0; i < 128; i++) {
		for (let i = 36; i < 85; i++) {
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

	public receiveData(data: number[], messageType: string) {
		if (messageType === "midi") {
			if (data.length < 2) {
				return;
			}

			const note = data[0];
			const vel = data[1];
			//const channel = data[2];

			let x = 0;
			let y = 0;
			let z = 0;

			if (vel === 0) {
				this.stopSound(note);
				return;
			}

			if (data.length >= 6) {
				x = data[3];
				y = data[4];
				z = data[5];
			}

			this.playSound(note, vel, new MRE.Vector3(x, y, z));
		}
	}

	private playSound(note: number, vel: number, pos: MRE.Vector3) {
		if (!this.ourSounds.has(note)) {
			this.ourApp.ourConsole.logMessage("cant play midi note: " +
				note + " as wav set doesnt contain a ogg for it!");

			//TODO: find closest note in set, and use playback speed to adjust
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

		const volume=(this.volume*(vel/127.0));

		const mediaInstance=soundActor.startSound(ourSound.id, {
			doppler: 0,
			pitch: 0.0,
			looping: false,
			paused: false,
			volume: volume,
			rolloffStartDistance: this.audioRange 
		});	

		const ourWave={
			timeStamp: Date.now(),
			actor: soundActor,
			media: mediaInstance,
			note: note,
			vol: volume
		}

		this.playingWavs.push(ourWave);		
	}
	
	private stopSound(note: number) {
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
