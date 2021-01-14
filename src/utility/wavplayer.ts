/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import App from '../app';
import fs from 'fs';
import MusicModule from '../music_module';

interface WavProperties{
	timeStamp: number;
	actor: MRE.Actor;
	media: MRE.MediaInstance;
	note: number;
	vol: number;
}

enum IntonationMode {
	none = 0,
	ptolemy = 1,
	pythagorean = 2,
	limit7 = 3
}

export default class WavPlayer extends MusicModule {
	private ourSounds: Map<number, MRE.Sound> = new Map();
	private ourSoundsArray: MRE.Sound[]=[];
	public playingWavs: WavProperties[] = [];

	public polyphonyLimit = 10; // TODO: allow these to be set in in-world GUI
	public volume = 0.75;
	public cullTime = 5000;
	public doPedal = true;

	public intonation = IntonationMode.none;
	public intonationBase = 0;


	public audioRange = 3;

	public lowestNote = -1;
	public highestNote = -1;

	private intonatePotemly = [
		0.0000,
		11.7313,
		3.9100,
		15.6413,
		-13.6863,
		-1.9550,
		-9.7763,
		1.9550,
		13.6863,
		-15.6413,
		17.5963,
		-11.7313
	];

	private intonatePhythag = [
		0.0000,
		-9.7750,
		3.9100,
		-5.8650,
		7.8200,
		-1.9550,
		-11.7300,
		1.9550,
		-7.8200,
		5.8650,
		-3.9100,
		9.7750
	];

	private intonate7Limit = [
		0.0000,
		19.4428,
		31.1741,
		15.6413,
		-13.6863,
		-1.9550,
		-17.4878,
		1.9550,
		13.6863,
		-15.6413,
		-31.1741,
		-11.7313
	];

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
					if (this.cullTime > 0) {
						ourWave.actor.destroy();
						listOfPlayingWavsToDelete.push(ourWave);
					}
				}
			}

			for (const ourWave of listOfPlayingWavsToDelete) {
				this.removeFromPlaying(ourWave);
			}

		}, 1000);
	}

	public async loadAllSounds(subdir: string, minMidi: number, maxMidi: number) {
		//for (let i = 0; i < 128; i++) {
		for (let i = minMidi; i <= maxMidi; i++) {
			const filename = `${subdir}/${i}.ogg`;
			const URL = `${this.ourApp.baseUrl}/` + filename;
			const diskLocation = `${this.ourApp.baseDir}/` + filename;

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
			//this.ourSoundsArray.push(newSound);
			this.ourApp.ourConsole.logMessage(" success!");

		}
	}

	public async loadAllSoundsDirectory(subdir: string, minMidi: number) {
		const diskLocation = `${this.ourApp.baseDir}/` + `${subdir}/`
		let i = minMidi;

		const fileObjs = fs.readdirSync(diskLocation);

		for (const file of fileObjs) {
			if (file.endsWith(".ogg")) {
				this.ourApp.ourConsole.logMessage("found file in directory: " + file);

				const URL = `${this.ourApp.baseUrl}/` + `${subdir}/` + file;

				const newSound = this.ourApp.assets.createSound("pianoKey" + i, {
					uri: URL
				});

				await newSound.created;

				this.ourSounds.set(i, newSound);
				this.ourApp.ourConsole.logMessage(" success!");

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

				i++;
			}
		}
	}

	public receiveData(data: any[], messageType: string) {
		if (messageType === "midi") {
			if (data.length < 2) {
				return;
			}

			const note = data[0] as number;
			const vel = data[1] as number;
			//const channel = data[2];

			let x = 0;
			let y = 0;
			let z = 0;

			let parentID: MRE.Guid=MRE.ZeroGuid;
			if (vel === 0) {
				this.stopSound(note);
				return;
			}

			if (data.length >= 6) {
				x = data[3] as number;
				y = data[4] as number;
				z = data[5] as number;
			}
			if(data.length >=7){
				const guidString=data[6] as string;
				parentID=MRE.parseGuid(guidString);
				this.ourApp.ourConsole.logMessage("WAVPLAYER: received parent Guid");
			}
			
			this.playSound(note, vel, new MRE.Vector3(x, y, z), parentID);
		}
	}

	private playSound(note: number, vel: number, pos: MRE.Vector3, parentID: MRE.Guid) {
		let noteInt=Math.trunc(note);
		const noteFract=note-noteInt;
		let pitchOffset=noteFract;
		const noteInOctave=noteInt % 12;

		this.ourApp.ourConsole.logMessage("wav player midi note: " + note);
		this.ourApp.ourConsole.logMessage("wav player pitch class: " + noteInOctave);


		if(this.intonation!==IntonationMode.none){

			let intonationChange = 0.0;
			const shiftedNote = (noteInOctave - this.intonationBase + 12) % 12;

			if (this.intonation === IntonationMode.ptolemy) {
				intonationChange=(this.intonatePotemly[shiftedNote]/100.0);
			}
			if (this.intonation === IntonationMode.pythagorean) {
				intonationChange=(this.intonatePhythag[shiftedNote]/100.0);
			}
			if (this.intonation === IntonationMode.limit7) {
				intonationChange=(this.intonate7Limit[shiftedNote]/100.0);
			}
			pitchOffset+=intonationChange;
		}

		if (!this.ourSounds.has(noteInt)) { //we don't have to exact sample, but we can pitch shift note we do have
			let closestNote=0;
			let closestDistance=1000;

			for(const key of this.ourSounds.keys()){
				const noteDistance=Math.abs(noteInt-key);
				if(noteDistance<closestDistance){
					closestNote=key;
					closestDistance=noteDistance;
				}
			}
			if(closestDistance===1000){
				this.ourApp.ourConsole.logMessage("cant play midi note: " +	note);
				return;
			}

			pitchOffset += (noteInt-closestNote);
			noteInt=closestNote;
		}

		const ourSound=this.ourSounds.get(noteInt);

		while(this.playingWavs.length>this.polyphonyLimit){
			this.ourApp.ourConsole.logMessage("culling wav. enforcing polyphony limit of: " + this.polyphonyLimit);
			const wavToCull=this.playingWavs.shift();
			wavToCull.actor.destroy();
		}

		const soundActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'sound',
				parentId: parentID,
				transform: {
					app: {
						position: pos
					}
				}
			}
		});

		const volume=(this.volume*(vel/127.0));

		const mediaInstance=soundActor.startSound(ourSound.id, {
			doppler: 0,
			pitch: pitchOffset,
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
				this.ourApp.ourConsole.logMessage("stopping note: " + note);
				ourWave.actor.destroy();
				listOfPlayingWavsToDelete.push(ourWave);		
			}
		}
		for (const ourWave of listOfPlayingWavsToDelete) {
			this.removeFromPlaying(ourWave)
		}
	}
}
