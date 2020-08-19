/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import App from './app';
import MusicModule from './music_module';


export default class HeartBeat extends MusicModule{
	public bpm: number; 
	public isPlaying=true;

	private intervalTime: number;
	private intervalChanged=false;
	private ourTimer: NodeJS.Timeout=null;
	//private beatActors: MRE.Actor[]=[];
	//private beatBackground: MRE.Actor;

	public setBPM(n: number){
		this.bpm=n;
		this.intervalTime=(60.0/this.bpm)*1000.0; //get in ms
		this.intervalChanged=true;
	}

	public stop(){
		this.isPlaying=false;

		const message = [-1,this.intervalTime];
		this.sendData(message, "heartbeat");
	}

	public start(){
		this.isPlaying=true;
	}


	/*public setNumBeats(n: number) {
		if(n<1){
			return;
		}

		const currentBeat = this.numBeats;
		if (n > currentBeat) {
			const numToCreate = n - currentBeat;

			for (let i = 0; i < numToCreate; i++) {
				const beatActor = MRE.Actor.Create(this.ourApp.context, {
					actor: {
						name: 'individualBeat',
						parentId: this.ourGrabber.getGUID(),
						transform: {
							local: {
								position: new MRE.Vector3(-2, 0.05, 0),
								scale: new MRE.Vector3(0.1, 0.1, 0.1)
							}
						},
						appearance: {
							meshId: this.ourApp.boxMesh.id,
							materialId: this.ourApp.blackMat.id
						},
					}
				});
				this.beatActors.push(beatActor);
			}
		}

		if(n<currentBeat){
			const numToHide=currentBeat-n;

			for (let i = this.beatActors.length-numToHide; i < this.beatActors.length; i++) {
				const beatActor=this.beatActors[i];
				beatActor.appearance.enabled=false;
			}
		}

		this.numBeats=n;
		this.updateBeatIndicatorPositions();
	}

	private updateBeatIndicatorPositions(){
		const width=0.1+0.2*this.numBeats;
		this.beatBackground.transform.local.scale.x=width;
		const basePos=-0.5-width/2;
		this.beatBackground.transform.local.position.x=basePos;

		for(let i=0;i<this.beatActors.length;i++){
			const beatActor=this.beatActors[i];
			beatActor.transform.local.position.x=-0.5-width+0.05+i*0.2;				
		}
	}*/

	constructor(protected ourApp: App) {
		super(ourApp);

		this.setBPM(110);
		this.restartSequencer();
	}

	/*public async createAsyncItems(pos: MRE.Vector3, rot = new MRE.Quaternion()) {
		this.createGrabber(pos, rot);

		this.beatBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'heartBackground',
				parentId: this.ourGrabber.getGUID(),
				transform: {
					local: {
						position: new MRE.Vector3(-2, 0, 0),
						scale: new MRE.Vector3(0.3 * this.numBeats, 0.1, 0.2)
					}
				},
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.grayMat.id
				},
			}
		});
		await this.beatBackground.created();

		this.setNumBeats(this.numBeats); //trigger creation of beat indicators
	}*/

	public restartSequencer() {
		if (this.ourTimer) { //clear out the old one (if it exists)
			clearInterval(this.ourTimer);
		}

		this.ourTimer = setInterval(() => {
			if (this.isPlaying) {
				const message = [1,this.intervalTime];
				this.sendData(message, "heartbeat");
			}
			if (this.intervalChanged) {
				this.intervalChanged = false;
				this.restartSequencer();
			}
		}, this.intervalTime);
	}
}
