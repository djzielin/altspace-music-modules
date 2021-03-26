/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import App from '../app';
import GrabButton from '../gui/grabbutton';
//import Button from '../gui/button';
import ButtonWithParameter from '../gui/button_with_parameter';
//import MusicModule from '../backend/music_module';

import Piano from '../piano'
import Spawner from '../spawner'
import Staff from '../staff';
import Geo from '../geo';
import Spiral from '../spiral';

//import Se02 from '../se02';

import MidiReceiver from '../utility_modules/midi_receiver'
import WavPlayer from '../utility_modules/wavplayer';
//import Sequencer from '../utility_modules/sequencer';
//import HeartBeat from '../utility_modules/heartbeat';
import MidiPlayer from '../utility_modules/midi_player';

//import GuiPanel from '../gui/gui_panel';
//import GrabButton from '../gui/grabbutton';
//import Button from '../gui/button';

import MidiReceiverGui from '../gui/midi_receiver_gui';
//import HeartBeatGui from '../gui/heartbeat_gui';
import GeoGui from '../gui/geo_gui';
//import SequencerGui from '../gui/sequencer_gui';
import WavPlayerGui from '../gui/wavplayer_gui';
import SpawnerGui from '../gui/spawner_gui';
import PianoGui from '../gui/piano_gui';
import StaffGui from '../gui/staff_gui';
import MidiPlayerGui from '../gui/midi_player_gui';

export default class Palette {
	protected guiBackground: MRE.Actor = null;
	protected guiBackground2: MRE.Actor = null;

	protected guiGrabber: GrabButton = null;
	protected backgroundHeight = 1.75;

	private utilityModules: string[] = [
		"Midi Receiver",
		"Midi Player",
		"Wav Player",
		""//,
		//"Midi Sender (soon)"//,
		//"Sequencer",
		//"Heart Beat"
	];

	private instrumentModules: string[] = [
		"Piano",
		"Staff",
		"Spawner",
		"Geo"
		//"Spiral"
		//"Tablature"
	];

	private presetLabels: string[] = [
		"Piano",
		"Spawner",
		"Geo",
		//"Spiral",
		"",
		"CLEAR ALL"];

	private synthModules: string[] = []; 
	//"SE-02 "

	constructor(protected ourApp: App) {
	}

	public getBackgroundPos(){
		return this.guiBackground.transform.local.position;
	}

	public hide() {
		this.guiGrabber.hide();
	}

	public show() {
		this.guiGrabber.show();
	}

	public hideGrabber(){
		this.guiGrabber.hideOnlyGrabber();
	}

	public showGrabber(){
		this.guiGrabber.showOnlyGrabber();
	}

	public selectModule(b: boolean, param: any){
		const moduleName=param as string;

		this.spawnModule(moduleName);
	}

	public selectPreset(b: boolean, param: any){
		const presetName=param as string;

		this.ourApp.ourPresets.spawnPreset(presetName).then( ()=>{
			this.ourApp.ourConsole.logMessage("new preset loaded!: " + presetName);
		});
	}
	
