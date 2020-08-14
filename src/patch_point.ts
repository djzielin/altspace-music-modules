/*!
 * Licensed under the MIT License.
 */

import MusicModule from './music_module';
import Button from './button';
import GuiPanel from './gui_panel';

export default class PatchPoint{
	public module: MusicModule;
	public messageType: string;
	public isSender: boolean;
	public gui: GuiPanel;
	public button: Button;
}