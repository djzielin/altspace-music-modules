/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import GrabButton from './grabbutton';
import Sequencer from './sequencer';

enum AuthType {
	Moderators=0,
	All=1,
	SpecificUser=2
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

	constructor(protected ourApp: App, private ourSequencer: Sequencer) {

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
						materialId: this.ourApp.grayMat.id
					},
					collider: { geometry: { shape: MRE.ColliderType.Auto } },
					transform: {
						local: {
							position: incAmount.multiplyByFloats(i, i, i),
							scale: new MRE.Vector3(0.1, 0.1, 0.1)
						}
					}
				}
			});

			await singleButton.created();
			this.ourCells.push(singleButton);
			this.activeCells.push(false);

			singleButton.setBehavior(MRE.ButtonBehavior)
				.onButton("released", (user: MRE.User) => {
					if (this.ourSequencer.isAuthorized(user)) {
						if (this.activeCells[i]) {
							this.ourCells[i].appearance.materialId = this.ourApp.grayMat.id;
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

	public bumpHeight() {
		let didNoteOff=false;

		this.columnParent.transform.local.position.y=0.025;

		for (let i = 0; i < this.ourCells.length; i++) {
			const ourCell = this.ourCells[i];
			if (this.activeCells[i]){
				if(!didNoteOff){
					this.ourSequencer.turnOffActiveNotes();
					didNoteOff=true;
				}
				ourCell.transform.local.position.y=0.075;
				const note=((this.ourCells.length-1)-i)+this.ourSequencer.baseNote;
				this.ourSequencer.noteOn(note,100);
				this.ourSequencer.activeNotes.push(note);
			} 
		}		
	}
}
