/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import App from './app';
import GrabButton from './grabbutton';
import Button from './button';
import SequencerColumn from './sequencer_column';
import MusicModule from './music_module';

enum AuthType {
	Moderators=0,
	All=1,
	SpecificUser=2
  }

export default class Sequencer extends MusicModule{
	public ourInteractionAuth=AuthType.All;
	public authorizedUser: MRE.User;

	public seScale=1.0;
	public baseNote=48;	
	public showBackground=true;

	public sphereMesh: MRE.Mesh;
	public boxMesh: MRE.Mesh;
	public cylinderMesh: MRE.Mesh;
	public activeNotes: number[]=[];

	//private ourGrabber: GrabButton=null;
	public seBackground: MRE.Actor=null;
	private ourTimer: NodeJS.Timeout=null;
	private ourColumns: SequencerColumn[]=[];
	private columnIndex=0;
	private isPlaying=true;
	public sequencerInterval=400;

	public graySeeThrough: MRE.Material;

	constructor(protected ourApp: App) {
		super(ourApp);
	}

	public setPlaying(b: boolean){
		if(this.isPlaying){
			this.isPlaying=false;
		} else{
			this.isPlaying=true;
		}
	}

	public setRewind(b: boolean){
		this.ourColumns[this.columnIndex].resetHeight();
		this.columnIndex=this.ourColumns.length-1; //start at end of sequencer
	}

	public restartSequencer(){
		if(this.ourTimer){ //clear out the old one (if it exists)
			clearInterval(this.ourTimer);
		}

		this.ourTimer=setInterval(() => { 
			if(this.isPlaying){
				this.ourColumns[this.columnIndex].resetHeight();
				this.columnIndex=(this.columnIndex+1) % this.ourColumns.length;
				this.ourColumns[this.columnIndex].bumpHeight();
			}
		}, this.sequencerInterval);
	}

	public turnOffActiveNotes(){
		for (const note of this.activeNotes) {
			this.noteOff(note);
		}
		this.activeNotes = [];
	}

	public noteOff(note: number) {
		const message = [note, 0];
		this.sendData(message);
		//this.ourSequencer.ourApp.ourMidiSender.send(`[128,${this.prevNote},0]`)
	}

	public noteOn(note: number, vel: number) {
		const message = [note, vel];
		this.sendData(message);

		//this.ourSequencer.ourApp.ourMidiSender.send(`[144,${note},${vel}]`)
	}
	
	public async createAsyncItems(pos: MRE.Vector3, rot=new MRE.Quaternion()) {
		this.ourApp.ourConsole.logMessage("creating se02 asyn items");

		this.boxMesh = this.ourApp.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		await this.boxMesh.created;

		this.sphereMesh = this.ourApp.assets.createSphereMesh('sphereMesh',0.5,10,10);
		await this.sphereMesh.created;

		this.cylinderMesh = this.ourApp.assets.createCylinderMesh('cylinder',1.0,0.5,'y',10);
		await this.cylinderMesh.created;

		this.createGrabber(pos,rot);

		this.graySeeThrough = this.ourApp.assets.createMaterial('graySeeThrough', {
			color: new MRE.Color4(0.5,0.5,0.5,0.5),
			alphaMode: MRE.AlphaMode.Blend
		});

		const horizCells=16;
		const vertCells=25;

		const horizInc=new MRE.Vector3(0.15,0,0);
		const vertInc=new MRE.Vector3(0,0,-0.15)
		const startPos=new MRE.Vector3(-(horizInc.x*horizCells+0.5),0,(-vertInc.z)*vertCells*0.5); 

		
		for(let x=0;x<16;x++){
			const oneColumn=new SequencerColumn(this.ourApp,this);
			await oneColumn.createAsyncItems(vertCells,
				startPos.add(horizInc.multiplyByFloats(x,x,x)),
				vertInc,
				this.ourGrabber.getGUID());
			this.ourColumns.push(oneColumn);
		}

		this.ourApp.ourConsole.logMessage("completed all sequencer object creation");

		let zPos=-0.5;
		const playButton = new Button(this.ourApp);
		await playButton.createAsync(new MRE.Vector3(0.0, 0.0, zPos),
			this.ourGrabber.getGUID(), "Playing", "Stopped",
			this.isPlaying, this.setPlaying.bind(this));
		zPos-=0.15;

		const resetButton = new Button(this.ourApp);
		await resetButton.createAsync(new MRE.Vector3(0.0, 0.0, zPos),
			this.ourGrabber.getGUID(), "Rewind", "Rewind",
			false, this.setRewind.bind(this));
		resetButton.doVisualUpdates=false;

		//TODO RESET BUTTON HERE

		this.restartSequencer();

	}
	
	public isAuthorized(user: MRE.User): boolean{
		if(this.ourInteractionAuth===AuthType.All){
			return true;
		}
		if(this.ourInteractionAuth===AuthType.Moderators){
			return this.ourApp.ourUsers.isAuthorized(user);
		}
		if(this.ourInteractionAuth===AuthType.SpecificUser){
			if(user===this.authorizedUser){
				return true;
			}
		}

		return false;
	}
}
