import {Window} from 'hadouken-js-adapter';
import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';
import {LayoutApp, LayoutWindow} from '../../client/types';
import {model, tabService} from '../main';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {WindowIdentity} from '../model/DesktopWindow';

// Positions a window when it is restored.
export const positionWindow = async (win: LayoutWindow) => {
    try {
        const ofWin = await fin.Window.wrap(win);
        await ofWin.setBounds(win);
        if (win.isTabbed) {
            return;
        }
        await ofWin.leaveGroup();


        // COMMENTED OUT FOR DEMO
        if (win.state === 'normal') {
            await ofWin.restore();
        } else if (win.state === 'minimized') {
            await ofWin.minimize();
        } else if (win.state === 'maximized') {
            await ofWin.maximize();
        }

        if (win.isShowing) {
            await ofWin.show();
        } else {
            await ofWin.hide();
        }
    } catch (e) {
        console.error('position window error', e);
    }
};

// Creates a placeholder for a normal, non-tabbed window.
export const createNormalPlaceholder = async (win: LayoutWindow) => {
    if (!win.isShowing || win.state === 'minimized') {
        return;
    }
    const {name, height, width, left, top, uuid} = win;

    const placeholderName = 'Placeholder-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const placeholder = await fin.Window.create({
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

    const actualWindow = await fin.Window.wrap({uuid, name});
    const updateOptionsAndShow = async () => {
        await actualWindow.removeListener('show-requested', updateOptionsAndShow);
        await actualWindow.setBounds(win);
        await actualWindow.showAt(left, top);
        await placeholder.close();
    };
    await actualWindow.addListener('show-requested', updateOptionsAndShow);

    return placeholder;
};

// Creates a placeholder for a tabbed window.
// When the window that is supposed to be tabbed comes up, swaps the placeholder tab with the real window tab and closes the placeholder.
export const createTabPlaceholder = async (win: LayoutWindow) => {
    const {name, height, width, left, top, uuid} = win;

    const placeholderName = 'Placeholder-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const placeholder = await fin.Window.create({
        name: placeholderName,
        autoShow: true,
        defaultHeight: height,
        defaultWidth: width,
        defaultLeft: left,
        defaultTop: top,
        saveWindowState: false,
        frame: false,
        opacity: 0.6,
        backgroundColor: '#D3D3D3'
    });

    const actualWindow = await fin.Window.wrap({uuid, name});
    const updateOptionsAndShow = async () => {
        await actualWindow.removeListener('shown', updateOptionsAndShow);
        await model.expect(actualWindow.identity as WindowIdentity);
        await tabService.swapTab({uuid: placeholder.identity.uuid, name: placeholderName}, actualWindow.identity as WindowIdentity);
        await placeholder.close();
    };
    await actualWindow.addListener('shown', updateOptionsAndShow);

    return placeholder;
};

// Check to see if an application was created programmatically.
export const wasCreatedProgrammatically = (app: ApplicationInfo|LayoutApp) => {
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

export const showingWindowInApp = async(app: LayoutApp): Promise<boolean> => {
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
export async function createTabbedPlaceholderAndRecord(win: LayoutWindow, tabbedPlaceholdersToWindows: TabbedPlaceholders) {
    const tabPlaceholder = await createTabPlaceholder(win);
    tabbedPlaceholdersToWindows[win.uuid] =
        Object.assign({}, tabbedPlaceholdersToWindows[win.uuid], {[win.name]: {name: tabPlaceholder.identity.name, uuid: tabPlaceholder.identity.uuid}});
}

// Helper function to determine what type of placeholder window to open.
export async function childWindowPlaceholderCheck(app: LayoutApp, tabbedWindows: WindowObject, tabbedPlaceholdersToWindows: TabbedPlaceholders) {
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
    app: LayoutApp, tabbedWindows: WindowObject, tabbedPlaceholdersToWindows: TabbedPlaceholders, openWindows: WindowObject) {
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
                if (childWindowModel!.getSnapGroup().length > 1) {
                    childWindowModel!.dockToGroup(new DesktopSnapGroup());
                }
            }
        }
    } else {
        return;
    }
}

export function parseVersionString(versionString: string) {
    const match = /([1-9]+)\.([0-9]+)\.([0-9]+)/.exec(versionString);
    if (!match) {
        throw new Error('Invalid version string. Must be in semver format ("a.b.c")');
    }

    return {major: match[1], minor: match[2], patch: match[3]};
}