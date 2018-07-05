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
