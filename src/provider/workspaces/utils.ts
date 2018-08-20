import {Window} from 'hadouken-js-adapter';
import Fin from 'hadouken-js-adapter/out/types/src/api/fin';
import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/system/application';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {LayoutApp, WindowState} from '../../client/types';

// tslint:disable-next-line:no-any
declare var fin: any;

export const isClientConnection = (identity: LayoutApp|Identity) => {
    // i want to access connections....
    const {uuid} = identity;
    //@ts-ignore
    return providerChannel.connections.some((conn: Identity) => {
        return identity.uuid === conn.uuid;
    });
};

export const positionWindow = async (win: WindowState) => {
    try {
        const ofWin = await fin.Window.wrap(win);
        await ofWin.leaveGroup();
        await ofWin.setBounds(win);

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

export const createAppPlaceholders = (app: LayoutApp) => {
    createPlaceholder(app.mainWindow);
    app.childWindows.forEach((win: WindowState) => {
        createPlaceholder(win);
    });
};

const createPlaceholder = async (win: WindowState) => {
    if (!win.isShowing || win.state === 'minimized') {
        return;
    }
    const {name, height, width, left, top, uuid} = win;

    const placeholder = new fin.desktop.Window(
        { name, autoShow: true, defaultHeight: height, defaultWidth: width, defaultLeft: left, defaultTop: top, saveWindowState: false, opacity: 0.6, backgroundColor: '#D3D3D3'}, () => {
            placeholder.nativeWindow.document.body.style.overflow = 'hidden';
            placeholder.nativeWindow.document.bgColor = "D3D3D3";
        });
    const actualWindow = await fin.Window.wrap({uuid, name});
    actualWindow.on('shown', () => {
        placeholder.close();
    });
};

export const wasCreatedProgrammatically = (app: LayoutApp) => {
    return app && app.initialOptions && app.initialOptions.uuid && app.initialOptions.url;
};

// Type here should be ApplicationInfo from the js-adapter (needs to be updated)
export const wasCreatedFromManifest = (app: LayoutApp, uuid?: string) => {
    const {manifest, manifestUrl} = app;
    const appUuid = uuid || app.uuid;
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