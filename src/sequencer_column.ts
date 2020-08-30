/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import GrabButton from './grabbutton';
import Sequencer from './sequencer';

enum AuthType {
	Moderators = 0,
	All = 1,
	SpecificUser = 2
}

enum NoteOffMode {
	nextNote = 0,
	nextCell = 1,
	anyNoteOn = 2
}

enum NoteBlankColors {
	gray = 0,
	piano = 1,
	splitbyFour=2
}

export default class SequencerColumn {
	public ourInteractionAuth=AuthType.All;
	public authorizedUser: MRE.User;
	
	public showBackground=true;

	public sphereMesh: MRE.Mesh;
	public boxMesh: MRE.Mesh;
	public cylinderMesh: MRE.Mesh;


	private seGrabber: GrabButton=null;
	public seBackground: MRE.Actor=null;

	private ourCells: MRE.Actor[]=[];

	private activeCells: boolean[]=[];
	private columnParent: MRE.Actor;

	private accidentals = [false, true, false, true, false, false, true, false, true, false, true, false];
	
	constructor(protected ourApp: App, private ourSequencer: Sequencer, private columnNum: number) {
	
	}

	public async createAsyncItems(height: number, startPos: MRE.Vector3, incAmount: MRE.Vector3, parentID: MRE.Guid) {
		this.columnParent = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'columnParent',
				parentId: parentID,
				transform: {
					local: {
						position: startPos,
					}
				}
			}
		});
		await this.columnParent.created();

		for (let i = 0; i < height; i++) {
			const singleButton = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					parentId: this.columnParent.id,
					name: "SEQ_button",
					appearance: {
						meshId: this.ourApp.boxMesh.id,
						materialId: this.getBlankMaterialID(i)
					},
					collider: { geometry: { shape: MRE.ColliderType.Auto } },
					transform: {
						local: {
							position: incAmount.multiplyByFloats(i, 0, i),
							scale: new MRE.Vector3(0.1, 0.1, 0.1)
						}
					}
				}
			});

			singleButton.created();
			this.ourCells.push(singleButton);
			this.activeCells.push(false);

			singleButton.setBehavior(MRE.ButtonBehavior)
				.onButton("released", (user: MRE.User) => {
					if (this.ourSequencer.isAuthorized(user)) {
						if (this.activeCells[i]) {
							this.ourCells[i].appearance.materialId = this.getBlankMaterialID(i);
							this.activeCells[i]=false;

						} else {
							this.ourCells[i].appearance.materialId = this.ourApp.greenMat.id;
							this.activeCells[i] = true;
						}
						//TODO: send values to sequencer
					}
				});

			//TODO: add physics collision to activate as well. 
		}
	}

	public resetHeight() {
		this.columnParent.transform.local.position.y = 0.0;

		for (let i = 0; i < this.ourCells.length; i++) {
			const ourCell = this.ourCells[i];
			if (ourCell.transform.local.position.y > 0.0) {
				ourCell.transform.local.position.y = 0.0;
			}
		}
	}	
	
	public computeMidiNote(i: number): number{
		const note=((this.ourCells.length-1)-i)+this.ourSequencer.baseNote;
		return note;
	}

	public getBlankMaterialID(i: number){
		if(this.ourSequencer.noteBlankColors===NoteBlankColors.gray){
			return this.ourApp.grayMat.id;
		}
		if(this.ourSequencer.noteBlankColors===NoteBlankColors.piano){
			const midiNote=this.computeMidiNote(i);
			const pitchClass=midiNote % 12;
			const isAccidental: boolean=this.accidentals[pitchClass];

			if(isAccidental){
				return this.ourApp.grayMat.id;
			} else{
				return this.ourApp.lightgrayMat.id;
			}
		}
		if(this.ourSequencer.noteBlankColors===NoteBlankColors.splitbyFour){
			const index=Math.floor(this.columnNum/4) % 2
			if(index===0){
				return this.ourApp.darkgrayMat.id;
			} else{
				return this.ourApp.grayRedMat.id;
			}
		}
	}

	public updateBlankColor() {
		for (let i = 0; i < this.ourCells.length; i++) {
			if (!this.activeCells[i]) {
				this.ourCells[i].appearance.materialId = this.getBlankMaterialID(i);
			}
		}
	}

	public bumpHeight() {
		if(this.ourSequencer.noteOffMode===NoteOffMode.nextCell){
			this.ourSequencer.turnOffActiveNotes();
		}

		let didNoteOff=false;

		this.columnParent.transform.local.position.y=0.025;

		for (let i = 0; i < this.ourCells.length; i++) {
			const ourCell = this.ourCells[i];
			if (this.activeCells[i]){
				if(this.ourSequencer.noteOffMode===NoteOffMode.anyNoteOn && !didNoteOff){
					this.ourSequencer.turnOffActiveNotes();
					didNoteOff=true;
				}
				ourCell.transform.local.position.y=0.075;
				const note=this.computeMidiNote(i);

				if(this.ourSequencer.noteOffMode===NoteOffMode.nextNote){
					this.ourSequencer.noteOff(note);
				}

				this.ourSequencer.noteOn(note,100);
				this.ourSequencer.activeNotes.push(note);
			} 
		}		
	}
}
