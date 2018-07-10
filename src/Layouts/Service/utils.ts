import { LayoutApp, WindowState } from "../types";
import { Identity } from "hadouken-js-adapter/out/types/src/identity";
declare var fin: any;

export const isClientConnection = (identity: LayoutApp | Identity) => {
    // i want to access connections....
    const { uuid } = identity;
    //@ts-ignore
    return providerChannel.connections.some((conn: any) => {
        return identity.uuid === conn.uuid;
    });
};


export const positionWindow = async (win: WindowState | Identity) => {
    try {
        const ofWin = await fin.Window.wrap(win);
        await ofWin.leaveGroup();
        await ofWin.setBounds(win);
    } catch (e) {
        console.error('set bounds error', e);
    }
};

export const createAppPlaceholders = (app: LayoutApp) => {
    createPlaceholder(app.mainWindow);
    app.childWindows.forEach((win: WindowState) => {
        createPlaceholder(win);
    })
}

const createPlaceholder = async (win: WindowState) => {
    const image = new Image();
    image.src = `data:image/png;base64, ${win.image}`;
    image.style.filter = "blur(2px)";
    const { name, height, width, left, top, uuid } = win;
    
    const placeholder = new fin.desktop.Window({
        name, 
        autoShow: true,
        defaultHeight: height,
        defaultWidth: width,
        defaultLeft: left,
        defaultTop: top,
        saveWindowState: false,
        opacity: 0.6
    }, () => {;
        placeholder.nativeWindow.document.body.appendChild(image);
        placeholder.nativeWindow.document.body.style.overflow = 'hidden';
        placeholder.blur();
    });
    const actualWindow = await fin.Window.wrap({uuid, name});
    actualWindow.on('shown', () => {
        placeholder.close()
    });
}