import {Window} from 'hadouken-js-adapter';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {LayoutApp, TabIdentifier, WindowState} from '../../client/types';
import {swapTab} from '../tabbing/SaveAndRestoreAPI';
import { ChannelProvider } from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';
import { ApplicationInfo } from 'hadouken-js-adapter/out/types/src/api/application/application';

declare var providerChannel: ChannelProvider;

export const isClientConnection = (identity: LayoutApp|Identity) => {
    // i want to access connections....
    const {uuid} = identity;

    return providerChannel.connections.some((conn: Identity) => {
        return identity.uuid === conn.uuid;
    });
};

export const getClientConnection = (identity: Identity) => {
    const {uuid} = identity;
    const name = identity.name ? identity.name : uuid;

    return providerChannel.connections.find((conn) => {
        return conn.uuid === uuid && conn.name === name;
    });
};

// tslint:disable-next-line:no-any
export const sendToClient = async (identity: Identity, action: string, payload: any) => {
    const conn = await getClientConnection(identity);
    if (conn){
        return providerChannel.dispatch(conn, action, payload);
    }
};

export const positionWindow = async (win: WindowState) => {
    try {
        const ofWin = await fin.Window.wrap(win);
        if (!win.isTabbed) {
            await ofWin.leaveGroup();
        }
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

export const createAppPlaceholders = async (app: LayoutApp) => {
    createNormalPlaceholder(app.mainWindow);
    app.childWindows.forEach((win: WindowState) => {
        createNormalPlaceholder(win);
    });
};

export const createNormalPlaceholder = async (win: WindowState) => {
    if (!win.isShowing || win.state === 'minimized') {
        return;
    }
    const {name, height, width, left, top, uuid} = win;

    const placeholderName = 'Placeholder-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const placeholder = new fin.desktop.Window(
        {
            name: placeholderName,
            autoShow: true,
            defaultHeight: height,
            defaultWidth: width,
            defaultLeft: left,
            defaultTop: top,
            saveWindowState: false,
            opacity: 0.6,
            backgroundColor: '#D3D3D3'
        },
        () => {
            placeholder.getNativeWindow().document.body.style.overflow = 'hidden';
            placeholder.getNativeWindow().document.bgColor = 'D3D3D3';
        });

    const actualWindow = await fin.Window.wrap({uuid, name});
    // @ts-ignore v2 types missing 'shown' event.
    actualWindow.on('shown', () => {
        placeholder.close();
    });

    return placeholder;
};

export const createTabPlaceholder = async (win: WindowState) => {
    const {name, height, width, left, top, uuid} = win;

    const placeholderName = 'Placeholder-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const placeholder = new fin.desktop.Window(
        {
            name: placeholderName,
            autoShow: true,
            defaultHeight: height,
            defaultWidth: width,
            defaultLeft: left,
            defaultTop: top,
            saveWindowState: false,
            opacity: 0.6,
            backgroundColor: '#D3D3D3'
        },
        () => {
            placeholder.getNativeWindow().document.body.style.overflow = 'hidden';
            placeholder.getNativeWindow().document.bgColor = 'D3D3D3';
        });

    const actualWindow = await fin.Window.wrap({uuid, name});
    actualWindow.on('initialized', async () => {
        await swapTab(actualWindow.identity as TabIdentifier, placeholder);
        placeholder.close();
    });

    return placeholder;
};

export const wasCreatedProgrammatically = (app: ApplicationInfo | LayoutApp) => {
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
    const appUuid = uuid || '';
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