/*!
 * Licensed under the MIT License.
 */

import MusicModule from '../music_module';
import Button from '../button';
import GuiPanel from '../gui_panel';

export default class PatchPoint{
	public module: MusicModule;
	public messageType: string;
	public isSender: boolean;
	public gui: GuiPanel;
	public button: Button;

	public isEqual(p: PatchPoint): boolean {
		if (this.module !== p.module) {
			return false;
		}
		if (this.messageType !== p.messageType) {
			return false;
		}
		if (this.isSender !== p.isSender) {
			return false;
		}
		if (this.gui !== p.gui) {
			return false;
		}
		if (this.button !== p.button) {
			return false;
		}

		return true;
	}
}
