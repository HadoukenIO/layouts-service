import { ChannelProvider } from "hadouken-js-adapter/out/types/src/api/interappbus/channel/provider";
import { Identity, Window as FinWindow } from "hadouken-js-adapter";
import { Rectangle } from "../src/provider/snapanddock/utils/RectUtils";
import { Point } from "../src/provider/snapanddock/utils/PointUtils";
import { AsyncWindow } from "../src/provider/tabbing/asyncWindow";
import { TabWindowOptions, TabProperties, TabBlob } from "../src/client/types";

declare global {
    interface Window {
        snapService: SnapService;
        tabService: TabService;
        providerChannel: ChannelProvider

        createTabGroupsFromTabBlob(tabBlob: TabBlob[]): Promise<void>
    }
}

declare class SnapService {
    windows: SnapWindow[];
    groups: SnapGroup[];

    undock(target: Identity): void;
    deregister(target: Identity): void;
    explodeGroup(targetWindow: Identity): void;

    getSnapWindow(finWindow: Identity): SnapWindow | undefined;
}

declare class SnapWindow {
    static getWindowState: (window: fin.OpenFinWindow) => Promise<WindowState>;

    registeredLiseners: Map<any,any>;

    getID(): string;
    getWindow(): FinWindow;
    getGroup(): SnapGroup;
    getPrevGroup(): SnapGroup;
    getState(): WindowState;
    getIdentity(): Identity;

    setGroup(group: SnapGroup, offset?: Point, newHalfSize?: Point, synthetic?: boolean): void;
    offsetBy(offset: Point): void;
}

declare interface WindowState extends Rectangle {
    center: Point;
    halfSize: Point;

    frame: boolean;
    hidden: boolean;
    state: 'normal'|'minimized'|'maximized';

    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;

    opacity: number;
}

declare class SnapGroup {
    readonly id: number;
    readonly origin: Readonly<Point>;
    readonly halfSize: Readonly<Point>;
    readonly center: Point;
    readonly length: number;
    readonly isTabGroup: boolean;
    readonly windows: SnapWindow[];

    addWindow(window: SnapWindow): void;
}

declare class TabService {
    static INSTANCE: TabService;
    disableTabbingOperations: boolean;
    
    readonly tabGroups: TabGroup[];
    readonly dragWindowManager: any;
    readonly applicationConfigManager: any;

    removeTabGroup(ID: string, closeApps: boolean): Promise<void>;
    getTabGroup(ID: string): TabGroup|undefined;
    getTabGroupByApp(identity: Identity): TabGroup|undefined;
    getTab(identity: Identity): Tab|undefined;
    createTabGroupWithTabs(tabs: Identity[]): Promise<void>;
    isPointOverTabGroup(x: number, y: number): Promise<TabGroup|null>;
}

declare class TabGroup {
    readonly ID: string;

    addTab(tab: Tab, handleTabSwitch?: boolean, handleAlignment?: boolean, index?: number): Promise<Tab>;
    removeTab(tabID: Identity, closeApp: boolean, closeGroupWindowCheck?:boolean, switchTab?: boolean, restoreWindowState?: true): Promise<void>;
    switchTab(ID: Identity, hideActiveTab?:boolean): Promise<void>;
    removeAllTabs(closeApp:boolean): Promise<void[]>;
    getTab(tabID: Identity): Tab|undefined;
    setActiveTab(tab: Tab): void;
    getTabIndex(tabID: Identity): number;

    readonly activeTab: Tab;
    readonly window: GroupWindow;
    readonly tabs: Tab[];
}

declare class Tab {
    init(): Promise<void>;
    deInit(): Promise<void>;
    sendTabbedEvent(): Promise<void>;
    remove(closeApp: boolean): Promise<void>;
    updateTabProperties(props: TabProperties): void;

    readonly tabGroup: TabGroup;
    readonly window: TabWindow;
    readonly ID: Identity;
}

declare class TabWindow extends AsyncWindow {
    readonly windowOptions: fin.WindowOptions;

    showWindow(): Promise<void>;
    hideWindow(): Promise<void>;
    alignPositionToTabGroup(): Promise<void>;
}

declare class GroupWindow extends AsyncWindow {

    alignPositionToApp(app: TabWindow): Promise<void>;
    toggleMaximize(): Promise<void|void[]>;
    maximizeGroup(): Promise<void>;
    restoreGroup(): Promise<void|void[]>;
    minimizeGroup(): Promise<[Promise<void>,void[]]>;
    closeGroup(): Promise<void>;

    updateInitialWindowOptions(update: TabWindowOptions): void;

    initialWindowOptions: TabWindowOptions;
    isMaximized: boolean;
}