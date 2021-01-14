/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import App from '../app';
import SequencerColumn from './sequencer_column';
import MusicModule from '../music_module';

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
	piano = 1,
	splitbyFour=2
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

	/*public setPlaying(b: boolean){
		if(this.isPlaying){
			this.isPlaying=false;
		} else{
			this.isPlaying=true;
		}
	}*/

	public receiveData(data: any[], messageType: string){
		if(messageType==="heartbeat"){
			const beatType=data[0] as number;
			const interval=data[1] as number;

			if(beatType===-1){ //reset event
				this.turnOffActiveNotes();
				this.resetPrevious();
				this.currentColumn=0;
				this.isPlaying=false;
				//TODO technically should clear out waiting setTimeouts
			}

			if(beatType===1){
				this.isPlaying=true;
				const subInterval = interval / this.cellsPerBeat;

				//this.ourApp.ourConsole.logMessage("sequencer doing beat: " +
				//	Math.floor(this.currentColumn / this.cellsPerBeat) + ".0");
				this.playColumn();

				for (let i = 1; i < this.cellsPerBeat; i++) {
					setTimeout(() => {
						if (this.isPlaying) {
							//this.ourApp.ourConsole.logMessage("sequencer doing beat: " +
							//	Math.floor(this.currentColumn / this.cellsPerBeat) + "." + i);
							this.playColumn();
						}
					}, subInterval * i);
				}
			}
		}
	}

	/*public setRewind(b: boolean){
		this.ourColumns[this.columnIndex].resetHeight();
		this.columnIndex=this.ourColumns.length-1; //start at end of sequencer
	}*/

	private resetPrevious(){
		const prevCell=(this.currentColumn-1+this.ourColumns.length)% this.ourColumns.length;
		this.ourColumns[prevCell].resetHeight();
	}

	private playColumn(){
		this.resetPrevious();
		this.ourColumns[this.currentColumn].bumpHeight();
		this.currentColumn=(this.currentColumn+1)%this.ourColumns.length;
	}

	public updateBlankColor(){
		for(let i=0;i<this.ourColumns.length;i++){
			const oneColumn=this.ourColumns[i];
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
	
	public async createAsyncItems(vertCells: number, pos: MRE.Vector3, rot=new MRE.Quaternion()) {
		this.ourApp.ourConsole.logMessage("creating sequencer asyn items");

		this.createGrabber(pos,rot);

		const horizCells=16;

		const horizInc=new MRE.Vector3(0.15,0,0);
		const vertInc=new MRE.Vector3(0,0,-0.15)
		const startPos=new MRE.Vector3(-(horizInc.x*horizCells+0.5),0,(-vertInc.z)*vertCells*0.5); 

		
		for(let x=0;x<16;x++){
			const oneColumn=new SequencerColumn(this.ourApp,this,x);
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
