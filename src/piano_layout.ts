/*!
 * Licensed under the MIT License.
 */
/* eslint-disable no-warning-comments */

import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import App from './app';
import Piano from './piano';

export default class PianoLayout {

	private inch = 0.0254;
	public halfinch = this.inch * 0.5;
    public inchShorter=this.inch - 0.001;
	public threeShorter = this.inch * 0.75 - 0.001;
	private whiteWide = 1.25 * this.inch;

	public offset12: MRE.Vector3[] = [
		new MRE.Vector3(0.0,0.0,0.0),
		new MRE.Vector3(0.0 + this.halfinch, this.halfinch,	this.inchShorter),
		new MRE.Vector3(this.inch * 1.0, 0.0, 0.0),
		new MRE.Vector3(this.inch * 1.0 + this.halfinch,this.halfinch,this.inchShorter),
		new MRE.Vector3(this.inch * 2.0, 0.0, 0.0),
		new MRE.Vector3(this.inch * 3.0, 0.0, 0.0),
		new MRE.Vector3(this.inch * 3.0 + this.halfinch, this.halfinch, this.inchShorter),
		new MRE.Vector3(this.inch * 4.0, 0.0, 0.0),
		new MRE.Vector3(this.inch * 4.0 + this.halfinch, this.halfinch, this.inchShorter),
		new MRE.Vector3(this.inch * 5.0, 0.0, 0.0),
		new MRE.Vector3(this.inch * 5.0 + this.halfinch, this.halfinch, this.inch - 0.001),
		new MRE.Vector3(this.inch * 6.0, 0.0, 0.0)
	];


	private offset24: MRE.Vector3[] = [
		new MRE.Vector3(0.00, 0.0, 0.0),
		new MRE.Vector3(0.25 * this.whiteWide, this.halfinch, this.threeShorter),
		new MRE.Vector3(0.50 * this.whiteWide, this.inch, this.inchShorter),
		new MRE.Vector3(0.75 * this.whiteWide, this.halfinch, this.threeShorter),
		new MRE.Vector3(1.00 * this.whiteWide, 0.0, 0.0),
		new MRE.Vector3(1.25 * this.whiteWide, this.halfinch, this.threeShorter),
		new MRE.Vector3(1.50 * this.whiteWide, this.inch, this.inchShorter),
		new MRE.Vector3(1.75 * this.whiteWide, this.halfinch, this.threeShorter),
		new MRE.Vector3(2.00 * this.whiteWide, 0.0, 0.0),
		new MRE.Vector3(2.50 * this.whiteWide, this.halfinch, this.threeShorter),
		new MRE.Vector3(3.00 * this.whiteWide, 0.0, 0.0),
		new MRE.Vector3(3.25 * this.whiteWide, this.halfinch, this.threeShorter),
		new MRE.Vector3(3.50 * this.whiteWide, this.inch, this.inchShorter),
		new MRE.Vector3(3.75 * this.whiteWide, this.halfinch, this.threeShorter),
		new MRE.Vector3(4.00 * this.whiteWide, 0.0, 0.0),
		new MRE.Vector3(4.25 * this.whiteWide, this.halfinch, this.threeShorter),
		new MRE.Vector3(4.50 * this.whiteWide, this.inch, this.inchShorter),
		new MRE.Vector3(4.75 * this.whiteWide, this.halfinch, this.threeShorter),
		new MRE.Vector3(5.00 * this.whiteWide, 0.0, 0.0),
		new MRE.Vector3(5.25 * this.whiteWide, this.halfinch, this.threeShorter),
		new MRE.Vector3(5.50 * this.whiteWide, this.inch, this.inchShorter),
		new MRE.Vector3(5.75 * this.whiteWide, this.halfinch, this.threeShorter),
		new MRE.Vector3(6.00 * this.whiteWide, 0.0, 0.0),
		new MRE.Vector3(6.50 * this.whiteWide, this.halfinch, this.threeShorter),
	];

