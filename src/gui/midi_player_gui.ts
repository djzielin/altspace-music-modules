/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import App from '../app';
import MidiPlayer from '../utility_modules/midi_player';

import PlusMinus from './plusminus';
import Button from './button';
import ButtonMulti from './button_multi';
import GuiPanel from './gui_panel';
import ButtonWithParameter from './button_with_parameter';

enum PlayState {
	Stopped = 0,
	Paused = 1,
	Playing = 2
}

/*enum PlayType {
	Single = 0,
	Loop = 1,
	Playlist = 2
}*/

export default class MidiPlayerGui extends GuiPanel{
	public sendButton: Button=null;
	public receiveButton: Button=null;
	public isPlayingButton: Button=null;

	private isPlaying=false;
	private activeMidiIndex=0;
	private ourMidiButtons: ButtonWithParameter[]=[];

	constructor(protected ourApp: App, private ourMidiPlayer: MidiPlayer) {
		super(ourApp);
		this.ourModule=ourMidiPlayer;

		setInterval(() => {
			const recentState=(this.ourMidiPlayer.ourPlayState===PlayState.Playing);
			
			if(recentState!==this.isPlaying){
				this.ourApp.ourConsole.logMessage("detected state change in midiplayer: now " + recentState);

				this.isPlayingButton.setValue(recentState,false);
				this.isPlaying=recentState;
			}

			const recentIndex=this.ourMidiPlayer.currentFileIndex;

			if(recentIndex!==this.activeMidiIndex){
				this.ourApp.ourConsole.logMessage("detected state change in midi index: now " + recentIndex);
				this.activeMidiIndex=recentIndex;
				this.makeActiveMidiFileGreen();
			}
		}, 1000);
	}	

	public sendMidiPatcher(b: boolean){
		this.ourApp.ourPatcher.patcherClickEvent(this.ourMidiPlayer,"midi",true,this,this.sendButton);
	}	

	public setPlaying(b: boolean){
		if(b){
			this.ourMidiPlayer.setPlaying();
		}else{
			this.ourMidiPlayer.setPaused();
		}

		this.isPlaying=b;
	}	

	public grabRelease(){ 
		this.ourApp.ourPatcher.updatePatchLines(this);
	}

	public setPlayType(n: number): void {
		this.ourMidiPlayer.ourPlayType=n;
	}

	public setTempo(n: number): void {
		this.ourMidiPlayer.setTempo(n);
	}

	public makeActiveMidiFileGreen(){
		for(let i=0;i<this.ourMidiButtons.length;i++){
			if(i===this.activeMidiIndex){
				this.ourMidiButtons[i].setValue(true,false);
			}else{
				this.ourMidiButtons[i].setValue(false,false);
			}
		}
	}

	public chooseMidiFile(b: boolean, param: any){
		const midiIndex=param as number;
		this.ourApp.ourConsole.logMessage("user if picking midi file: " + midiIndex + " val: " + b);
		
		if(b){
			//don't allow user to select out of range file
			if(midiIndex>=this.ourMidiPlayer.midiFiles.length){
				this.ourMidiButtons[midiIndex].setValue(false,false); //keep red
			} else{
				this.activeMidiIndex=midiIndex;
				this.ourMidiPlayer.setStopped();
				this.ourMidiPlayer.currentFileIndex=midiIndex;
				this.ourMidiPlayer.setPlaying();
				this.makeActiveMidiFileGreen();
			}
		} else{ //don't allow user to turn off green button
			this.ourMidiButtons[midiIndex].setValue(true,false);
		}
	}

	public async createAsync(pos: MRE.Vector3, name: string) {
		this.ourApp.ourConsole.logMessage("creating midi player gui");

		await this.createBackground(pos, name, 1.5);

		let zPos=this.backgroundHeight * 0.5 - 0.3;

		const portSelector = new PlusMinus(this.ourApp);
		await portSelector.createAsync(new MRE.Vector3(-0.5, 0.05, zPos),
			this.guiBackground.id, "Tempo",
			120, 5.0, this.setTempo.bind(this));
		zPos -= 0.15;

		let isPlaying=true;
		if(this.ourMidiPlayer.ourPlayState!==PlayState.Playing){
			isPlaying=false;
		}

		this.isPlayingButton = new Button(this.ourApp);
		await this.isPlayingButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "Playing", "Stopped",
			isPlaying, this.setPlaying.bind(this));
		zPos -= 0.15;

		const playTypes: string[]=["One Shot","Loop","Playlist"];
		const playTypeButton = new ButtonMulti(this.ourApp);
		await playTypeButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, playTypes ,
			this.ourMidiPlayer.ourPlayType, this.setPlayType.bind(this));
		zPos -= 0.15;
		zPos -= 0.15;

		for(let i=0;i<3;i++){			
			let buttonName="nothing";
			if(i<this.ourMidiPlayer.midiFiles.length){
				buttonName=this.ourMidiPlayer.midiFiles[i];
				this.ourApp.ourConsole.logMessage("midi file: " + buttonName);

				const slashIndex=buttonName.lastIndexOf("/");
				buttonName=buttonName.substr(slashIndex+1);				
			}

			const midiFileButton = new ButtonWithParameter(this.ourApp,i);
			await midiFileButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
				this.guiBackground.id, buttonName,buttonName,
				false, this.chooseMidiFile.bind(this));
			zPos -= 0.15;

			midiFileButton.doVisualUpdates=false; //don't automatically switch colors of buttons. 

			this.ourMidiButtons.push(midiFileButton);
		}
		
		this.makeActiveMidiFileGreen();
		zPos -= 0.15;

		this.sendButton = new Button(this.ourApp);
		await this.sendButton.createAsync(new MRE.Vector3(0, 0.025, zPos),
			this.guiBackground.id, "SEND MIDI", "SEND MIDI",
			true, this.sendMidiPatcher.bind(this));
		zPos -= 0.15;

		this.guiGrabber.setGrabReleaseCallback(this.grabRelease.bind(this));
	}
}


/*textButton.setBehavior(MRE.ButtonBehavior).onClick(user => {
			user.prompt("Who's your favorite musician?", true)
			.then(res => {
				textButton.text.contents =
					`Click for prompt\nLast response: ${res.submitted ? res.text : "<cancelled>"}`;
			})
			.catch(err => {
				console.error(err);
				success = false;
				this.stop();
			});
		});

*/