	public async createBackground(pos: MRE.Vector3, rot: MRE.Quaternion, name: string, bgHeight: number) {
		this.backgroundHeight=bgHeight;
		this.guiGrabber=new GrabButton(this.ourApp);
		this.guiGrabber.create(pos,rot);
		
		const backGroundMesh = this.ourApp.assets.createBoxMesh('boxMesh', 3.0, 0.1, this.backgroundHeight);
		const backGroundMesh2 = this.ourApp.assets.createBoxMesh('boxMesh', 1.0, 0.1, this.backgroundHeight);


		this.guiBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiGrabber.getGUID(),
				name: "paletteBackground",
				appearance: {
					meshId: backGroundMesh.id,
					materialId: this.ourApp.grayMat.id
				},
				transform: {
					local: {
						position: { x: -3, y:0.0, z: -0.25 },
						rotation: { x: 0, y: 0, z:0}
					}
				}
			}
		});

		this.guiBackground2 = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiGrabber.getGUID(),
				name: "presetBackground",
				appearance: {
					meshId: backGroundMesh2.id,
					materialId: this.ourApp.grayMat.id
				},
				transform: {
					local: {
						position: { x: -.75, y:0.0, z: -0.25 },
						rotation: { x: 0, y: 0, z:0}
					}
				}
			}
		});

		await this.guiBackground2.created();

		const guiTextActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground.id,
				name: 'titleText',
				text: {
					contents: name,
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0, 0.051, this.backgroundHeight*0.5-0.05),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await guiTextActor.created();

		const utilityLabel = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground.id,
				name: 'titleText',
				text: {
					contents: "Utility",
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(-1.0, 0.051, this.backgroundHeight * 0.5 - 0.3),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await utilityLabel.created();

		const instrumentLabel = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground.id,
				name: 'titleText',
				text: {
					contents: "Instruments",
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0, 0.051, this.backgroundHeight * 0.5 - 0.3),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await instrumentLabel.created();

		/*const synthLabel = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground.id,
				name: 'titleText',
				text: {
					contents: "Hardware",
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(1.0, 0.051, this.backgroundHeight * 0.5 - 0.3),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await synthLabel.created();
		*/

		let zPos = this.backgroundHeight * 0.5 - 0.3 - 0.3;

		for (const s of this.utilityModules) {
			if (s !== "") {
				const selectUtility = new ButtonWithParameter(this.ourApp, s);
				await selectUtility.createAsync(new MRE.Vector3(-1.0, 0.051, zPos),
					this.guiBackground.id, s, s,
					false, this.selectModule.bind(this));
				selectUtility.doVisualUpdates = false;
			}
			zPos -= 0.15;
		}

		zPos = this.backgroundHeight * 0.5 - 0.3 - 0.3;

		for (const s of this.instrumentModules) {
			if (s !== "") {
				const selectInstrument = new ButtonWithParameter(this.ourApp, s);
				await selectInstrument.createAsync(new MRE.Vector3(0.0, 0.051, zPos),
					this.guiBackground.id, s, s,
					false, this.selectModule.bind(this));
				selectInstrument.doVisualUpdates = false;
			}
			zPos -= 0.15;
		}

		zPos = this.backgroundHeight * 0.5 - 0.3 - 0.3;

		for (const s of this.synthModules) {
			if (s !== "") {
				const selectSynth = new ButtonWithParameter(this.ourApp, s);
				await selectSynth.createAsync(new MRE.Vector3(1.0, 0.051, zPos),
					this.guiBackground.id, s, s,
					false, this.selectModule.bind(this));
				selectSynth.doVisualUpdates = false;
			}
			zPos -= 0.15;
		}

		const presetLabel = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.guiBackground2.id,
				name: 'titleText',
				text: {
					contents: "Presets",
					height: 2.0 / 25,
					anchor: MRE.TextAnchorLocation.TopCenter,
					color: new MRE.Color3(1, 1, 1)
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0, 0.051, this.backgroundHeight * 0.5 - 0.3),
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await presetLabel.created();

		zPos = this.backgroundHeight * 0.5 - 0.3 - 0.3;
		for (const s of this.presetLabels) {
			if (s !== "") {
				const sPreset=s+" Preset";
				const selectPreset = new ButtonWithParameter(this.ourApp, s);
				await selectPreset.createAsync(new MRE.Vector3(0.0, 0.051, zPos),
					this.guiBackground2.id, sPreset, sPreset,
					false, this.selectPreset.bind(this));
				selectPreset.doVisualUpdates = false;
			}
			zPos -= 0.15;
		}
	}

	//TODO: do something better about placing these, so it doesn't overlap (especially GUI's)
	public spawnModule(name: string) {
		let moduleNum=0;
		if(this.ourApp.moduleCounts.has(name)){
			moduleNum=this.ourApp.moduleCounts.get(name);
		}

		let displayName=name;
		if(moduleNum>0){
			displayName=displayName+" "+(moduleNum+1).toString();
		}

		if (name === "Piano") {
			const ourPiano = new Piano(this.ourApp, displayName);
			ourPiano.createAllKeys(new MRE.Vector3(2, 1, -1),
				MRE.Quaternion.FromEulerAngles(-30 * Math.PI / 180, 0, 0)).then(() => {
				this.ourApp.allModules.push(ourPiano);

				const ourPianoGui = new PianoGui(this.ourApp, ourPiano);
				ourPianoGui.createAsync(new MRE.Vector3(0, 0.1, -2), displayName).then(() => {
					this.ourApp.allGUIs.push(ourPianoGui);
				});
			});
		}

		if (name === "Staff") {
			const ourStaff = new Staff(this.ourApp, displayName);
			ourStaff.createAsyncItems(new MRE.Vector3(2, 2, -1),
				MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 0, 0)).then(() => {
				this.ourApp.allModules.push(ourStaff);

				const ourStaffGui = new StaffGui(this.ourApp, ourStaff);
				ourStaffGui.createAsync(new MRE.Vector3(0, 0.1, -2), displayName).then(() => {
					this.ourApp.allGUIs.push(ourStaffGui);
				});
			});
		}

		if (name === "Wav Player") {
			const ourWavPlayer = new WavPlayer(this.ourApp, displayName);
			ourWavPlayer.loadAllSounds("piano", 36, 84).then(() => {
				this.ourApp.allModules.push(ourWavPlayer);

				const ourWavPlayerGui = new WavPlayerGui(this.ourApp, ourWavPlayer);
				ourWavPlayerGui.createAsync(new MRE.Vector3(0, 0.1, -2), displayName).then(() => {
					this.ourApp.allGUIs.push(ourWavPlayerGui);
				});
			});
		}

		if (name === "Midi Receiver") {
			const ourMidiReceiver = new MidiReceiver(this.ourApp, 3902, displayName);
			this.ourApp.allModules.push(ourMidiReceiver);

			const ourMidiReceiverGui = new MidiReceiverGui(this.ourApp, ourMidiReceiver);
			ourMidiReceiverGui.createAsync(new MRE.Vector3(0, 0.1, -2), displayName).then(() => {
				this.ourApp.allGUIs.push(ourMidiReceiverGui);
			});
		}

		if (name === "Midi Player") {
			const ourMidiPlayer = new MidiPlayer(this.ourApp, displayName);

			const ourMidiPlayerGui = new MidiPlayerGui(this.ourApp, ourMidiPlayer);
			ourMidiPlayerGui.createAsync(new MRE.Vector3(0, 0.1, -2), displayName).then(() => {
				this.ourApp.allGUIs.push(ourMidiPlayerGui);
			});
		}

		if (name === "Spawner") {
			const ourSpawner = new Spawner(this.ourApp, displayName);
			ourSpawner.createAsyncItems(new MRE.Vector3(2, 1, 0),
				MRE.Quaternion.FromEulerAngles(0.0 * Math.PI / 180, 0, 0)).then(() => {

				this.ourApp.allModules.push(ourSpawner);

				const ourSpawnerGui = new SpawnerGui(this.ourApp, ourSpawner);
				ourSpawnerGui.createAsync(new MRE.Vector3(0, 0.1, -2), displayName).then(() => {
					this.ourApp.allGUIs.push(ourSpawnerGui);
				});
			});
		}
		if (name === "Geo") {
			let lowNote = 36;
			let highNote = 84;

			//TODO, figure out better way to communicate how many samples available to geo 
			for (const module of this.ourApp.allModules) {
				if (module.moduleType === "WavPlayer") {
					this.ourApp.ourConsole.logMessage("Found the WavPlayer!");
					lowNote = (module as WavPlayer).lowestNote;
					highNote = (module as WavPlayer).highestNote;
				}
			}

			const ourGeo = new Geo(this.ourApp, "Geo");

			ourGeo.createAllGeos(new MRE.Vector3(0, 0, 0),
				MRE.Quaternion.Identity(),
				lowNote,
				highNote).then(() => {

				this.ourApp.allModules.push(ourGeo);

				const ourGeoGui = new GeoGui(this.ourApp, ourGeo);

				ourGeoGui.createAsync(new MRE.Vector3(0, 0.1, -2), "Geo").then(() => {
					this.ourApp.allGUIs.push(ourGeoGui);
				});
			});
		}
			
		if (name === "Spiral") {
			/*const ourSpawner = new Spawner(this.ourApp, displayName);
			ourSpawner.createAsyncItems(new MRE.Vector3(2, 1, 0),
				MRE.Quaternion.FromEulerAngles(0.0 * Math.PI / 180, 0, 0)).then(() => {

				this.ourApp.allModules.push(ourSpawner);

				const ourSpawnerGui = new SpawnerGui(this.ourApp, ourSpawner);
				ourSpawnerGui.createAsync(new MRE.Vector3(0, 0.1, -2), displayName).then(() => {
					this.ourApp.allGUIs.push(ourSpawnerGui);
				});
			});*/
		}

		if (this.ourApp.moduleCounts.has(name)) {
			const currentCount = this.ourApp.moduleCounts.get(name);
			this.ourApp.moduleCounts.set(name,currentCount+1);
		} else{
			this.ourApp.moduleCounts.set(name,1);
		}
	}
}
