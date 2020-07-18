/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import GrabButton from './grabbutton';
import WavPlayer from './wavplayer';
import Staff from './staff';

export default class Piano {
	//private ourKeys: MRE.Actor[] = [];
	private ourKeys: Map<number,MRE.Actor>=new Map();
	public keyboardParent: MRE.Actor;
	private pianoGrabber: GrabButton=null;
	public ourWavPlayer: WavPlayer;
	public ourStaff: Staff;

	private inch = 0.0254;
	private halfinch = this.inch * 0.5;
	private xOffset =
		[0.0,
			0.0 + this.halfinch,
			this.inch * 1.0,
			this.inch * 1.0 + this.halfinch,
			this.inch * 2.0,
			this.inch * 3.0,
			this.inch * 3.0 + this.halfinch,
			this.inch * 4.0,
			this.inch * 4.0 + this.halfinch,
			this.inch * 5.0,
			this.inch * 5.0 + this.halfinch,
			this.inch * 6.0];
	private yOffset =
		[0, this.halfinch, 0, this.halfinch, 0, 0, this.halfinch, 0, this.halfinch, 0, this.halfinch, 0];
	private zOffset =
		[0, this.inch - 0.001, 0, this.inch - 0.001, 0, 0, this.inch - 0.001, 0, this.inch - 0.001, 0, 
			this.inch - 0.001, 0];
	private zOffsetCollision =
		[-this.inch * 1.75, this.inch - 0.001, -this.inch * 1.75, this.inch - 0.001, -this.inch * 1.75,
			-this.inch * 1.75, this.inch - 0.001, -this.inch * 1.75, this.inch - 0.001, -this.inch * 1.75,
			this.inch - 0.001, -this.inch * 1.75];
	private octaveSize = this.inch * 7.0;

