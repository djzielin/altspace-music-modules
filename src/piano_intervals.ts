/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import Piano from './piano';
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

	constructor(protected ourApp: App, protected ourPiano: Piano) {
	
	}

	private halfWay(a: MRE.Vector3, b: MRE.Vector3): MRE.Vector3 {
		return (a.add(b)).multiplyByFloats(0.5,0.5,0.5);
	}

	private getLength(a: MRE.Vector3, b: MRE.Vector3): number {
		return (a.subtract(b)).length();
	}
	
	public drawInterval(ourInterval: IntervalDisplay, intervalName: string){
		const notePosition1=this.ourPiano.ourKeyColliderPositions.get(ourInterval.note1).clone();
		const notePosition2=this.ourPiano.ourKeyColliderPositions.get(ourInterval.note2).clone();

		notePosition1.z+=0.02; //so we dont cover the note name
		if(this.ourPiano.isAccidental(ourInterval.note1)){
			notePosition1.z-=0.032;
		}
		
		notePosition2.z+=0.02;
		if(this.ourPiano.isAccidental(ourInterval.note2)){
			notePosition2.z-=0.032;
		}
		
		notePosition1.y-=0.01;
		notePosition2.y-=0.01;
		notePosition1.y+=this.ourPiano.halfinch;
		notePosition2.y+=this.ourPiano.halfinch;
		notePosition1.y+=0.001;
		notePosition2.y+=0.001;

		const notePosition1b=notePosition1.clone();
		notePosition1b.y=0;

		const notePosition2b=notePosition2.clone();
		notePosition2b.y=0;

		const halfwayPoint=this.halfWay(notePosition1b,notePosition2b);
		halfwayPoint.y=this.ourPiano.halfinch+0.03;

		const towardsPoint2=(notePosition2b.subtract(notePosition1b)).normalize();

		halfwayPoint.y+=0.06;

		/*if (noteName.includes("#") || noteName.includes("b")) {
			notePosition.x += 0.008;
		} else {
			notePosition.x += 0.016;
		}*/

		const intervalTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'noteName',
				parentId: this.ourPiano.keyboardParent.id,
				transform: {
					local: {
						position: halfwayPoint,
						scale: new MRE.Vector3(this.ourPiano.pianoScale,
							this.ourPiano.pianoScale,
							this.ourPiano.pianoScale),
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
		}); 

		/*const arrowActor3 = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.keyboardParent.id,
				name: "arrow",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.redMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfwayPoint,
						scale: new MRE.Vector3(0.002,0.002,0.002)
					}
				}
			}
		});*/

		halfwayPoint.y-=0.01;

		
		const insetAmount=0.01;
		const linePosition1=halfwayPoint.add(towardsPoint2.multiplyByFloats(-insetAmount,-insetAmount,-insetAmount));
		const linePosition2=halfwayPoint.add(towardsPoint2.multiplyByFloats(insetAmount,insetAmount,insetAmount));

		const halfwayLine1=this.halfWay(linePosition1, notePosition1); 
		const distance1=this.getLength(linePosition1, notePosition1);

		const arrowActor1 = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourPiano.keyboardParent.id,
				name: "arrow",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.grayMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfwayLine1,
						rotation: MRE.Quaternion.LookAt(notePosition1,linePosition1),
						scale: new MRE.Vector3(0.001,0.001,distance1)
					}
				}
			}
		});

		const halfwayLine2 = this.halfWay(notePosition2, linePosition2);
		const distance2 = this.getLength(notePosition2, linePosition2);

		const arrowActor2 = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourPiano.keyboardParent.id,
				name: "arrow",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.grayMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfwayLine2,
						rotation: MRE.Quaternion.LookAt(notePosition2,linePosition2),
						scale: new MRE.Vector3(0.001,0.001,distance2)
					}
				}
			}
		});

		const halfwayLine3=this.halfWay(linePosition1, linePosition2);
		const distance3=this.getLength(linePosition1,linePosition2);

		const arrowActor3 = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourPiano.keyboardParent.id,
				name: "arrow",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.grayMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfwayLine3,
						rotation: MRE.Quaternion.LookAt(linePosition1,linePosition2),
						scale: new MRE.Vector3(0.001,0.001,distance3)
					}
				}
			}
		});

		ourInterval.text=intervalTextActor;
		ourInterval.line1=arrowActor1;	
		ourInterval.line2=arrowActor2;
		ourInterval.line3=arrowActor3;
	}

	private addInterval(note1: number, note2: number){
		let noteDistance = note2 - note1;
		//this.ourApp.ourConsole.logMessage("PIANO: computed note distance: " + noteDistance);
		
		let intervalName = "";

		if (this.ourPiano.intervalMode === IntervalMode.western) {
			while (noteDistance > 12) {
				noteDistance -= 12;
			}
			const doSharpsComputed = this.ourPiano.getSharpsMode();
			if(doSharpsComputed){
				intervalName = this.intervalNamesSharps[noteDistance];
			}else{
				intervalName = this.intervalNamesFlats[noteDistance];
			}
		} else if (this.ourPiano.intervalMode === IntervalMode.numerical) {
			while (noteDistance > 11) {
				noteDistance -= 12;
			}
			intervalName = noteDistance.toString();
		} else if (this.ourPiano.intervalMode === IntervalMode.jazz) {
			while (noteDistance > 24) {
				noteDistance -= 12;
			}
			intervalName = this.jazzNames[noteDistance];
		}

		const ourInterval = {
			line1: null as MRE.Actor,
			line2: null as MRE.Actor,
			line3: null as MRE.Actor,
			text: null as MRE.Actor,
			note1: note1,
			note2: note2
		};

		this.ourApp.ourConsole.logMessage("PIANO: interval name is: " + intervalName);
		this.drawInterval(ourInterval, intervalName);

		this.activeIntervals.push(ourInterval);
	}

	public keyPressed(note: number) {
		if (this.ourPiano.intervalMode > 0) {
			if (this.ourPiano.activeNotes.size > 0) {
				let lowestNote = this.ourPiano.activeNotes.values().next().value;
				let highestNote = lowestNote;

				for (const otherNote of this.ourPiano.activeNotes) {
					if (otherNote !== note) {
						if (otherNote < lowestNote) {
							lowestNote = otherNote;
						}
						if (otherNote > highestNote) {
							highestNote = otherNote;
						}
					}
				}

				if (note < lowestNote || note > highestNote) {
					let note1 = 0;
					let note2 = 0;

					if (note < lowestNote) {
						note1 = note;
						note2 = lowestNote;
					}
					if (note > highestNote) {
						note1 = highestNote;
						note2 = note;
					}
					this.addInterval(note1, note2);

				} else {
					for (const singleInterval of this.activeIntervals) {
						if (note > singleInterval.note1 && note < singleInterval.note2) {
							const oldNote1 = singleInterval.note1;
							const oldNote2 = singleInterval.note2;

							this.destroyInterval(singleInterval);
							const index = this.activeIntervals.indexOf(singleInterval);
							this.activeIntervals.splice(index, 1);

							this.addInterval(oldNote1, note); //now have 2 intervals
							this.addInterval(note, oldNote2);
							break;
						}
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

		if (this.ourPiano.intervalMode > 0) {
			const intervalsToDelete: IntervalDisplay[] = [];

			let outerLeft = -1;
			let outerRight = -1;

			for (const singleInterval of this.activeIntervals) {
				if (singleInterval.note1 === note || singleInterval.note2 === note) {
					if (singleInterval.note1 === note) {
						outerRight = singleInterval.note2;
					}
					if (singleInterval.note2 === note) {
						outerLeft = singleInterval.note1;
					}
					this.destroyInterval(singleInterval);
					intervalsToDelete.push(singleInterval);
				}
			}

			for (const singleInterval of intervalsToDelete) {
				const index = this.activeIntervals.indexOf(singleInterval);
				this.activeIntervals.splice(index, 1);
			}

			if (outerLeft !== -1 && outerRight !== -1) {
				this.addInterval(outerLeft, outerRight);
			}
		}
	}
}
