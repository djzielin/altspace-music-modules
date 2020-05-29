/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';

export default class Console {
	private consoleTextActor: MRE.Actor = null;
	private consoleText: string[] = [];
	private consoleOn = true;
	private consoleParent: MRE.Actor = null;

	constructor(private ourApp: App) {
		for (let i = 0; i < 25; i++) {
			this.consoleText.push("");
		}
	}

	private async createConsole() {
		this.consoleParent = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: "parent",
				transform: {
					local: {
						position: { x: 1.5, y: 0, z: 0 },
						scale: new MRE.Vector3(0.5, 0.5, 0.5)
					}
				}
			}
		});
		await this.consoleParent.created();

		const consoleMat = this.ourApp.assets.createMaterial('consolemat', {
			color: new MRE.Color3(0, 0, 0)
		});
		await consoleMat.created;

		const consoleBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.consoleParent.id,
				name: "consoleBackground",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: consoleMat.id
				},
				transform: {
					local: {
						position: { x: 0, y: 0.05, z: 0 },
						scale: new MRE.Vector3(4.4, 0.1, 2.5)
					}
				}
			}
		});
		await consoleBackground.created();

		this.consoleTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.consoleParent.id,
				name: 'consoleText',
				text: {
					contents: "test",
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopLeft,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: { x: -(4.4 / 2) + 0.05, y: 0.101, z: (2.5 / 2) - 0.05 },
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await this.consoleTextActor.created();

		this.logMessage("log initialized");
	}

	private async createConsoleToggleButton() {

		const button = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				//parentId: menu.id,
				name: "consoleToggleButton",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.greenMat.id
				},
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: {
						position: { x: 0, y: 0.05, z: 0.3 },
						scale: new MRE.Vector3(0.75, 0.1, 0.1)
					}
				}
			}
		});

		await button.created();

		const buttonLabel = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'label',
				text: {
					contents: "Console is On",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 0.101, z: 0.3 },
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await buttonLabel.created();

		// Set a click handler on the button.
		button.setBehavior(MRE.ButtonBehavior)
			.onClick(() => {
				if (this.consoleOn) {
					this.consoleOn = false;
					if (this.consoleParent) {
						this.consoleParent.appearance.enabled = false;
						button.appearance.material = this.ourApp.redMat;
					}
					buttonLabel.text.contents = "Console is Off";
				} else {
					this.consoleOn = true;
					if (this.consoleParent) {
						this.consoleParent.appearance.enabled = true;
						button.appearance.material = this.ourApp.greenMat;
					}
					buttonLabel.text.contents = "Console is On";
				}
			});
	}

	public async createAsyncItems() {
		await this.createConsole();
		await this.createConsoleToggleButton();
	}

	public logMessage(message: string) { 
		MRE.log.info("app", message);

		this.consoleText.push(message);
		this.consoleText.shift();

		if (this.consoleTextActor) {
			let combinedText = "";

			for (const s of this.consoleText) {
				combinedText += s.substr(0, 80);
				combinedText += "\n";
			}
			this.consoleTextActor.text.contents = combinedText;
		}
	}
}
