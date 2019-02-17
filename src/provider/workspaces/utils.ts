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

// TODO: Create Placeholder and PlaceholderStore classes?
// This keeps track of how many placeholders we have open, so we know when we can start regrouping a layout.
let numOfPlaceholders = 0;
let functionToContinueRestorationWhenPlaceholdersClosed: (() => void)|undefined;
let rejectTimeout: number|undefined;

fin.System.addListener('window-closed', (win) => {
    if (win.name.startsWith('Placeholder-')) {
        placeholderClosed();
    }
});

export async function waitUntilAllPlaceholdersClosed() {
    if (functionToContinueRestorationWhenPlaceholdersClosed) {
        throw new Error(
            'waitUntilAllPlaceholdersClosed was called while already waiting for placeholders to close. Restore was called before another restoration had completed. Please close all remaining placeholder windows.');
    }

    // All placeholders are already closed, so no need to wait.
    if (numOfPlaceholders === 0) {
        return;
    }

    return new Promise((res, rej) => {
        functionToContinueRestorationWhenPlaceholdersClosed = res;
        rejectTimeout = window.setTimeout(() => {
            rej(`${numOfPlaceholders} Placeholder(s) Left Open after 60 seconds. ${numOfPlaceholders} Window(s) did not come up. Attempting to group anyway.`);
            functionToContinueRestorationWhenPlaceholdersClosed = undefined;
            rejectTimeout = undefined;
        }, 60000);
    });
}

// Positions a window when it is restored.
export const positionWindow = async (win: WorkspaceWindow) => {
    try {
        const {isShowing, isTabbed} = win;

        const ofWin = await fin.Window.wrap(win);
        await ofWin.setBounds(win);

        if (isTabbed) {
            await ofWin.show();
            return;
        }

        await ofWin.leaveGroup();

        if (!isShowing) {
            await ofWin.hide();
            return;
        }

        if (win.state === 'normal') {
            // Need to both restore and show because the restore function doesn't emit a `shown` or `show-requested` event
            await ofWin.restore();
            await ofWin.show();
        } else if (win.state === 'minimized') {
            await ofWin.minimize();
        } else if (win.state === 'maximized') {
            await ofWin.maximize();
        }

    } catch (e) {
        console.error('position window error', e);
    }
};

// Creates a placeholder for a normal, non-tabbed window.
export const createNormalPlaceholder = async (win: WorkspaceWindow) => {
    const {name, uuid, isShowing, state} = win;
    if (!isShowing || state === 'minimized') {
        return;
    }

    const placeholderWindow = await createPlaceholderWindow(win);

    const actualWindow = await fin.Window.wrap({uuid, name});
    const updateOptionsAndShow = async () => {
        try {
            await actualWindow.removeListener('show-requested', updateOptionsAndShow);
            await model.expect(actualWindow.identity as WindowIdentity);
            await positionWindow(win);
        } finally {
            await placeholderWindow.close();
        }
    };
    // We add a listener to show-requested so that the window shows up in the location it's supposed to be restored at.
    // If we added a listener to shown, we'd see the window appear in its original spot and then flash to the next spot.
    await actualWindow.addListener('show-requested', updateOptionsAndShow);
    return placeholderWindow;
};

// Creates a placeholder for a tabbed window.
// When the window that is supposed to be tabbed comes up, swaps the placeholder tab with the real window tab and closes the placeholder.
export const createTabPlaceholder = async (win: WorkspaceWindow) => {
    const {name, uuid} = win;

    const placeholderWindow = await createPlaceholderWindow(win);

    const actualWindow = await fin.Window.wrap({uuid, name});
    const updateOptionsAndShow = async () => {
        try {
            await actualWindow.removeListener('shown', updateOptionsAndShow);
            await model.expect(actualWindow.identity as WindowIdentity);
            // TODO: Remove this once RUN-5006 has been resolved. If you try to swapTab too early after the window shows, you can get a JS exception.
            await delay(500);
            await tabService.swapTab(placeholderWindow.identity as WindowIdentity, actualWindow.identity as WindowIdentity);
        } finally {
            await placeholderWindow.close();
        }
    };
    // We add a listener to shown so that the core has time to set the proper properties on the window for grouping.
    await actualWindow.addListener('shown', updateOptionsAndShow);

    return placeholderWindow;
};

// Check to see if an application was created programmatically.
export const wasCreatedProgrammatically = (app: ApplicationInfo|WorkspaceApp) => {
    const initialOptions = app.initialOptions as {uuid: string, url: string};
    return app && app.initialOptions && initialOptions.uuid && initialOptions.url;
};

// Type here should be ApplicationInfo from the js-adapter (needs to be updated)
export const wasCreatedFromManifest = (app: ApplicationInfo, uuid?: string) => {
    const {manifest} = {...app, uuid} as AppInfo;
    const appUuid = uuid || undefined;
    return typeof manifest === 'object' && manifest.startup_app && manifest.startup_app.uuid === appUuid;
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

function placeholderCreated(): void {
    numOfPlaceholders++;
}

function placeholderClosed(): void {
    numOfPlaceholders--;
    continueRestorationIfReady();
}

function continueRestorationIfReady() {
    if (!!(numOfPlaceholders === 0 && functionToContinueRestorationWhenPlaceholdersClosed)) {
        clearTimeout(rejectTimeout);
        functionToContinueRestorationWhenPlaceholdersClosed();
        functionToContinueRestorationWhenPlaceholdersClosed = undefined;
        rejectTimeout = undefined;
    }
}

async function delay(milliseconds: number) {
    return new Promise<void>(r => setTimeout(r, milliseconds));
}

// TODO: Make placeholder windows close-able
const createPlaceholderWindow = async (win: WorkspaceWindow) => {
    const {height, width, left, top} = win;

    const placeholderName = 'Placeholder-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const placeholderWindow = await fin.Window.create({
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

    if (placeholderWindow) {
        placeholderCreated();
    }

    return placeholderWindow;
};

interface AppInfo {
    manifest: {startup_app: {uuid: string;};};
    manifestUrl: string;
    uuid: string;
}
