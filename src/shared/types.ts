export enum EjectTriggers {
	DRAG = "DRAG",
	API = "API"
}

export interface TabIndentifier {
	name: string;
	uuid: string;
}

// export enum ClientIABTopics {
// 	CHANGEICON = "CHANGICON",
// 	EJECTREQUEST = "EJECTREQUEST",
// 	DISCOVER = "DISCOVER",
// 	DISCOVERRETURN = "DISCOVERRETURN",
// 	JOINREQUEST = "JOINREQUEST"
// }

export interface TabOptions {
	alignTabWindow?: boolean;
	screenX?: number;
	screenY?: number;
}

// export interface TabEjectEvent {
// 	name: string;
// 	uuid: string;
// 	trigger: EjectTriggers;
// 	screenX?: number;
// 	screenY?: number;
// 	width?: number;
// 	height?: number;
// }

export enum ServiceIABTopics {
	CLIENTINIT = "CLIENTINIT",
	TABEJECTED = "TABEJECTED",
	UPDATETABPROPERTIES = "UPDATETABPROPERTIES"
}

export interface TabProperties {
	title?: string;
	icon?: string;
}

export interface TabWindowOptions {
	url?: string;
	screenX?: number;
	screenY?: number;
	width?: number;
	height?: number;
}

export interface TabPackage {
	tabID: TabIndentifier;
	tabProps?: TabProperties;
}
export enum Events {}

export enum TabApiEvents {
	TABADDED = "TABADDED",
	TABREMOVED = "TABREMOVED",
	PROPERTIESUPDATED = "PROPERTIESUPDATED",
	TABACTIVATED = "TABACTIVATED"
}

/**
 * @description The action the tab client api will send to the service,
 * this will determine which action to execute on service side
 */
export enum TabAPIActions {
	STARTDRAG = "STARTDRAG",
	ENDDRAG = "ENDDRAG",
	ADD = "ADD",
	EJECT = "EJECT",
	CLOSE = "CLOSE",
	ACTIVATE = "ACTIVATE",
	UPDATEPROPERTIES = "UPDATEPROPERTIES"
}

/**
 * @description Each action coming into the will have an action attached
 */
export interface TabAPIMessage {
	action: string;
}

/**
 * @description When the tab API makes a call to the service a uuid and name should be provided
 */
export interface TabAPIInteractionMessage extends TabAPIMessage {
	uuid: string;
	name: string;
	properties?: TabProperties;
}

export interface TabAPIDragMessage extends TabAPIMessage {
	event: TabWindowOptions | null;
	uuid: string;
	name: string;
}

export enum ClientIABTopics {
	TABBED = "TABBED",
	UNTABBED = "UNTABBED"
}
//

export interface IsOverWindowResult {
	result: boolean;
	window?: fin.OpenFinWindow | null;
}

export enum TabAPIWindowActions {
	MAXIMIZE = "MAXIMIZEWINDOW",
	MINIMIZE = "MINIMIZEWINDOW",
	RESTORE = "RESTOREWINDOW",
	CLOSE = "CLOSEWINDOW"
}
