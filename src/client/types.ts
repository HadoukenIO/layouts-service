/*tslint:disable:no-any*/
import {WindowInfo} from 'hadouken-js-adapter/out/types/src/api/window/window';
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

export type CustomData = any;

export interface WindowState extends Bounds {
    uuid: string;
    name: string;
    isShowing: boolean;
    state: string;
    frame: boolean;
    info: any;  // getinfo call...
    windowGroup: Identity[];
    customData?: CustomData;  // applications can add any context or other necessary data here
    isTabbed: boolean;
}

export interface LayoutApp {
    manifestUrl?: string;
    initialOptions?: any;
    uuid: string;
    mainWindow: WindowState;
    childWindows: WindowState[];
    confirmed?: boolean;
    customData?: any;  // applications can add any context or other necessary data here
}

export type LayoutName = string;

export interface Layout {
    type: 'layout';
    monitorInfo: any;  // saving but not using yet
    customData?: any;
    apps: LayoutApp[];
    tabGroups: TabBlob[];
}

export interface AppToRestore {
    resolve: Function;
    layoutApp: LayoutApp;
}

export interface LayoutWindowData {
    info: WindowInfo;
    uuid: string;
    windowGroup: Identity[];
    frame: boolean;
    state: 'normal'|'minimized'|'maximised';
    isTabbed: boolean;
    isShowing: boolean;
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
    NAME = 'layouts-service',
    UUID = 'layouts-service'
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
    title: string;
    icon: string;
}

export interface ApplicationUIConfig {
    url: string;
    height: number;
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
    event: ApplicationUIConfig|null;
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

export interface DropPosition {
    screenX: number;
    screenY: number;
}

export interface TabGroupEventPayload {
    tabGroupId: string;
    tabID: TabIdentifier;
}

export interface JoinTabGroupPayload extends TabGroupEventPayload {
    tabProps: TabProperties;
    index: number;
}

export interface SetTabClientPayload {
    config: Partial<ApplicationUIConfig>;
    id: Identity;
}

export interface AddTabPayload {
    targetWindow: Identity;
    windowToAdd: Identity;
}

export interface UpdateTabPropertiesPayload {
    window: Identity;
    properties: Partial<TabProperties>;
}

export interface EndDragPayload {
    event: DropPosition;
    window: Identity;
}

export const CHANNEL_NAME = 'of-layouts-service-v1';