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

enum NoteOffMode {
	nextNote = 0,
	nextCell = 1,
	anyNoteOn = 2
}

enum NoteBlankColors {
	gray = 0,
	piano = 1
}

export default class Sequencer extends MusicModule{
	public ourInteractionAuth=AuthType.All;
	public authorizedUser: MRE.User;

	public seScale=1.0;
	public baseNote=48;	
	public showBackground=true;
	public volume=1.0;
	public noteOffMode=NoteOffMode.nextNote;
	public cellsPerBeat=4;


	public activeNotes: number[]=[];

	//private ourGrabber: GrabButton=null;
	public seBackground: MRE.Actor=null;
	private ourColumns: SequencerColumn[]=[];
	private currentColumn=0;
	private isPlaying=true;
	public noteBlankColors=NoteBlankColors.gray;

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

	public receiveData(data: number[], messageType: string){
		if(messageType==="heartbeat"){
			const beat=data[0];
			const interval=data[1];

			const subInterval = interval / this.cellsPerBeat;
			this.currentColumn = beat * this.cellsPerBeat;

			this.ourApp.ourConsole.logMessage("sequencer doing beat: " + beat + ".0");
			this.playColumn(this.currentColumn);
			this.currentColumn++;

			for (let i = 1; i < this.cellsPerBeat; i++) {
				setTimeout(() => {
					this.ourApp.ourConsole.logMessage("sequencer doing beat: " + beat + "."+i);
					this.playColumn(this.currentColumn);
					this.currentColumn++;
				}, subInterval * i);
			}
		}
	}

	/*public setRewind(b: boolean){
		this.ourColumns[this.columnIndex].resetHeight();
		this.columnIndex=this.ourColumns.length-1; //start at end of sequencer
	}*/

	public playColumn(i: number){
		const prevCell=(i-1+this.ourColumns.length)% this.ourColumns.length;
		this.ourColumns[prevCell].resetHeight();

		this.ourColumns[i].bumpHeight();
	}

	public updateBlankColor(){
		for(let x=0;x<16;x++){
			const oneColumn=this.ourColumns[x];
			oneColumn.updateBlankColor();			
		}
	}

	public turnOffActiveNotes(){
		for (const note of this.activeNotes) {
			this.noteOff(note);
		}
		this.activeNotes = [];
	}

	public noteOff(note: number) {
		const message = [note, 0, 0];
		this.sendData(message, "midi");
		//this.ourSequencer.ourApp.ourMidiSender.send(`[128,${this.prevNote},0]`)
	}

	public noteOn(note: number, vel: number) {
		const message = [note, vel * this.volume, 0];
		this.sendData(message, "midi");

		//this.ourSequencer.ourApp.ourMidiSender.send(`[144,${note},${vel}]`)
	}
	
	public async createAsyncItems(pos: MRE.Vector3, rot=new MRE.Quaternion()) {
		this.ourApp.ourConsole.logMessage("creating sequencer asyn items");

		this.createGrabber(pos,rot);

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

		/*let zPos=-0.5;
		const playButton = new Button(this.ourApp);
		await playButton.createAsync(new MRE.Vector3(0.0, 0.0, zPos),
			this.ourGrabber.getGUID(), "Playing", "Stopped",
			this.isPlaying, this.setPlaying.bind(this));
		zPos-=0.15;

		const resetButton = new Button(this.ourApp);
		await resetButton.createAsync(new MRE.Vector3(0.0, 0.0, zPos),
			this.ourGrabber.getGUID(), "Rewind", "Rewind",
			false, this.setRewind.bind(this));
		resetButton.doVisualUpdates=false;*/

		this.ourApp.ourConsole.logMessage("completed all sequencer object creation");
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
