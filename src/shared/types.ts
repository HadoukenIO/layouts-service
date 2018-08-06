export interface TabIndentifier {
	name: string;
	uuid: string;
}

export interface TabOptions {
	alignTabWindow?: boolean;
	screenX?: number;
	screenY?: number;
}

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

export interface TabbedEventPayload {
	tabGroupID: string;
}
