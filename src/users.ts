/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import Button from './button';
import App from './app';

/**
 * The main class of this app. All the logic goes here.
 */

interface UserProperties {
	name: string;
	user: MRE.User;
	userID: MRE.Guid;
	lHand: MRE.Actor;
	rHand: MRE.Actor;
	isModerator: boolean;
}

export default class Users {

	public allUsers: UserProperties[] = [];
	public moderatorUsers: string[] = [];

	constructor(private ourApp: App) {

	}

	public isAuthorized(user: MRE.User): boolean {
		const ourRoles = user.properties["altspacevr-roles"];

		if (ourRoles.includes("moderator") || ourRoles.includes("presenter") ||
			ourRoles.includes("terraformer")) {
			return true;
		}

		return false;
	}

	public isAuthorizedString(user: string): boolean {
		if (this.moderatorUsers.includes(user)) {
			//this.ourConsole.logMessage("user is moderator based on GUID");
			return true;
		}

		//this.ourConsole.logMessage("user is NOT moderator based on GUID");
		return false;
	}


	public userJoined(user: MRE.User) {
		this.ourApp.ourConsole.logMessage("user joined. name: " + user.name + " id: " + user.id);

		let isModerator = false

		if (this.isAuthorized(user)) {
			this.ourApp.ourConsole.logMessage("  user is authorized");
			isModerator = true;
		} else{
			this.ourApp.ourConsole.logMessage("  user is NOT authorized");
		}

		const rHand: MRE.Actor = null;
		const lHand: MRE.Actor = null;

		const ourUser = {
			name: user.name,
			user: user,
			userID: user.id,
			authButton: null as Button,
			handButton: null as Button,
			rHand: rHand,
			lHand: lHand,
			isModerator: isModerator
		}
		this.allUsers.push(ourUser);

		if (isModerator) {
			this.moderatorUsers.push(user.id.toString());
		}

		this.addHands(ourUser);
	}

	public findUserRecord(userID: MRE.Guid): UserProperties {
		for (let i = 0; i < this.allUsers.length; i++) {
			const ourUser = this.allUsers[i];
			if (ourUser.userID === userID) {
				return ourUser;
			}
		}

		this.ourApp.ourConsole.logMessage("ERROR: can't find userID: " + userID);
		return null;
	}	

	public userLeft(user: MRE.User) {
		this.ourApp.ourConsole.logMessage("user left. name: " + user.name + " id: " + user.id);
		this.ourApp.ourConsole.logMessage("  user array pre-deletion is size: " + this.allUsers.length);

		for (let i = 0; i < this.allUsers.length; i++) {
			const ourUser = this.allUsers[i];

			if (ourUser.userID === user.id) {				
				this.allUsers.splice(i, 1);

				if (ourUser.isModerator) {
					const userString = user.id.toString();

					const index = this.moderatorUsers.indexOf(userString);
					if (index !== -1) {
						this.moderatorUsers.splice(index, 1);
						this.ourApp.ourConsole.logMessage("removed user from moderator string list");
					}
				}

				//this.removeHands(ourUser);

				break;
			}
		}

		this.ourApp.ourConsole.logMessage("  user array is now size: " + this.allUsers.length);
	}

	private addHands(ourUser: UserProperties) {
		this.ourApp.ourConsole.logMessage("creating hands for: " + ourUser.name);

		ourUser.rHand = this.createHand('right-hand', ourUser.userID, new MRE.Vector3(0, 0, 0.1),
			new MRE.Vector3(0.03, 0.03, 0.14));
		ourUser.lHand = this.createHand('left-hand', ourUser.userID, new MRE.Vector3(0, 0, 0.1),
			new MRE.Vector3(0.03, 0.03, 0.14));
	}

	private createHand(aPoint: string, userID: MRE.Guid, handPos: MRE.Vector3, handScale: MRE.Vector3) {
		const hand = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: 'SpawnerUserHand_' + userID.toString(),
				transform: {
					local: {
						position: handPos,
						scale: handScale
					}
				},
				attachment: {
					attachPoint: aPoint as MRE.AttachPoint,
					userId: userID
				},
				appearance:
				{
					meshId: this.ourApp.boxMesh.id,
					enabled: false
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Box
					},
					isTrigger: false
				},
				rigidBody: {
					enabled: true,
					isKinematic: true
				}
			}
		});

		//hand.subscribe('transform');
		//hand.subscribe('rigidbody');
		//hand.subscribe('collider');

		return hand;
	}	
}
