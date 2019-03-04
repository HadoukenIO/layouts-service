import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import * as Layouts from '../client/main';
import {Workspace, WorkspaceApp, WorkspaceWindow} from '../client/workspaces';

export interface Workspace {
    id: string;
    layout: Workspace;
}

let numChildren = 0;
const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));

export async function createChild(parentWindowName: string): Promise<void> {
    await openChild(parentWindowName + ' - win' + numChildren, numChildren);
}

export async function openChild(name: string, i: number, frame = true, state = 'normal', url?: string, bounds?: Bounds) {
    numChildren++;

    if (bounds) {
        return await fin.Window.create({
            url: url || `${launchDir}/child.html`,
            autoShow: true,
            defaultHeight: bounds.height,
            defaultWidth: bounds.width,
            defaultLeft: bounds.left,
            defaultTop: bounds.top,
            saveWindowState: false,
            frame,
            state,
            name
        });
    } else {
        return await fin.Window.create({
            url: url || `${launchDir}/child.html`,
            autoShow: true,
            defaultHeight: 250 + 50 * i,
            defaultWidth: 250 + 50 * i,
            defaultLeft: 320 * (i % 3),
            defaultTop: i > 2 ? 400 : 50,
            saveWindowState: false,
            frame,
            state,
            name
        });
    }
}

export async function onAppRes(layoutApp: WorkspaceApp): Promise<WorkspaceApp> {
    console.log('Apprestore called:', layoutApp);
    const ofApp = fin.Application.getCurrentSync();
    const openWindows = await ofApp.getChildWindows();
    const openAndPosition = layoutApp.childWindows.map(async (win: WorkspaceWindow, index: number) => {
        if (!openWindows.some((w: _Window) => w.identity.name === win.name)) {
            await openChild(win.name, index, win.frame, win.state, win.url, win.bounds);
        } else {
            await positionWindow(win);
        }
    });
    await Promise.all(openAndPosition);
    return layoutApp;
}

// Positions a window when it is restored.
// Also given to the client to use.
const positionWindow = async (win: WorkspaceWindow) => {
    try {
        const {isShowing, isTabbed} = win;

        const ofWin = await fin.Window.wrap(win);
        await ofWin.setBounds(win.bounds);

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

// Allow layouts service to save and restore this application
Layouts.workspaces.setGenerateHandler(() => {
    return {test: true};
});
Layouts.workspaces.setRestoreHandler(onAppRes);
