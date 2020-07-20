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
		
		const consoleMat = this.ourApp.assets.createMaterial('consolemat', {
			color: new MRE.Color3(0.5, 0.5, 0.5) //TODO move material over to app
		});
		await consoleMat.created;

		this.guiBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiGrabber.getGUID(),
				name: "consoleBackground",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: consoleMat.id
				},
				transform: {
					local: {
						position: { x: -0.75, y: 0.05, z: -0.25 },
						scale: new MRE.Vector3(1.05, 0.1, 1.5)
					}
				}
			}
		});
		await this.guiBackground.created();

		const guiTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiGrabber.getGUID(),
				name: 'consoleText',
				text: {
					contents: name,
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(-0.75, 0.101, 0.5),
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
		this.ourApp.ourConsole.logMessage("creating spawner gui");

		await this.createBackground(pos, name);

		const authButton = new Button(this.ourApp);
		await authButton.createAsync(new MRE.Vector3(-0.75, 0.025, 0.3),
			this.guiGrabber.getGUID(), "All Users", "Auth Only",
			this.ourPiano.ourInteractionAuth === 1, this.setAuthAllUsers.bind(this));

		const scaleSelector = new PlusMinus(this.ourApp);
		await scaleSelector.createAsync(new MRE.Vector3(-0.5 - 0.75, 0.1, 0.15),
			this.guiGrabber.getGUID(), "scale",
			this.ourPiano.pianoScale, 0.1, this.setScale.bind(this));

		const lowestKeySelector = new PlusMinus(this.ourApp);
		await lowestKeySelector.createAsync(new MRE.Vector3(-0.5 - 0.75, 0.1, 0.0),
			this.guiGrabber.getGUID(), "L key",
			this.ourPiano.keyLowest, 1, this.setLowestKey.bind(this));

		const highestKeySelector = new PlusMinus(this.ourApp);
		await highestKeySelector.createAsync(new MRE.Vector3(-0.5 - 0.75, 0.1, -0.15),
			this.guiGrabber.getGUID(), "H key",
			this.ourPiano.keyHighest, 1, this.setHighestKey.bind(this));

		this.resetButton = new Button(this.ourApp);
		await this.resetButton.createAsync(new MRE.Vector3(-0.75, 0.025, -0.3),
			this.guiGrabber.getGUID(), "Resetting", "Reset",
			false, this.doReset.bind(this));

	}
}
