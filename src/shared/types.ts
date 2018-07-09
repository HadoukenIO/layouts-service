export enum EjectTriggers {
	DRAG = "DRAG",
	API = "API"
}

export interface TabIndentifier {
	name: string;
	uuid: string;
}

export enum ClientIABTopics {
	CHANGEICON = "CHANGICON",
	EJECTREQUEST = "EJECTREQUEST",
	DISCOVER = "DISCOVER",
	DISCOVERRETURN = "DISCOVERRETURN",
	JOINREQUEST = "JOINREQUEST"
}

export interface TabOptions {
	alignTabWindow?: boolean;
	screenX?: number;
	screenY?: number;
}

export interface TabEjectEvent {
	name: string;
	uuid: string;
	trigger: EjectTriggers;
	screenX?: number;
	screenY?: number;
	width?: number;
	height?: number;
}
