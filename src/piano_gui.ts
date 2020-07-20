/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import PlusMinus from './plusminus';
import Button from './button';
import Piano from './piano';
import GrabButton from './grabbutton';

export default class PianoGui {
	//private guiParent: MRE.Actor=null;
	private guiBackground: MRE.Actor=null;
	private guiGrabber: GrabButton=null;
	private resetButton: Button;

	constructor(private ourApp: App, private ourPiano: Piano) {
		
	}

	private async createBackground(pos: MRE.Vector3, name: string) {

		this.guiGrabber=new GrabButton(this.ourApp);
		this.guiGrabber.create(pos);
		
		const backGroundMesh = this.ourApp.assets.createBoxMesh('boxMesh', 1.1, 0.1, 1.5);


		this.guiBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiGrabber.getGUID(),
				name: "consoleBackground",
				appearance: {
					meshId: backGroundMesh.id,
					materialId: this.ourApp.grayMat.id
				},
				transform: {
					local: {
						position: { x: -0.85, y:0.0, z: -0.25 },
					}
				}
			}
		});
		await this.guiBackground.created();

		const guiTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground.id,
				name: 'consoleText',
				text: {
					contents: name,
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0, 0.051, 0.7),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await guiTextActor.created();
	}

	public setAuthAllUsers(b: boolean): void {
		this.ourPiano.ourInteractionAuth=(b===true) ? 1:0;
	}
	public setScale(n: number): void {
		if(n>0){ //sanity check
			this.ourPiano.setScale(n);
		}
	}
	public setLowestKey(n: number): void {
		if(n>0){ //sanity check
			this.ourPiano.keyLowest=n;
		}
	}
	public setHighestKey(n: number): void {
		if(n>0){ //sanity check
			this.ourPiano.keyHighest=n;
		}
	}

	public doReset(b: boolean): void {
		const pos = this.ourPiano.pianoGrabber.getPos();
		const rot = this.ourPiano.pianoGrabber.getRot();

		this.ourPiano.destroyKeys();
		this.ourPiano.createAllKeys(pos, rot).then(() => {
			this.ourApp.ourConsole.logMessage("piano reset complete!");
			this.resetButton.setValue(false);
		});
	}

	public async createAsync(pos: MRE.Vector3, name: string) {
		this.ourApp.ourConsole.logMessage("creating piano gui");

		await this.createBackground(pos, name);

		let zPos=0.45;

		const authButton = new Button(this.ourApp);
		await authButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "All Users", "Auth Only",
			this.ourPiano.ourInteractionAuth === 1, this.setAuthAllUsers.bind(this));
		zPos -= 0.15;

		this.resetButton = new Button(this.ourApp);
		await this.resetButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "Relayout", "Relayout",
			false, this.doReset.bind(this));
		zPos -= 0.15;

		const scaleSelector = new PlusMinus(this.ourApp);
		await scaleSelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "scale",
			this.ourPiano.pianoScale, 0.1, this.setScale.bind(this));
		zPos -= 0.15;

		const lowestKeySelector = new PlusMinus(this.ourApp);
		await lowestKeySelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "L key",
			this.ourPiano.keyLowest, 1, this.setLowestKey.bind(this));
		zPos -= 0.15;

		const highestKeySelector = new PlusMinus(this.ourApp);
		await highestKeySelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "H key",
			this.ourPiano.keyHighest, 1, this.setHighestKey.bind(this));
		zPos -= 0.15;
	}
}
