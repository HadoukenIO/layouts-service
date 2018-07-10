import { Identity } from "hadouken-js-adapter/out/types/src/identity";

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

export interface Context {
    fdc3: any;
}

export interface WindowState extends Bounds {
    uuid: string;
    name: string;
    isShowing: boolean;
    state: string;
    info: any; // getinfo call...
    windowGroup: Identity[];
    contextGroups: string[];
    customData: any; // applications can add any necessary data here
    image: any;
}

export interface LayoutApp {
    manifestUrl?: string;
    manifest?: any; // FILL ME IN! Does this exist somewhere???
    parentUuid?: string;
    initialOptions?: any;
    launchMode?: string;
    uuid: string;
    mainWindow: WindowState;
    childWindows: WindowState[];
    confirmed?: boolean;
    customData?: any;
}

export type LayoutName = string;

export interface Layout {
    monitorInfo: any;
    type: string;
    name: LayoutName;
    systemStartup?: boolean;
    bounds?: Bounds;
    apps: LayoutApp[];
}

export interface AppToRestore {
    resolve: Function;
    layoutApp: LayoutApp;
}

/* Workflows

Setting A Layout
1.) setLayout - user-generated (global hotkey?) or app-generated (from client Service message)
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