	private noteOrder =
		["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

	private whiteKeyMaterial: MRE.Material = null;
	private blackKeyMaterial: MRE.Material = null;
	private redKeyMaterial: MRE.Material= null;

	private keyLocations: Map<number,MRE.Vector3>=new Map();

	public setProperKeyColor(midiNote: number) {
		const note = midiNote % 12;

		let matt = this.blackKeyMaterial;

		if (this.zOffset[note] === 0) {
			matt = this.whiteKeyMaterial;
		}

		this.ourKeys.get(midiNote).appearance.material = matt;
	}

	public setFancyKeyColor(midiNote: number) {
		const note = midiNote % 12;

		if (this.ourStaff) {
			const materialID = this.ourStaff.noteMaterials[note].id;
			if (this.ourKeys.has(midiNote)) {
				this.ourKeys.get(midiNote).appearance.materialId = materialID;
			}
		}
	}

	constructor(private ourApp: App) {
		this.whiteKeyMaterial = this.ourApp.assets.createMaterial('cubemat', {
			color: new MRE.Color4(1, 1, 1)
		});
		this.blackKeyMaterial = this.ourApp.assets.createMaterial('cubemat', {
			color: new MRE.Color4(0, 0, 0)
		});
	}

	public async createAllKeys(pos: MRE.Vector3,rot=new MRE.Quaternion()) {
		const whiteKeyMesh = this.ourApp.assets.createBoxMesh('box', this.inch * 0.9, this.inch, this.inch * 5.5);
		await whiteKeyMesh.created;
		const whiteKeyCollisionMesh = this.ourApp.assets.createBoxMesh('box', this.inch * 0.9, 
			this.inch, this.inch * 2.0);
		await whiteKeyCollisionMesh.created;

		const blackKeyMesh = this.ourApp.assets.createBoxMesh('box', this.halfinch, this.inch, this.inch * 3.5);
		await blackKeyMesh.created;

		const whiteKeyMaterial: MRE.Material = this.ourApp.assets.createMaterial('cubemat', {
			color: new MRE.Color4(1, 1, 1)
		});
		await whiteKeyMaterial.created;


		const blackKeyMaterial: MRE.Material = this.ourApp.assets.createMaterial('cubemat', {
			color: new MRE.Color4(0, 0, 0)
		});
		await blackKeyMaterial.created;

		
		this.pianoGrabber=new GrabButton(this.ourApp);
		this.pianoGrabber.create(pos,rot);

		this.keyboardParent = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'keyboard_parent',
				parentId: this.pianoGrabber.getGUID(),
				transform: {
					local: {
						position: new MRE.Vector3(0, 0, 0),
						scale: new MRE.Vector3(5, 5, 5)
					}
				}
			}
		});
		//await this.keyboardParent.created();

		//this.keyboardParent.setCollider(MRE.ColliderType.Box, false,
		//	new MRE.Vector3(this.octaveSize * 8, this.inch * 2.0, this.inch * 6.0));

		//this.keyboardParent.grabbable = true;

		//21 to 109
		for (let i = 36; i < 85; i++) {
			let meshId: MRE.Guid = blackKeyMesh.id;
			let mattId: MRE.Guid = blackKeyMaterial.id;
			const note = i % 12;
			const octave = Math.floor(i / 12);


			let collisionMeshID: MRE.Guid = blackKeyMesh.id;

			if (this.zOffset[note] === 0) {
				meshId = whiteKeyMesh.id;
				mattId = whiteKeyMaterial.id;
				collisionMeshID=whiteKeyCollisionMesh.id;
			}

			const keyPos = new MRE.Vector3(
				-this.octaveSize * 2 + octave * this.octaveSize + this.xOffset[note] -1.0,
				this.yOffset[note],
				this.zOffset[note]);

			this.keyLocations.set(note,keyPos); //TODO, wont be accurate if moved

			const keyPosCollision = new MRE.Vector3(
					-this.octaveSize * 2 + octave * this.octaveSize + this.xOffset[note] -1.0,
					this.yOffset[note],
					this.zOffsetCollision[note]);

			const keyActor = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					name: 'PianoKey' + i,
					parentId: this.keyboardParent.id,
					transform: {
						local: { position: keyPos }
					},
					appearance:
					{
						meshId: meshId,
						materialId: mattId 
					},
				}
			});

			await keyActor.created();

			const keyCollisionActor = MRE.Actor.Create(this.ourApp.context, {
				actor: {
					name: 'CollisionPianoKey' + i,
					parentId: this.keyboardParent.id,
					transform: {
						local: { position: keyPosCollision }
					},
					appearance:
					{
						meshId: collisionMeshID,
						materialId: this.ourApp.redMat.id,
						enabled: false
					},
					collider: {
						geometry: {
							shape: MRE.ColliderType.Box
						},
						isTrigger: true
					}
				}
			});

			keyCollisionActor.collider.onTrigger("trigger-enter", (otherActor: MRE.Actor) => {
				this.ourApp.ourConsole.logMessage("trigger enter on piano note!");				

				if (otherActor.name.includes('SpawnerUserHand')) { //bubble touches hand
					this.keyPressed(i);

					if (this.ourStaff) {
						this.ourStaff.receiveNote(i, 127);
					}

				} else {
					//this.ourApp.ourConsole.logMessage("sphere collided with: " + otherActor.name);
				}
			});
			keyCollisionActor.collider.onTrigger("trigger-exit", (otherActor: MRE.Actor) => {
				this.ourApp.ourConsole.logMessage("trigger enter on piano note!");				

				if (otherActor.name.includes('SpawnerUserHand')) { //bubble touches hand
					this.keyReleased(i);

				} else {
					//this.ourApp.ourConsole.logMessage("sphere collided with: " + otherActor.name);
				}
			});

			const buttonBehavior = keyCollisionActor.setBehavior(MRE.ButtonBehavior);
			buttonBehavior.onButton("pressed", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
				if (this.ourApp.isAuthorized(user)) { //TODO: get this permission from gui for piano

					this.ourApp.ourConsole.logMessage("user clicked on piano note!");
					this.keyPressed(i);

					if (this.ourStaff) {
						this.ourStaff.receiveNote(i, 127);
					}
				}
			});
			buttonBehavior.onButton("released", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
				if (this.ourApp.isAuthorized(user)) {
					this.keyReleased(i);
				}
			});
			buttonBehavior.onHover("exit", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
				if (this.ourApp.isAuthorized(user)) {
					this.keyReleased(i);
				}
			});

			await keyCollisionActor.created();

			this.ourKeys.set(i,keyActor);
		}
	}	

	public keyPressed(note: number) {
		if(!this.ourKeys.has(note)){
			return;
		}

		const currentPos = this.ourKeys.get(note).transform.local.position;

		this.ourKeys.get(note).transform.local.position =
			new MRE.Vector3(currentPos.x, currentPos.y - 0.01, currentPos.z);
			
		if(this.ourWavPlayer){
			this.ourWavPlayer.playSound(note,127,new MRE.Vector3(0,0,0), 20.0);
		}

		this.setFancyKeyColor(note);

	}

	public keyReleased(note: number) {
		if(!this.ourKeys.has(note)){
			return;
		}
		const noteNum = note % 12;

		const currentPos = this.ourKeys.get(note).transform.local.position;

		this.ourKeys.get(note).transform.local.position =
			new MRE.Vector3(currentPos.x, this.yOffset[noteNum], currentPos.z);

		this.setProperKeyColor(note);
	}
}
