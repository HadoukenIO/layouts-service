import Fin from 'hadouken-js-adapter/out/types/src/api/fin';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {LayoutApp, WindowState} from '../types';

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

        // FOR DEMO!!!
        await ofWin.show();
        await ofWin.restore();

        // COMMENTED OUT FOR DEMO
        // if (win.state === 'normal') {
        //     await ofWin.restore();
        // } else if (win.state === 'minimized') {
        //     await ofWin.minimize();
        // } else if (win.state === 'maximized') {
        //     await ofWin.maximize();
        // }

        // if (win.isShowing) {
        // await ofWin.show();
        // } else {
        //     await ofWin.hide();
        // }
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
    const image = new Image();
    image.src = `data:image/png;base64, ${win.image}`;
    image.style.filter = 'blur(2px)';
    const {name, height, width, left, top, uuid} = win;

    const placeholder = new fin.desktop.Window(
        {name, autoShow: true, defaultHeight: height, defaultWidth: width, defaultLeft: left, defaultTop: top, saveWindowState: false, opacity: 0.6}, () => {
            placeholder.nativeWindow.document.body.appendChild(image);
            placeholder.nativeWindow.document.body.style.overflow = 'hidden';
            placeholder.blur();
        });
    const actualWindow = await fin.Window.wrap({uuid, name});
    actualWindow.on('shown', () => {
        placeholder.close();
    });
};
