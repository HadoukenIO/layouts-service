export interface TabIdentifier {
    name: string;
    uuid: string;
}
export declare enum TabServiceID {
    NAME = "TABBING_MAIN",
    UUID = "TABBING_MAIN"
}
export interface TabOptions {
    alignTabWindow?: boolean;
    screenX?: number;
    screenY?: number;
}
export declare enum ServiceIABTopics {
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
    tabID: TabIdentifier;
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
export interface TabBlob {
    groupInfo: {
        url: string;
        active: TabIdentifier;
        dimensions: {
            x: number;
            y: number;
            width: number;
            setHeight: number;
            appHeight: number;
        };
    };
    tabs: TabIdentifier[];
}
