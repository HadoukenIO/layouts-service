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

export enum ClientUIIABTopics {
	TABADDED = "TABADDED",
	TABREMOVED = "TABREMOVED",
	PROPERTIESUPDATED = "PROPERTIESUPDATED",
	TABACTIVATED = "TABACTIVATED"
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
