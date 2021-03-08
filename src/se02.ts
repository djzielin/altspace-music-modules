/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import App from './app';
import Knob from './knob';
import MusicModule from './backend/music_module';

enum AuthType {
	Moderators=0,
	All=1,
	SpecificUser=2
  }


export default class Se02 extends MusicModule{
	public ourInteractionAuth=AuthType.All;
	public authorizedUser: MRE.User;

	public seScale=1.0;
	
	public showBackground=true;

	public sphereMesh: MRE.Mesh;
	public boxMesh: MRE.Mesh;
	public cylinderMesh: MRE.Mesh;

	public seBackground: MRE.Actor=null;

	private allKnobs: Knob[]=[];
	private draggingKnobs: Map<MRE.User,Knob>=new Map();
	
	constructor(protected ourApp: App, public name: string) {
		super(ourApp, name);

	}

	public async createAsyncItems(pos: MRE.Vector3, rot=new MRE.Quaternion()) {
		if (!this.ourGrabber) {
			this.createGrabber(pos, rot);
		} else {
			this.ourGrabber.setPos(pos);
			this.ourGrabber.setRot(rot);
		}

		this.ourApp.ourConsole.logMessage("creating se02 asyn items");

		this.cylinderMesh = this.ourApp.assets.createCylinderMesh('cylinder',1.0,0.5,'y',10);
		await this.cylinderMesh.created;

		const seMesh = this.ourApp.assets.createBoxMesh('boxMesh', 2.5, 0.05, 1.0);
		await seMesh.created;

		const filename = `${this.ourApp.baseUrl}/` + "se_flipped.png";
		const seTexture = this.ourApp.assets.createTexture("se", {
			uri: filename
		});

		const seMaterial = this.ourApp.assets.createMaterial('seMat', {
			color: new MRE.Color4(1, 1, 1),
			mainTextureId: seTexture.id
		});

		this.seBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourGrabber.getGUID(),
				name: "seBackground",
				appearance: {
					meshId: seMesh.id,
					materialId: seMaterial.id,
					enabled: this.showBackground
				},
				transform: {
					local: {
						position: new MRE.Vector3(-(this.seScale*2.5 * 0.5 + 0.5), 0, 0 ),
						scale: new MRE.Vector3(this.seScale, this.seScale, this.seScale)
					}
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Auto
					}
				}
			}
		});
	
		const buttonBehavior = this.seBackground.setBehavior(MRE.ButtonBehavior);		

		buttonBehavior.onButton("pressed", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				if (!this.draggingKnobs.has(user)) {


					const penPos = buttonData.targetedPoints[0].localSpacePoint;
					const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);

					let nearestKnob = 1000;
					let ourKnob = null;
					for (const knob of this.allKnobs) {
						const dist = knob.knobCenterPos.subtract(posVector3).length();
						if (dist < nearestKnob) {
							nearestKnob = dist;
							ourKnob = knob;
						}
					}
					if (ourKnob) {
						this.ourApp.ourConsole.logMessage("user: " + user.name + " grabbed knob: " + ourKnob.ourName);

						ourKnob.userPressed(posVector3);
						this.draggingKnobs.set(user, ourKnob);
					}
					else {
						this.ourApp.ourConsole.logMessage("ERROR: couldnt figure out nearest knob!");
					}
				}
			}
		});

		buttonBehavior.onButton("holding", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				if (this.draggingKnobs.has(user)) {
					const numPoints = buttonData.targetedPoints.length;
					const point = buttonData.targetedPoints[numPoints - 1];
					const penPos = point.localSpacePoint;
					const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);
					
					const ourKnob=this.draggingKnobs.get(user);
					this.ourApp.ourConsole.logMessage("user: " + user.name + " is holding knob: " +ourKnob.ourName);

					ourKnob.userHolding(posVector3);
				}
			}
		});

		buttonBehavior.onButton("released", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				if(this.draggingKnobs.has(user)){
					const ourKnob=this.draggingKnobs.get(user);
					this.ourApp.ourConsole.logMessage("user: " + user.name + " is releasing knob: " +ourKnob.ourName);

					ourKnob.userReleased();
					this.draggingKnobs.delete(user);
				}
			}
		});

		buttonBehavior.onHover("exit", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.isAuthorized(user)) {
				if(this.draggingKnobs.has(user)){
					const ourKnob=this.draggingKnobs.get(user);
					this.ourApp.ourConsole.logMessage("user: " + user.name + " is releasing knob: " +ourKnob.ourName);

					ourKnob.userReleased();
					this.draggingKnobs.delete(user);
				}
			}
		});	

		await this.seBackground.created();

		/////////////////////////////////////////////////////////////////////////////////////
		// CONTROL
		/////////////////////////////////////////////////////////////////////////////////////
		const glide=new Knob(this.ourApp,this,"glide",5,0,-150,150);
		await glide.createAsyncItems(new MRE.Vector3(-1.16,0,0.243),this.seBackground.id,-150);
		this.allKnobs.push(glide);

		const whlmix=new Knob(this.ourApp,this,"whlmix",13,0,-150,150);
		await whlmix.createAsyncItems(new MRE.Vector3(-1.16,0,-0.074),this.seBackground.id,-150);
		this.allKnobs.push(whlmix);

		/////////////////////////////////////////////////////////////////////////////////////
		// OSC
		/////////////////////////////////////////////////////////////////////////////////////
		const osc1range=new Knob(this.ourApp,this,"osc1range",22,6,-90,135);
		await osc1range.createAsyncItems(new MRE.Vector3(-0.99,0,0.243),this.seBackground.id,0);
		this.allKnobs.push(osc1range);

		const osc2range=new Knob(this.ourApp,this,"osc2range",19,6,-90,135);
		await osc2range.createAsyncItems(new MRE.Vector3(-0.99,0,0.082),this.seBackground.id,0);
		this.allKnobs.push(osc2range);

		const osc3range=new Knob(this.ourApp,this,"osc3range",25,6,-90,135);
		await osc3range.createAsyncItems(new MRE.Vector3(-0.99,0,-0.074),this.seBackground.id,0);
		this.allKnobs.push(osc3range);

		const osc1waveform=new Knob(this.ourApp,this,"osc1waveform",24,6,-90,135);
		await osc1waveform.createAsyncItems(new MRE.Vector3(-0.67,0,0.243),this.seBackground.id,0);
		this.allKnobs.push(osc1waveform);

		const osc2waveform=new Knob(this.ourApp,this,"osc2waveform",20,6,-90,135);
		await osc2waveform.createAsyncItems(new MRE.Vector3(-0.67,0,0.082),this.seBackground.id,0);
		this.allKnobs.push(osc2waveform);

		const osc3waveform=new Knob(this.ourApp,this,"osc3waveform",26,6,-90,135);
		await osc3waveform.createAsyncItems(new MRE.Vector3(-0.67,0,-0.074),this.seBackground.id,0);
		this.allKnobs.push(osc3waveform);

		const fine2=new Knob(this.ourApp,this,"fine2",27,0,-150,150);
		await fine2.createAsyncItems(new MRE.Vector3(-0.83,0,0.082),this.seBackground.id,0);
		this.allKnobs.push(fine2);

		const fine3=new Knob(this.ourApp,this,"fine3",28,0,-150,150);
		await fine3.createAsyncItems(new MRE.Vector3(-0.83,0,-0.074),this.seBackground.id,0);
		this.allKnobs.push(fine3);

		const env1=new Knob(this.ourApp,this,"env1",29,0,-150,150);
		await env1.createAsyncItems(new MRE.Vector3(-0.5,0,0.082),this.seBackground.id,0);
		this.allKnobs.push(env1);

		/////////////////////////////////////////////////////////////////////////////////////
		// XMOD
		/////////////////////////////////////////////////////////////////////////////////////
		const xmod1=new Knob(this.ourApp,this,"xmod1",16,0,-150,150);
		await xmod1.createAsyncItems(new MRE.Vector3(-0.33,0,0.243),this.seBackground.id,-150);
		this.allKnobs.push(xmod1);

		const xmod2=new Knob(this.ourApp,this,"xmod2",17,0,-150,150);
		await xmod2.createAsyncItems(new MRE.Vector3(-0.33,0,0.082),this.seBackground.id,-150);
		this.allKnobs.push(xmod2);

		const xmod3=new Knob(this.ourApp,this,"xmod3",18,0,-150,150);
		await xmod3.createAsyncItems(new MRE.Vector3(-0.33,0,-0.074),this.seBackground.id,-150);
		this.allKnobs.push(xmod3);

		/////////////////////////////////////////////////////////////////////////////////////
		// MIXER
		/////////////////////////////////////////////////////////////////////////////////////
		const osc1mix=new Knob(this.ourApp,this,"osc1mix",48,0,-150,150);
		await osc1mix.createAsyncItems(new MRE.Vector3(-0.165,0,0.243),this.seBackground.id,0);
		this.allKnobs.push(osc1mix);

		const osc2mix=new Knob(this.ourApp,this,"osc2mix",49,0,-150,150);
		await osc2mix.createAsyncItems(new MRE.Vector3(-0.165,0,0.082),this.seBackground.id,0);
		this.allKnobs.push(osc2mix);

		const osc3mix=new Knob(this.ourApp,this,"osc3mix",50,0,-150,150);
		await osc3mix.createAsyncItems(new MRE.Vector3(-0.165,0,-0.074),this.seBackground.id,0);
		this.allKnobs.push(osc3mix);

		const feedb=new Knob(this.ourApp,this,"feedb",51,0,-150,150);
		await feedb.createAsyncItems(new MRE.Vector3(0.0,0,0.16),this.seBackground.id,-150);
		this.allKnobs.push(feedb);

		const noise=new Knob(this.ourApp,this,"noise",41,0,-150,150);
		await noise.createAsyncItems(new MRE.Vector3(0.0,0.0,0.0),this.seBackground.id,-150);
		this.allKnobs.push(noise);

		/////////////////////////////////////////////////////////////////////////////////////
		// FILTER / ENVELOPES
		/////////////////////////////////////////////////////////////////////////////////////
		const cutoffKnob=new Knob(this.ourApp,this,"cutoff",74,0,-150,150);
		await cutoffKnob.createAsyncItems(new MRE.Vector3(0.165,0,0.243),this.seBackground.id,0);
		this.allKnobs.push(cutoffKnob);

		const emphasisKnob=new Knob(this.ourApp,this,"emphasis",71,0,-150,150);
		await emphasisKnob.createAsyncItems(new MRE.Vector3(0.33,0,0.243),this.seBackground.id,0);
		this.allKnobs.push(emphasisKnob);

		const filtContour=new Knob(this.ourApp,this,"filt_contour",59,0,-150,150);
		await filtContour.createAsyncItems(new MRE.Vector3(0.66,0,0.243),this.seBackground.id,0);
		this.allKnobs.push(filtContour);

		const filtA=new Knob(this.ourApp,this,"filt_attack",47,0,-150,150);
		await filtA.createAsyncItems(new MRE.Vector3(0.165,0,0.082),this.seBackground.id,-150);
		this.allKnobs.push(filtA);

		const filtD=new Knob(this.ourApp,this,"filt_decay",52,0,-150,150);
		await filtD.createAsyncItems(new MRE.Vector3(0.33,0,0.082),this.seBackground.id,0);
		this.allKnobs.push(filtD);

		const filtS=new Knob(this.ourApp,this,"filt_sustain",53,0,-150,150);
		await filtS.createAsyncItems(new MRE.Vector3(0.49,0,0.085),this.seBackground.id,0);
		this.allKnobs.push(filtS);

		const envA=new Knob(this.ourApp,this,"env_attack",73,0,-150,150);
		await envA.createAsyncItems(new MRE.Vector3(0.165,0,-0.074),this.seBackground.id,-150);
		this.allKnobs.push(envA);

		const envD=new Knob(this.ourApp,this,"env_decay",75,0,-150,150);
		await envD.createAsyncItems(new MRE.Vector3(0.33,0,-0.074),this.seBackground.id,0);
		this.allKnobs.push(envD);

		const envS=new Knob(this.ourApp,this,"env_sustain",56,0,-150,150);
		await envS.createAsyncItems(new MRE.Vector3(0.49,0,-0.074),this.seBackground.id,0);
		this.allKnobs.push(envS);		
	
		/////////////////////////////////////////////////////////////////////////////////////
		// LFO
		/////////////////////////////////////////////////////////////////////////////////////
		const lforate=new Knob(this.ourApp,this,"lfo_rate",102,0,-150,150);
		await lforate.createAsyncItems(new MRE.Vector3(0.82,0,0.243),this.seBackground.id,-150);
		this.allKnobs.push(lforate);

		const lfoosc=new Knob(this.ourApp,this,"lfo_osc",103,0,-150,150);
		await lfoosc.createAsyncItems(new MRE.Vector3(0.82,0,0.082),this.seBackground.id,-150);
		this.allKnobs.push(lfoosc);

		const lfofilter=new Knob(this.ourApp,this,"lfo_filter",105,0,-150,150);
		await lfofilter.createAsyncItems(new MRE.Vector3(0.99,0,0.082),this.seBackground.id,-150);
		this.allKnobs.push(lfofilter);

		const lfowave=new Knob(this.ourApp,this,"lfo_wave",104,9,-160,160);
		await lfowave.createAsyncItems(new MRE.Vector3(0.99,0,0.243),this.seBackground.id,0);
		this.allKnobs.push(lfowave);

		/////////////////////////////////////////////////////////////////////////////////////
		// Delay
		/////////////////////////////////////////////////////////////////////////////////////
		const dtime=new Knob(this.ourApp,this,"d_time",82,0,-150,150);
		await dtime.createAsyncItems(new MRE.Vector3(1.16,0,0.243),this.seBackground.id,0);
		this.allKnobs.push(dtime);

		const dregen=new Knob(this.ourApp,this,"d_regen",83,0,-150,150);
		await dregen.createAsyncItems(new MRE.Vector3(1.16,0,0.082),this.seBackground.id,0);
		this.allKnobs.push(dregen);

		const damount=new Knob(this.ourApp,this,"d_amount",91,0,-150,150);
		await damount.createAsyncItems(new MRE.Vector3(1.16,0,-0.074),this.seBackground.id,-150);
		this.allKnobs.push(damount);

		this.ourApp.ourConsole.logMessage("completed all se02 object creation");
	}
	
	private isAuthorized(user: MRE.User): boolean {
		if (this.ourInteractionAuth === AuthType.All) {
			return true;
		}
		if (this.ourInteractionAuth === AuthType.Moderators) {
			return this.ourApp.ourUsers.isAuthorized(user);
		}
		if (this.ourInteractionAuth === AuthType.SpecificUser) {
			if (user === this.authorizedUser) {
				return true;
			}
		}

		return false;
	}
}
