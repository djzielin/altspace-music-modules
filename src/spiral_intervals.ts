/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import Spiral from './spiral';
import App from './app';

enum IntervalMode {
	none = 0,
	western = 1,
	jazz = 2,
	numerical = 3
}

  interface IntervalDisplay{
	line1: MRE.Actor;
	line2: MRE.Actor;
	line3: MRE.Actor;
	text: MRE.Actor;
	note1: number;
	note2: number;
}

export default class PianoIntervals{
	private intervalNamesSharps = ["P1","m2","M2","m3","M3","P4","A4","P5","m6","M6","m7","M7","P8"];
	private intervalNamesFlats = ["P1","m2","M2","m3","M3","P4","d5","P5","m6","M6","m7","M7","P8"];
	private jazzNames= ["1","♭2","2","min3","maj3","4","♭5","5","♯5","6","7","maj7","oct",
		"♭9","9","♯9","10","11","♯11","12","♭13","13","7","maj7","2oct"];

	private activeIntervals: IntervalDisplay[]=[];

	constructor(protected ourApp: App, protected ourSpiral: Spiral) {
	
	}

	private halfWay(a: MRE.Vector3, b: MRE.Vector3): MRE.Vector3 {
		return (a.add(b)).multiplyByFloats(0.5,0.5,0.5);
	}

	private getLength(a: MRE.Vector3, b: MRE.Vector3): number {
		return (a.subtract(b)).length();
	}
	
	public drawInterval(ourInterval: IntervalDisplay, intervalName: string){
		


		const notePosition1=this.ourSpiral.keyLocations.get(ourInterval.note1).clone();
		const notePosition2=this.ourSpiral.keyLocations.get(ourInterval.note2).clone();
	
		notePosition1.y-=0.01;
		notePosition2.y-=0.01;

		const halfwayPoint=this.halfWay(notePosition1,notePosition2);
		const distance=this.getLength(notePosition1, notePosition2);
		this.ourApp.ourConsole.logMessage("SPIRAL INTERVAL DRAWING LINE: distance: " + distance);

		/*const intervalTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'noteName',
				parentId: this.ourSpiral.keyboardParent.id,
				transform: {
					local: {
						position: halfwayPoint,
						scale: new MRE.Vector3(this.ourSpiral.pianoScale,
							this.ourSpiral.pianoScale,
							this.ourSpiral.pianoScale),
						rotation: MRE.Quaternion.LookAt(notePosition1b,notePosition2b).multiply(
							MRE.Quaternion.FromEulerAngles(0, -90 * Math.PI / 180, 0)),
					}
				},
				text: {
					contents: intervalName,
					color: { r: 0.25, g: 0.25, b: 0.25 },
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					height: 0.005
				}
			}
		}); */
		
		const arrowActor1 = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourSpiral.keyboardParent.id,
				name: "arrow",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.grayMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfwayPoint,
						rotation: MRE.Quaternion.LookAt(notePosition1,notePosition2),
						scale: new MRE.Vector3(0.01,0.01,distance)
					}
				}
			}
		});

		//ourInterval.text=intervalTextActor;
		ourInterval.line1=arrowActor1;	
		//ourInterval.line2=arrowActor2;
		//ourInterval.line3=arrowActor3;
	}

	private addInterval(note1: number, note2: number){
		//let noteDistance = note2 - note1;
		//this.ourApp.ourConsole.logMessage("PIANO: computed note distance: " + noteDistance);
		
		let intervalName = "";

		/*if (this.ourSpiral.intervalMode === IntervalMode.western) {
			while (noteDistance > 12) {
				noteDistance -= 12;
			}
			const doSharpsComputed = this.ourSpiral.getSharpsMode();
			if(doSharpsComputed){
				intervalName = this.intervalNamesSharps[noteDistance];
			}else{
				intervalName = this.intervalNamesFlats[noteDistance];
			}
		} else if (this.ourSpiral.intervalMode === IntervalMode.numerical) {
			while (noteDistance > 11) {
				noteDistance -= 12;
			}
			intervalName = noteDistance.toString();
		} else if (this.ourSpiral.intervalMode === IntervalMode.jazz) {
			while (noteDistance > 24) {
				noteDistance -= 12;
			}
			intervalName = this.jazzNames[noteDistance];
		}*/

		const ourInterval = {
			line1: null as MRE.Actor,
			line2: null as MRE.Actor,
			line3: null as MRE.Actor,
			text: null as MRE.Actor,
			note1: note1,
			note2: note2
		};

		//this.ourApp.ourConsole.logMessage("PIANO: interval name is: " + intervalName);
		this.drawInterval(ourInterval, intervalName);

		this.activeIntervals.push(ourInterval);
	}

	public keyPressed(note: number) {
		this.ourApp.ourConsole.logMessage("Spiral Interval received NOTE ON: " + note);

		if (this.ourSpiral.intervalMode > 0) {
			if (this.ourSpiral.activeNotes.size > 0) {

				for (const otherNote of this.ourSpiral.activeNotes) {
					if (otherNote !== note) {
						this.addInterval(note, otherNote);
					}
				}
			}
		}

	}

	private destroyInterval(singleInterval: IntervalDisplay) {
		if (singleInterval.line1) {
			singleInterval.line1.destroy();
		}
		if (singleInterval.line2) {
			singleInterval.line2.destroy();
		}
		if (singleInterval.line3) {
			singleInterval.line3.destroy();
		}
		if (singleInterval.text) {
			singleInterval.text.destroy();
		}
	}

	public keyReleased(note: number) {

		if (this.ourSpiral.intervalMode > 0) {
			const intervalsToDelete: IntervalDisplay[] = [];

			for (const singleInterval of this.activeIntervals) {
				if (singleInterval.note1 === note || singleInterval.note2 === note) {
					this.destroyInterval(singleInterval);
					intervalsToDelete.push(singleInterval);
				}
			}

			for (const singleInterval of intervalsToDelete) {
				const index = this.activeIntervals.indexOf(singleInterval);
				this.activeIntervals.splice(index, 1);
			}
		}
	}
}
