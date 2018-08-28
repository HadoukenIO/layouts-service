/*tslint:disable:no-any*/
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

export interface Url {
    url: string;
}

export interface Bounds {
    height: number;
    width: number;
    top: number;
    left: number;
    right?: number;
    bottom?: number;
}

export interface WindowState extends Bounds {
    uuid: string;
    name: string;
    isShowing: boolean;
    state: string;
    info: any;  // getinfo call...
    windowGroup: Identity[];
    contextGroups: string[];
    customData?: any;  // applications can add any context or other necessary data here
}

export interface LayoutApp {
    manifestUrl?: string;
    parentUuid?: string;
    initialOptions?: any;
    launchMode?: string;
    uuid: string;
    mainWindow: WindowState;
    childWindows: WindowState[];
    confirmed?: boolean;
    customData?: any;  // applications can add any context or other necessary data here
}

export type LayoutName = string;

export interface Layout {
    monitorInfo: any;  // saving but not using yet
    type: string;      // not using yet
    name: LayoutName;
    customData?: any;
    systemStartup?: boolean;  // not using yet
    bounds?: Bounds;          // not using yet
    apps: LayoutApp[];
}

export interface AppToRestore {
    resolve: Function;
    layoutApp: LayoutApp;
}

/* Workflows

Setting A Layout
1.) saveCurrentLayout - user-generated (global hotkey?) or app-generated (from client Service message)
2.) willSaveLayout - sent to each connected application > response includes child windows that will be handled / context per window
3.) layoutSaved - final Layout sent with this event, layout saved in Layouts app to indexedDB

Restoring A Layout
1.) restoreLayout - user-generated (global hotkey?) or app-generated (from client Service message)
2.) Layouts service wraps each app - checks isRunning (API Call)
    a.) Running & Connected (to service as client) Apps
        1.) move apps/windows that are open (do we want to do this? or let connection handle)
        2.) send restoreApp with LayoutApp payload to each connected client
        3.) response will indicate if enacted (layout object with unhandled stuff removed)
    b.) Running but not connected Apps
        1.) move apps(/windows?) that are open
        2.) re-create LayoutApp shape for response to layoutRestored / client service request
    c.) Apps not Running
        1.) Launch app (from manifest?) and regroup / move to correct bounds
        2.) if saved appLayout is confirmed:true put respective LayoutApps into map for onConnection sending of appRestore
3.) Await resolve of all promises from connected client apps
4.) layoutRestored event fired
*/

export interface TabIdentifier {
    name: string;
    uuid: string;
}

export enum TabServiceID {
    NAME = 'Layout-Manager',
    UUID = 'Layout-Manager'
}

export interface TabOptions {
    alignTabWindow?: boolean;
    screenX?: number;
    screenY?: number;
}

export enum ServiceIABTopics {
    CLIENTINIT = 'CLIENTINIT',
    TABEJECTED = 'TABEJECTED',
    UPDATETABPROPERTIES = 'UPDATETABPROPERTIES'
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
    index?: number;
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
    event: TabWindowOptions|null;
    uuid: string;
    name: string;
}

export interface TabbedEventPayload {
    tabGroupID: string;
}

export interface Dimensions {
    x: number;
    y: number;
    width: number;
    tabGroupHeight: number;
    appHeight: number;
}

export interface Group {
    url: string;
    active: TabIdentifier;
    dimensions: Dimensions;
}

export interface TabBlob {
    groupInfo: Group;
    tabs: TabIdentifier[];
}

export interface TabAPIReorderMessage extends TabAPIMessage {
    tabOrder: TabIdentifier[];
}

export interface ApplicationUIConfig {
    uuid: string;
    config: TabWindowOptions;
}