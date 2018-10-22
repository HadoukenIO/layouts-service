import {Identity} from 'hadouken-js-adapter';
import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import * as Layouts from '../client/main';
import {Layout, LayoutApp, WindowState} from '../client/types';

export interface Workspace {
    id: string;
    layout: Layout;
}

declare var window: _Window&{forgetMe: (identity: Identity) => void};

let numChildren = 0;
const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));

export async function createChild(parentWindowName: string): Promise<void> {
    const win = await openChild(parentWindowName + ' -  win' + numChildren, numChildren);
}

export async function openChild(name: string, i: number, frame = true, url?: string, bounds?: Bounds) {
    numChildren++;

    if (bounds) {
        return await fin.Window.create({
            url: url || `${launchDir}/demo-window.html`,
            autoShow: true,
            defaultHeight: bounds.height,
            defaultWidth: bounds.width,
            defaultLeft: bounds.left,
            defaultTop: bounds.top,
            saveWindowState: false,
            frame,
            name
        });

    } else {
        return await fin.Window.create({
            url: url || `${launchDir}/demo-window.html`,
            autoShow: true,
            defaultHeight: 250 + 50 * i,
            defaultWidth: 250 + 50 * i,
            defaultLeft: 320 * (i % 3),
            defaultTop: i > 2 ? 400 : 50,
            saveWindowState: false,
            frame,
            name
        });
    }
}

export async function onAppRes(layoutApp: LayoutApp): Promise<LayoutApp> {
    console.log('Apprestore called:', layoutApp);
    const ofApp = fin.Application.getCurrentSync();
    const openWindows = await ofApp.getChildWindows();
    const openAndPosition = layoutApp.childWindows.map(async (win: WindowState, index: number) => {
        if (!openWindows.some((w: _Window) => w.identity.name === win.name)) {
            const ofWin = await openChild(win.name, index, win.frame, win.info.url);
        } else {
            await positionWindow(win);
        }
    });
    await Promise.all(openAndPosition);
    return layoutApp;
}

// Positions a window when it is restored.
// Also given to the client to use.
const positionWindow = async (win: WindowState) => {
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

// Allow layouts service to save and restore this application
Layouts.onApplicationSave(() => {
    return {test: true};
});
Layouts.onAppRestore(onAppRes);
Layouts.ready();
