import {Window} from 'hadouken-js-adapter';
import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {WindowDetail} from 'hadouken-js-adapter/out/types/src/api/system/window';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';
import {WorkspaceApp, WorkspaceWindow} from '../../client/types';
import {model, tabService} from '../main';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {WindowIdentity} from '../model/DesktopWindow';

export interface SemVer {
    major: number;
    minor: number;
    patch: number;
}

// Positions a window when it is restored.
export const positionWindow = async (win: WorkspaceWindow) => {
    try {
        const {isShowing, isTabbed} = win;

        const ofWin = await fin.Window.wrap(win);
        await ofWin.setBounds(win);

        if (isTabbed) {
            return;
        }

        await ofWin.leaveGroup();
        
        if (!isShowing) {
            await ofWin.hide();
            return;
        }
        
        console.log("after hide for ", win.name);

        if (win.state === 'normal') {
            await ofWin.restore();
        } else if (win.state === 'minimized') {
            await ofWin.minimize();
        } else if (win.state === 'maximized') {
            await ofWin.maximize();
        }

    } catch (e) {
        console.error('position window error', e);
    }
};

const createPlaceholderWindow = async (win: WorkspaceWindow) => {
    const {height, width, left, top} = win;

    const placeholderName = 'Placeholder-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    return await fin.Window.create({
        name: placeholderName,
        autoShow: true,
        defaultHeight: height,
        defaultWidth: width,
        defaultLeft: left,
        defaultTop: top,
        saveWindowState: false,
        opacity: 0.6,
        frame: false,
        backgroundColor: '#D3D3D3'
    });
};

// Creates a placeholder for a normal, non-tabbed window.
export const createNormalPlaceholder = async (win: WorkspaceWindow) => {
    const {name, uuid, isShowing, state} = win;
    if (!isShowing) {
        return;
    }

    let placeholderWindow: Window|undefined = undefined;

    if (state !== 'minimized') {
        placeholderWindow = await createPlaceholderWindow(win);
    }


    const actualWindow = fin.Window.wrapSync({uuid, name});
    const updateOptionsAndShow = async () => {
        try {
            await actualWindow.removeListener('initialized', updateOptionsAndShow);
            await model.expect(actualWindow.identity as WindowIdentity);
            // If window is a child window, position it.
            if (name !== uuid) {
                await positionWindow(win);
            }
        } finally {
            if (placeholderWindow) {
                await placeholderWindow.close();
            }
        }
    };
    await actualWindow.addListener('initialized', updateOptionsAndShow);

    return placeholderWindow;
};

// Creates a placeholder for a tabbed window.
// When the window that is supposed to be tabbed comes up, swaps the placeholder tab with the real window tab and closes the placeholder.
export const createTabPlaceholder = async (win: WorkspaceWindow) => {
    const {name, uuid} = win;

    const placeholderWindow = await createPlaceholderWindow(win);

    const actualWindow = fin.Window.wrapSync({uuid, name});
    const updateOptionsAndShow = async () => {
        try {
            await actualWindow.removeListener('initialized', updateOptionsAndShow);
            await model.expect(actualWindow.identity as WindowIdentity);
            await tabService.swapTab({ uuid: placeholderWindow.identity.uuid, name: placeholderWindow.identity.name} as WindowIdentity, actualWindow.identity as WindowIdentity);
        } finally {
            await placeholderWindow.close();
        }
    };
    await actualWindow.addListener('initialized', updateOptionsAndShow);

    return placeholderWindow;
};

// Check to see if an application was created programmatically.
export const wasCreatedProgrammatically = (app: ApplicationInfo|WorkspaceApp) => {
    const initialOptions = app.initialOptions as {uuid: string, url: string};
    return app && app.initialOptions && initialOptions.uuid && initialOptions.url;
};

interface AppInfo {
    manifest: {startup_app: {uuid: string;};};
    manifestUrl: string;
    uuid: string;
}

// Type here should be ApplicationInfo from the js-adapter (needs to be updated)
export const wasCreatedFromManifest = (app: ApplicationInfo, uuid?: string) => {
    const {manifest} = {...app, uuid} as AppInfo;
    const appUuid = uuid || undefined;
    return typeof manifest === 'object' && manifest.startup_app && manifest.startup_app.uuid === appUuid;
};

export const showingWindowInApp = async(app: WorkspaceApp): Promise<boolean> => {
    const {uuid, childWindows} = app;
    const ofApp = await fin.Application.wrap({uuid});
    const mainOfWin = await ofApp.getWindow();
    if (await isShowingWindow(mainOfWin)) {
        return true;
    }

    for (const child of childWindows) {
        const {name} = child;
        const ofWin = await fin.Window.wrap({uuid, name});
        if (await isShowingWindow(ofWin)) {
            return true;
        }
    }

    return false;
};

