/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import MusicModule from './backend/music_module';
import Console from './backend/console';
import Users from './backend/users';
import Patcher from './backend/patcher';
import PatchPoint from './backend/patch_point';
import Palette from './backend/palette';
import Presets from './presets';
import GuiPanel from './gui/gui_panel';
import GrabButton from './gui/grabbutton';
import Button from './gui/button';

export default class App {
	public assets: MRE.AssetContainer = null;
	public ourPatcher: Patcher = null;
	public ourPalette: Palette = null;
	public ourPresets: Presets = null;

	public showGUIs = true;
	public showGrabbers = true;
	
	public allGUIs: GuiPanel[] = [];
	public allModules: MusicModule[] = [];
	
	public ourConsole: Console = null;
	public menuGrabber: GrabButton = null;
	public showGUIsButton: Button = null;
	public showGrabbersButton: Button = null;
	public showPaletteButton: Button = null;

	public boxMesh: MRE.Mesh;
	public sphereMesh: MRE.Mesh;
	
	public redMat: MRE.Material;
	public greenMat: MRE.Material;
	public whiteMat: MRE.Material;
	public blackMat: MRE.Material;
	public almostBlackMat: MRE.Material;
	public grayMat: MRE.Material;
	public darkgrayMat: MRE.Material;
	public grayRedMat: MRE.Material;
	public lightgrayMat: MRE.Material;
	public transparentBlackMat: MRE.Material;
	public transparentWhiteMat: MRE.Material;

	public handMesh: MRE.Mesh = null;
	public handTexture: MRE.Texture = null;
	public handMaterial: MRE.Material = null;

	public ourUsers: Users;
	public moduleCounts: Map<string,number>=new Map();

	constructor(public context: MRE.Context, public baseUrl: string,
		public baseDir: string, public instrumentType: string) {
			
		this.ourConsole = new Console(this);
		this.ourPatcher = new Patcher(this);
		this.ourUsers = new Users(this);
		this.ourPresets = new Presets(this);

		this.assets = new MRE.AssetContainer(context);

		this.context.onUserLeft(user => this.ourUsers.userLeft(user));

		//const isGeo = (instrumentType === "geo");
		//const createHands = !isGeo;
		//const createChest = isGeo;

		this.context.onUserJoined(user => {
			this.ourUsers.userJoined(user,true);
		});

		this.context.onStarted(() => this.started());
		this.context.onStopped(() => this.stopped());
	}

	private async createMeshAndMaterial(){
		this.redMat = this.assets.createMaterial('redmat', {
			color: new MRE.Color4(1, 0, 0)
		});
		await this.redMat.created;

		this.greenMat = this.assets.createMaterial('greenMat', {
			color: new MRE.Color4(0, 1, 0)
		});
		await this.greenMat.created;

		this.blackMat = this.assets.createMaterial('blackMat', {
			color: new MRE.Color4(0, 0, 0)
		});
		await this.blackMat.created;

		this.almostBlackMat = this.assets.createMaterial('blackMat', {
			color: new MRE.Color4(0.2, 0.2, 0.2)
		});
		await this.almostBlackMat.created;

		this.whiteMat = this.assets.createMaterial('whiteMat', {
			color: new MRE.Color4(1, 1, 1)
		});
		await this.whiteMat.created;

		this.transparentBlackMat = this.assets.createMaterial('transblackMat', {
			color: new MRE.Color4(0, 0, 0,0.5),
			alphaMode: MRE.AlphaMode.Blend
		});
		await this.transparentBlackMat.created;

		this.transparentWhiteMat = this.assets.createMaterial('transwhiteMat', {
			color: new MRE.Color4(1, 1, 1,0.5),
			alphaMode: MRE.AlphaMode.Blend
		});
		await this.transparentWhiteMat.created;

		this.grayMat = this.assets.createMaterial('grayMat', {
			color: new MRE.Color4(0.5, 0.5, 0.5)
		});
		await this.grayMat.created;

		this.grayRedMat = this.assets.createMaterial('grayMat', {
			color: new MRE.Color4(0.5, 0.25, 0.25)
		});
		await this.grayRedMat.created;

		this.lightgrayMat = this.assets.createMaterial('lightgrayMat', {
			color: new MRE.Color4(0.75, 0.75, 0.75)
		});
		await this.lightgrayMat.created;

		this.darkgrayMat = this.assets.createMaterial('lightgrayMat', {
			color: new MRE.Color4(0.25, 0.25, 0.25)
		});
		await this.darkgrayMat.created;

		const filename = `${this.baseUrl}/` + "hand_grey.png";
		this.handTexture = this.assets.createTexture("hand", {
			uri: filename
		});
		await this.handTexture.created;

		this.handMaterial = this.assets.createMaterial('handMat', {
			color: new MRE.Color4(1, 1, 1),
			mainTextureId: this.handTexture.id
		});
		await this.handMaterial.created;

		this.handMesh = this.assets.createBoxMesh('boxMesh', 0.25, 0.1, 0.25);
		await this.handMesh.created;

		this.boxMesh = this.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		await this.boxMesh.created;

		this.sphereMesh= this.assets.createSphereMesh('sphereMesh',0.5,10,10);
		await this.sphereMesh.created;
	}	

	public degToRad(degrees: number) {
		const pi = Math.PI;
		return degrees * (pi / 180);
	}
	private doReset() {
		process.exit(0);
	}

