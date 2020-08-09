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
	public prevNotes: number[]=[];

	//private ourGrabber: GrabButton=null;
	public seBackground: MRE.Actor=null;

	private ourColumns: SequencerColumn[]=[];
	private columnIndex=0;

	public graySeeThrough: MRE.Material;

	constructor(protected ourApp: App) {
		super(ourApp);
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

		setInterval(() => { 
			this.ourColumns[this.columnIndex].resetHeight();

			this.columnIndex=(this.columnIndex+1) % this.ourColumns.length;
			this.ourColumns[this.columnIndex].bumpHeight();

		}, 400);
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