	private noteType12 = [0, 2, 0, 2, 0, 0, 2, 0, 2, 0, 2, 0]
	private noteType24 = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1];

	private octaveSize = this.inch * 7.0;
	private octaveWideSize = this.whiteWide * 7.0;


	private noteColors: MRE.Color4[] = [
		new MRE.Color4(169 / 255, 30 / 255, 16 / 255), //C
		new MRE.Color4(169 / 255, 30 / 255, 16 / 255),
		new MRE.Color4(252 / 255, 147 / 255, 8 / 255), //D
		new MRE.Color4(252 / 255, 147 / 255, 8 / 255),
		new MRE.Color4(232 / 255, 227 / 255, 14 / 255), //E
		new MRE.Color4(34 / 255, 121 / 255, 18 / 255),  //F
		new MRE.Color4(34 / 255, 121 / 255, 18 / 255),
		new MRE.Color4(23 / 255, 166 / 255, 249 / 255), //G
		new MRE.Color4(23 / 255, 166 / 255, 249 / 255),
		new MRE.Color4(19 / 255, 0 / 255, 140 / 255),   //A
		new MRE.Color4(19 / 255, 0 / 255, 140 / 255),
		new MRE.Color4(145 / 255, 0 / 255, 190 / 255)]; //B
	public noteMaterials: MRE.Material[] = [];

	private whiteKeyMesh: MRE.Mesh;
	private whiteKeyCollisionMesh: MRE.Mesh;
	private whiteKeyWideMesh: MRE.Mesh;
	private whiteKeyWideCollisionMesh: MRE.Mesh;
	private blackKeyMesh: MRE.Mesh;
	private grayKeyMesh: MRE.Mesh;

	public isNoteBlack(pitchClass: number) {
		if (this.ourPiano.isTwelveTone) {
			return (this.noteType12[pitchClass]===2);
		}
	}

	public getKeySizeByType(n: number, is12: boolean): MRE.Vector3{
		if (n === 0) {
			if(is12){
				return new MRE.Vector3(this.inch * 0.9, this.inch, this.inch * 5.5)
			} else{
				return new MRE.Vector3(this.whiteWide * 0.9, this.inch, this.inch * 5.5);
			}
		}
		if (n === 1) {
			return new MRE.Vector3(this.halfinch * 0.9, this.inch, this.inch * 4.5);
		}
		if (n === 2) {
			return new MRE.Vector3(this.halfinch, this.inch, this.inch * 3.5);
		}
	}

	public getKeyCollisionSizeByType(n: number, is12: boolean): MRE.Vector3 {
		if (n === 0) {
			if (is12) {
				return new MRE.Vector3(this.inch * 0.9, this.inch, this.inch * 2.0)
			} else {
				return new MRE.Vector3(this.whiteWide * 0.9, this.inch, this.inch * 2.0);
			}
		}
		if (n === 1 || n === 2) {
			return this.getKeySizeByType(n, is12);
		}
	}

	public getMaterialByType(n: number): MRE.Material {
		if (n === 0) {
			return this.ourApp.whiteMat;
		}
		if (n === 1) {
			return this.ourApp.grayMat;
		}
		if (n === 2) {
			return this.ourApp.almostBlackMat;
		}
	}

	public getMeshByType(n: number): MRE.Mesh {
		if (n === 0) {
			return this.whiteKeyMesh;
		}
		if (n === 1) {
			return this.grayKeyMesh;
		}
		if (n === 2) {
			return this.blackKeyMesh;
		}
	}

	public getCollisionZOffsetByType(n: number) {
		this.ourApp.ourConsole.logMessage("PIANO: trying to compute z offset for type:  " + n);

		if (n === 0) {
			return -this.inch * 1.75; //white keys have smaller collision zone
		} else {
			if (this.ourPiano.isTwelveTone) {
				return this.offset12[1].z;
			} else {
				return this.offset24[n].z;
			}
		}
	}

	public getCollisionMeshByType(n: number): MRE.Mesh {
		if (n === 0) {
			if (this.ourPiano.isTwelveTone) {
				return this.whiteKeyCollisionMesh;
			} else {
				return this.whiteKeyWideCollisionMesh;
			}
		}
		
		if (n === 0) {
			return this.whiteKeyMesh;
		}
		if (n === 1) {
			return this.grayKeyMesh;
		}
		if (n === 2) {
			return this.blackKeyMesh;
		}
	}

	public getPosition(n: number) {
		if (this.ourPiano.isTwelveTone) {
			const pitchClass12 = n % 12;

			return new MRE.Vector3(
				this.computePosX(n),
				this.offset12[pitchClass12].y,
				this.offset12[pitchClass12].z);

		
		} else {
			const pitchClass24 = (n * 2) % 24;

			return new MRE.Vector3(
				this.computePosX(n),
				this.offset24[pitchClass24].y,
				this.offset24[pitchClass24].z);
		}
	}

	public getNoteType(note: number): number{
		if (this.ourPiano.isTwelveTone) {
			const pitchClass12 = note % 12;
			return this.noteType12[pitchClass12];

		} else{
			const pitchClass24 = (note * 2.0) % 24;
			return this.noteType24[pitchClass24];
		}
	}

	public getMesh(note: number): MRE.Mesh{
		let mesh = this.blackKeyMesh;

		if (this.ourPiano.isTwelveTone) {
			const pitchClass12 = note % 12;
			mesh=this.getMeshByType(this.noteType12[pitchClass12]);

		} else{
			const pitchClass24 = note % 24;
			mesh=this.getMeshByType(this.noteType24[pitchClass24]);
		}

		return mesh;
	}

	public computePosX(i: number): number {
		let oSize = this.octaveSize;

		if (this.ourPiano.isTwelveTone === false) {
			oSize = this.octaveWideSize;
		}

		const centerNote = 60;
		let noteDiff = i - centerNote;
		let baseX = 0.0;

		const octaves = Math.floor(noteDiff / 12.0);
		baseX += octaves * oSize;
		noteDiff -= octaves * 12;

		if (noteDiff > 0) {
			if(this.ourPiano.isTwelveTone){
				baseX += this.offset12[noteDiff].x; //add remaining notes
			} else{
				const offsetIndex=Math.trunc(noteDiff*2.0);
				//this.ourApp.ourConsole.logMessage("PIANO: offset index " + offsetIndex);
				baseX += this.offset24[offsetIndex].x;
			}
		}
		if (noteDiff < 0) {
			baseX -= oSize; //go down one octave
			if (this.ourPiano.isTwelveTone) {
				baseX += this.offset12[noteDiff].x; //and back up
			} else {
				const offsetIndex = Math.trunc(24.0 + noteDiff * 2.0);
				//this.ourApp.ourConsole.logMessage("PIANO: offset index " + offsetIndex);
				baseX += this.offset24[offsetIndex].x; //and back up
			}
		}

		return baseX;
	}

	constructor(protected ourApp: App, protected ourPiano: Piano) {

	}

	public async createAsync() {
		let meshSize = this.getKeySizeByType(0, true);
		this.whiteKeyMesh = this.ourApp.assets.createBoxMesh('box', meshSize.x, meshSize.y, meshSize.z);
		await this.whiteKeyMesh.created;

		meshSize = this.getKeyCollisionSizeByType(0, true);
		this.whiteKeyCollisionMesh = this.ourApp.assets.createBoxMesh('box', meshSize.x, meshSize.y, meshSize.z);
		await this.whiteKeyCollisionMesh.created;

		meshSize = this.getKeySizeByType(0, false);
		this.whiteKeyWideMesh = this.ourApp.assets.createBoxMesh('box', meshSize.x, meshSize.y, meshSize.z);
		await this.whiteKeyWideMesh.created;

		meshSize = this.getKeyCollisionSizeByType(0, false);
		this.whiteKeyWideCollisionMesh = this.ourApp.assets.createBoxMesh('box', meshSize.x, meshSize.y, meshSize.z);
		await this.whiteKeyWideCollisionMesh.created;

		meshSize = this.getKeySizeByType(2,true);
		this.blackKeyMesh = this.ourApp.assets.createBoxMesh('box', meshSize.x, meshSize.y, meshSize.z);
		await this.blackKeyMesh.created;

		meshSize = this.getKeySizeByType(1,true);
		this.grayKeyMesh = this.ourApp.assets.createBoxMesh('box', meshSize.x, meshSize.y, meshSize.z);
		await this.grayKeyMesh.created;

		for (const noteColor of this.noteColors) {
			const ourMat: MRE.Material = this.ourApp.assets.createMaterial('notemat', {
				color: noteColor
				//mainTextureId: this.sphereTexture.id
			});
			await ourMat.created;
			this.noteMaterials.push(ourMat);
		}
	}

	public updateKey(i: number){
		if(this.ourPiano.ourKeys.has(i)===false){
			this.ourApp.ourConsole.logMessage("PIANO: ERROR: note not available to update " + i);
			return;
		}

		const key=this.ourPiano.ourKeys.get(i);
		const noteType=this.getNoteType(i);

		const pos=this.getPosition(i);
		key.actor.transform.local.position=pos;

		const positionCollision = pos.clone();
		positionCollision.z = this.getCollisionZOffsetByType(noteType);
		key.collisionActor.transform.local.position=positionCollision;
	
		key.actor.appearance.meshId= this.getMeshByType(noteType).id;
		key.actor.appearance.materialId = this.getMaterialByType(noteType).id;
		key.collisionActor.appearance.meshId= this.getCollisionMeshByType(noteType).id;
	
		key.position=pos;
		key.collisionPos=positionCollision;
		key.collisionSize = this.getKeyCollisionSizeByType(noteType, this.ourPiano.isTwelveTone);
	}

	public async createKey(i: number) {
		this.ourApp.ourConsole.logMessage("PIANO: creating key: " + i);

		const noteType=this.getNoteType(i);

		const position = this.getPosition(i);
		const positionCollision = position.clone();
		positionCollision.z = this.getCollisionZOffsetByType(noteType);

		const meshId: MRE.Guid = this.getMeshByType(noteType).id;
		const collisionMeshID: MRE.Guid = this.getCollisionMeshByType(noteType).id;
		const mattId: MRE.Guid = this.getMaterialByType(noteType).id;
		const collisionSize: MRE.Vector3 = this.getKeyCollisionSizeByType(noteType, this.ourPiano.isTwelveTone);

		const keyActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'PianoKey' + i,
				parentId: this.ourPiano.keyboardParent.id,
				transform: {
					local: { position: position }
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
				parentId: this.ourPiano.keyboardParent.id,
				transform: {
					local: { position: positionCollision }
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
					isTrigger: true				}
			}
		});
		await keyCollisionActor.created();

		const ourKeyParameters = {
			actor: keyActor,
			collisionActor: keyCollisionActor,
			noteActor: null as MRE.Actor,
			position: position,
			collisionPos: positionCollision,
			touchList: [] as MRE.Actor[],
			worldPos: this.ourPiano.computeWorldPos(position),
			collisionWorldPos: this.ourPiano.computeWorldPos(positionCollision),
			collisionSize: collisionSize,
			keyBounds: [] as number[]
		};

		for (let e = 0; e < 6; e++) {
			ourKeyParameters.keyBounds.push(0);
		}

		this.ourPiano.ourKeys.set(i, ourKeyParameters);
		this.ourPiano.setupInteractions(i);

	}	

	public setProperKeyColor(note: number) {
		if (this.ourPiano.ourKeys.has(note) === false) {
			return;
		}
		const key = this.ourPiano.ourKeys.get(note);
		key.actor.appearance.material = this.getMaterialByType(this.getNoteType(note));
	}

	public setFancyKeyColor(note: number) {
		if (this.ourPiano.ourKeys.has(note) === false) {
			return;
		}

		const key = this.ourPiano.ourKeys.get(note);
		const pitchClass12 = Math.trunc(note % 12);

		const materialID = this.noteMaterials[pitchClass12].id;
		key.actor.appearance.materialId = materialID;
	}
}
