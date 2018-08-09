import { TabIdentifier, TabWindowOptions } from "../../shared/types";
import { TabGroup } from "./TabGroup";
import { TabService } from "./TabService";
/**
 * Ejects or moves a tab/tab group based criteria passed in.
 *
 * 1. If we receive a screenX & screenY position, we check if a tab group + tab app is under that point.  If there is a window under that point we check if their URLs match and if they do, we allow tabbing to occur.  If not, we cancel out.
 *
 *
 * 2. If we receive a screenX & screenY position, we check if a tab group + tab app is under that point.  If there is not a window under that point we create a new tab group + tab
 * 	at the screenX & screenY provided if there are more than 1 tabs in the original group. If there is only one tab we move the window.
 *
 *
 * 3. If we dont receive a screenX & screenY position, we create a new tabgroup + tab at the app windows existing position.
 *
 * @param tabService The service itself which holds the tab groups
 * @param message Application or tab to be ejected
 */
export declare function ejectTab(tabService: TabService, message: TabIdentifier & TabWindowOptions, tabGroup?: TabGroup | undefined): Promise<void>;
/**
 * Creates a new tab group and adds a tab to it.
 * @param message Tab window options
 * @param uuid the uuid of the application to add as a tab
 * @param name the name of the application to add as a tab
 * @param tabService The tab service
 */
export declare function initializeTabbing(message: TabWindowOptions, uuid: string, name: string, tabService: TabService): Promise<void>;