	public vector2String(v: MRE.Vector3, precision: number) {
		return "{X: " + v.x.toFixed(precision) +
			" Y: " + v.y.toFixed(precision) +
			" Z: " + v.z.toFixed(precision) + "}";
	}

	/*
		https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript	
	*/
	public pad(value: number, maxWidth: number, padChar: string) {
		const n = value.toString();
		return n.length >= maxWidth ? n : new Array(maxWidth - n.length + 1).join(padChar) + n;
	}

	public showAllGuis(b: boolean) {
		if (b) {
			this.ourConsole.logMessage("trying to show all GUIs");
		} else {
			this.ourConsole.logMessage("trying to hide all GUIs");
		}
		for (const singlePanel of this.allGUIs) {
			if (b) {
				singlePanel.show();

			} else {
				singlePanel.hide();
			}
		}

		if (b) {
			this.ourPatcher.showPatchLines();
		} else {
			this.ourPatcher.hidePatchLines();
		}
	}

	public async clearAll(){
		for (const singlePanel of this.allGUIs) {
			singlePanel.destroy();
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		this.allGUIs=[];
		this.allModules=[];
	}

	public showAllGrabbers(b: boolean) {
		if (b) {
			this.ourConsole.logMessage("trying to show all grabbers");
			this.menuGrabber.showOnlyGrabber();
		} else {
			this.ourConsole.logMessage("trying to hide all grabbers");
			this.menuGrabber.hideOnlyGrabber();
		}

		for (const singlePanel of this.allGUIs) {
			if (b) {
				singlePanel.showGrabber();

			} else {
				singlePanel.hideGrabber();
			}
		}

		for (const singleModule of this.allModules) {
			if (b) {
				singleModule.showGrabber();

			} else {
				singleModule.hideGrabber();
			}
		}
	}

	public showPalette(b: boolean){
		if(b){
			this.ourPalette.show();

		} else{
			this.ourPalette.hide();
		}
	}

	public setFreePlay(b: boolean){
		this.ourUsers.doFreePlay=b;
	}

	private async loadAsyncItems() {

		await this.createMeshAndMaterial();

		this.menuGrabber = new GrabButton(this);
		this.menuGrabber.create(new MRE.Vector3(3, 0.1, 0));

		this.ourConsole.logMessage("creating console");
		await this.ourConsole.createAsyncItems(new MRE.Vector3(-2.5, 0, 0.0),this.menuGrabber.getGUID());

		let buttonZPos=0.5;

		this.ourConsole.logMessage("Creating Reset Button ");
		const button = new Button(this);
		await button.createAsync(new MRE.Vector3(-0.7, 0, buttonZPos), this.menuGrabber.getGUID(), "Reset", "Reset",
			false, this.doReset.bind(this));
		buttonZPos -= 0.4;
		button.setElevatedUserOnlyVisibility();

		this.ourConsole.logMessage("Creating ShowGUI Button ");
		this.showGUIsButton = new Button(this);
		await this.showGUIsButton.createAsync(new MRE.Vector3(-0.7, 0, buttonZPos),
			this.menuGrabber.getGUID(), "GUIs ON", "GUIs OFF",
			this.showGUIs, this.showAllGuis.bind(this));
		buttonZPos -= 0.2;
		this.showGUIsButton.setElevatedUserOnlyVisibility();

		this.ourConsole.logMessage("Creating Show Grabbers Button ");
		this.showGrabbersButton = new Button(this);
		await this.showGrabbersButton.createAsync(new MRE.Vector3(-0.7, 0, buttonZPos),
			this.menuGrabber.getGUID(), "Grabbers ON", "Grabbers OFF",
			this.showGrabbers, this.showAllGrabbers.bind(this));
		buttonZPos -= 0.2;
		this.showGrabbersButton.setElevatedUserOnlyVisibility();

		this.ourConsole.logMessage("Creating User Auth Button ");
		const setFreePlayButton = new Button(this);
		await setFreePlayButton.createAsync(new MRE.Vector3(-0.7, 0, buttonZPos),
			this.menuGrabber.getGUID(), "Freeplay", "Auth Users",
			this.ourUsers.doFreePlay, this.setFreePlay.bind(this));
		buttonZPos -= 0.2;
		setFreePlayButton.setElevatedUserOnlyVisibility();

		this.ourConsole.logMessage("Creating Show  Pallete Button ");
		this.ourPalette = new Palette(this);
		await this.ourPalette.createBackground(new MRE.Vector3(6, 1.5, 0),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 30 * Math.PI / 180, 0),
			"Music Modules Palette",
			1.5);
		this.ourPalette.hide();		

		this.showPaletteButton = new Button(this);
		await this.showPaletteButton.createAsync(new MRE.Vector3(-0.7, 0, buttonZPos),
			this.menuGrabber.getGUID(), "Palette ON", "Palette OFF",
			false, this.showPalette.bind(this));
		buttonZPos -= 0.2;
		this.showPaletteButton.setElevatedUserOnlyVisibility();

		await this.ourPresets.spawnPreset(this.instrumentType);		

		this.ourConsole.logMessage("Finished creation of all asyn items");
	}	

	private stopped() {
		MRE.log.info("app", "stopped callback has been called");
	}

	private started() {
		this.ourConsole.logMessage("started callback has begun");

		this.loadAsyncItems().then(() => {
			this.ourConsole.logMessage("all async items created/loaded!");
		});
	}
}
