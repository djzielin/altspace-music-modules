/*!
 * Licensed under the MIT License.
 */

import * as MRE from '../../../mixed-reality-extension-sdk/packages/sdk/';

import App from '../app';
import Button from '../gui/button';
import GuiPanel from '../gui/gui_panel';
import MusicModule from '../backend/music_module';
import PatchPoint from './patch_point';

interface PatchProperties{
	sender: PatchPoint;
	receiver: PatchPoint;
	line: MRE.Actor;
}

export default class Patcher{
	public ourPatches: PatchProperties[]=[];
	private potentialPatchStack: PatchPoint[] = [];

	constructor(protected ourApp: App) {

	}

	public isPatchEqual(patch1: PatchProperties, patch2: PatchProperties){
		if(!patch1.sender.isEqual(patch2.sender)){
			return false;
		}

		if(!patch1.receiver.isEqual(patch2.receiver)){
			return false;
		}

		return true;
	}

	public getPatchPointWorldPosition(patchPoint: PatchPoint, isSender: boolean): MRE.Vector3{
		const offset=new MRE.Vector3(0.75/2,0.1/2,0);
		if(!isSender){
			offset.x=-0.75/2
		}

		return patchPoint.gui.transformPoint(patchPoint.button.getHolderPos().add(offset));
	}

	public updatePatchLines(gui: GuiPanel){
		this.ourApp.ourConsole.logMessage("PATCHER: Grab Release happening. Updating Patcher Lines!");

		for (const existingPatch of this.ourPatches) {
			if(existingPatch.sender.gui===gui || existingPatch.receiver.gui===gui){
				const pos1=this.getPatchPointWorldPosition(existingPatch.sender,true);
				const pos2=this.getPatchPointWorldPosition(existingPatch.receiver,false);
				existingPatch.sender.gui.updatePatchLine(existingPatch.line,pos1,pos2);		
			}
		}
	}

	public showPatchLines(){
		for (const existingPatch of this.ourPatches) {
			if(existingPatch.line){
				existingPatch.line.appearance.enabled=true;
			}
		}
	}

	public hidePatchLines(){
		for (const existingPatch of this.ourPatches) {
			if(existingPatch.line){
				existingPatch.line.appearance.enabled=false;
			}
		}
	}

	public removeAttachedPatches(gui: GuiPanel) {
		const patchesToDelete: PatchProperties[]=[];

		for (const patch of this.ourPatches) {
			if(patch.receiver.gui){
				if(patch.receiver.gui===gui){
					this.ourApp.ourConsole.logMessage("PATCHER:  found patch to delete");
					this.ourApp.ourConsole.logMessage("   Sender - " + patch.sender.module.name);
					this.ourApp.ourConsole.logMessage("   Receiver - " + patch.receiver.module.name);

					patchesToDelete.push(patch);
					this.deletePatch(patch);
				}
			
			}
			if(patch.sender.gui){
				if(patch.sender.gui===gui){
					this.ourApp.ourConsole.logMessage("PATCHER:  found patch to delete");
					this.ourApp.ourConsole.logMessage("   Sender - " + patch.sender.module.name);
					this.ourApp.ourConsole.logMessage("   Receiver - " + patch.receiver.module.name);
					
					patchesToDelete.push(patch);
					this.deletePatch(patch);
				}			
			}
		}

		for(const patch of patchesToDelete)
		{
			this.deletePatchEntry(patch);			
		}
	}

	private deletePatchEntry(patch: PatchProperties) {
		const index = this.ourPatches.indexOf(patch);
		if (index > -1) {
			this.ourPatches.splice(index, 1);
			this.ourApp.ourConsole.logMessage("PATCHER:  deleting patch entry");
		} else{
			this.ourApp.ourConsole.logMessage("PATCHER:  ERROR! couldn't find patch in patch list!");
		}
	}

	private deletePatch(patch: PatchProperties) {
		patch.sender.module.removeSendDestination(patch.receiver);
		if (patch.line) {
			patch.line.destroy();
			this.ourApp.ourConsole.logMessage("PATCHER:  deleting line");
		} else{
			this.ourApp.ourConsole.logMessage("PATCHER:  no line to delete?");
		}
	}

	public applyPatch(sender: PatchPoint, receiver: PatchPoint) {
		const newPatch = {
			sender: sender,
			receiver: receiver,
			line: null as MRE.Actor
		}

		for (const existingPatch of this.ourPatches) {
			if (this.isPatchEqual(existingPatch,newPatch)) { //already exists! so DELETE
				this.ourApp.ourConsole.logMessage("PATCHER:  patch already exists. deleting!");
				this.deletePatch(existingPatch);
				this.deletePatchEntry(existingPatch);
				return;
			}
		}

		this.ourApp.ourConsole.logMessage("PATCHER:  patch doesn't yet exist. adding!");		
		sender.module.sendDestinations.push(receiver);

		if (newPatch.sender.gui && newPatch.receiver.gui) {
			const pos1 = this.getPatchPointWorldPosition(newPatch.sender, true);
			const pos2 = this.getPatchPointWorldPosition(newPatch.receiver, false);
			newPatch.line = sender.gui.createPatchLine(pos1, pos2);
		}

		this.ourPatches.push(newPatch);
	}

	public patcherClickEvent(module: MusicModule, messageType: string, isSender: boolean,
		gui: GuiPanel, button: Button) {

		const patchType: string = isSender ? "sender" : "receiver";
		this.ourApp.ourConsole.logMessage("PATCHER: received patch point: " + messageType + " " + patchType);

		const potentialPatchPoint = new PatchPoint();
		potentialPatchPoint.module = module;
		potentialPatchPoint.messageType = messageType;
		potentialPatchPoint.isSender = isSender;
		potentialPatchPoint.gui = gui;
		potentialPatchPoint.button= button;		

		this.potentialPatchStack.push(potentialPatchPoint);

		if(this.potentialPatchStack.length===2){ 
			this.ourApp.ourConsole.logMessage("PATCHER:  have 2 pending patch points, checking if we have a match!");

			let sender: PatchPoint=null;
			let receiver: PatchPoint=null;

			for(const singlePatchPoint of this.potentialPatchStack){
				if(singlePatchPoint.isSender){
					sender=singlePatchPoint;
				}else{
					receiver=singlePatchPoint;
				}
			}

			if(sender && receiver){ //great, we got both a sender and a receiver
				if(sender.messageType===receiver.messageType){ //do message types match? ie both midi?
					//if(sender.gui!==receiver.gui){
						this.ourApp.ourConsole.logMessage("PATCHER:  we have a match!");
						this.applyPatch(sender,receiver);
					//} else{
					//	this.ourApp.ourConsole.logMessage("PATCHER:  not allowing user to route back to self");
					//}
				} else {
					this.ourApp.ourConsole.logMessage("PATCHER:  incompatible message type");
				}
			} else {
				this.ourApp.ourConsole.logMessage("PATCHER:  no match. both are senders or receivers");
			}

			for (const singlePatchPoint of this.potentialPatchStack) { //set both buttons back to green
				if (singlePatchPoint.button) {
					singlePatchPoint.button.setValue(true, false);
				}
			}

			this.potentialPatchStack.pop();
			this.potentialPatchStack.pop();
		} else {
			this.ourApp.ourConsole.logMessage("PATCHER:  not doing anything as we have num patches waiting: " +
				this.potentialPatchStack.length);
		}
	}
}