const isShowingWindow = async(ofWin: Window): Promise<boolean> => {
    const isShowing = await ofWin.isShowing();
    return isShowing;
};

export interface WindowObject {
    [uuid: string]: {[name: string]: boolean};
}

export interface TabbedPlaceholders {
    [uuid: string]: {[name: string]: WindowIdentity};
}

// Helper function to determine if a window is supposed to be tabbed in an incoming layout.
export function inWindowObject(win: Identity, windowObject: WindowObject|TabbedPlaceholders) {
    if (win.name) {
        if (windowObject[win.uuid]) {
            if (windowObject[win.uuid][win.name]) {
                return true;
            }
        }
    }
    return false;
}

// Helper function to add to a Window Object
export function addToWindowObject(identity: WindowIdentity, windowObject: WindowObject) {
    windowObject[identity.uuid] = Object.assign({}, windowObject[identity.uuid], {[identity.name]: true});
}

// Creates a tabbing placeholder and records the information for its corresponding window.
export async function createTabbedPlaceholderAndRecord(win: WorkspaceWindow, tabbedPlaceholdersToWindows: TabbedPlaceholders) {
    const tabPlaceholder = await createTabPlaceholder(win);
    tabbedPlaceholdersToWindows[win.uuid] =
        Object.assign({}, tabbedPlaceholdersToWindows[win.uuid], {[win.name]: {name: tabPlaceholder.identity.name, uuid: tabPlaceholder.identity.uuid}});
}

// Helper function to determine what type of placeholder window to open.
export async function childWindowPlaceholderCheck(app: WorkspaceApp, tabbedWindows: WindowObject, tabbedPlaceholdersToWindows: TabbedPlaceholders) {
    if (app.confirmed) {
        for (const win of app.childWindows) {
            if (inWindowObject(win, tabbedWindows)) {
                await createTabbedPlaceholderAndRecord(win, tabbedPlaceholdersToWindows);
            } else {
                await createNormalPlaceholder(win);
            }
        }
    } else {
        return;
    }
}

// Helper function to determine which placeholder windows to create for a running application's child windows.
// This differs from childWindowPlaceholderCheck because we need to check if child windows are open before we create their placeholders.
export async function childWindowPlaceholderCheckRunningApp(
    app: WorkspaceApp, tabbedWindows: WindowObject, tabbedPlaceholdersToWindows: TabbedPlaceholders, openWindows: WindowObject) {
    if (app.confirmed) {
        for (const win of app.childWindows) {
            // Here we're checking if the incoming child window is already open or not.
            const windowIsOpen = inWindowObject(win, openWindows);

            if (!windowIsOpen) {
                if (inWindowObject(win, tabbedWindows)) {
                    await createTabbedPlaceholderAndRecord(win, tabbedPlaceholdersToWindows);
                } else {
                    await createNormalPlaceholder(win);
                }
            } else {
                const childWindowModel = model.getWindow(win);
                await tabService.removeTab(win);
                if (childWindowModel && childWindowModel.snapGroup.length > 1) {
                    await childWindowModel.setSnapGroup(new DesktopSnapGroup());
                }
            }
        }
    } else {
        return;
    }
}

export function parseVersionString(versionString: string): SemVer {
    const match = /([1-9]+)\.([0-9]+)\.([0-9]+)/.exec(versionString);
    if (!match) {
        throw new Error('Invalid version string. Must be in semver format ("a.b.c")');
    }

    return {major: Number.parseInt(match[1], 10), minor: Number.parseInt(match[2], 10), patch: Number.parseInt(match[3], 10)};
}

export function adjustSizeOfFormerlyTabbedWindows(
    winIdentity: WindowIdentity, formerlyTabbedWindows: WindowObject, layoutWindow: WorkspaceWindow|WindowDetail) {
    if (inWindowObject(winIdentity, formerlyTabbedWindows)) {
        const tabWindow = model.getWindow(winIdentity);
        if (tabWindow) {
            const applicationState = tabWindow.applicationState;
            const tabGroup = tabWindow.tabGroup;
            if (tabGroup) {
                const tabStripHeight = tabGroup.config.height;

                layoutWindow.top = layoutWindow.top - tabStripHeight;
                layoutWindow.height = layoutWindow.height + tabStripHeight;

                if (applicationState.frame === true) {
                    layoutWindow.height = layoutWindow.height + 7;
                    layoutWindow.left = layoutWindow.left - 7;
                    layoutWindow.width = layoutWindow.width + 14;
                }
            }
        }
    }
}