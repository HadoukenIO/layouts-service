import {WorkspaceApp, WorkspaceWindow} from '../client/workspaces';

export async function defaultRestoreHandler(workspaceApp: WorkspaceApp) {
    const ofApp = await fin.Application.getCurrent();
    const openWindows = await ofApp.getChildWindows();
    // iterate through the child windows of the workspaceApp data
    const opened = workspaceApp.childWindows.map(async (win: WorkspaceWindow): Promise<void> => {
        // check for existence of the window
        if (!openWindows.some(w => w.identity.name === win.name)) {
            // create the OpenFin window based on the data in the workspaceApp
            return createChild(win);
        } else {
            // only position if the window exists
            return positionWindow(win);
        }
    });

    // wait for all windows to open and be positioned before returning
    await Promise.all(opened);
    return workspaceApp;
}

async function createChild(workspaceWindow: WorkspaceWindow): Promise<void> {
    const {bounds, frame, isShowing, name, state, url} = workspaceWindow;
    await fin.Window.create({
        url,
        autoShow: isShowing,
        defaultHeight: bounds.height,
        defaultWidth: bounds.width,
        defaultLeft: bounds.left,
        defaultTop: bounds.top,
        saveWindowState: false,
        frame,
        state,
        name
    });
}

async function positionWindow(workspaceWindow: WorkspaceWindow): Promise<void> {
    const {bounds, frame, isShowing, state, isTabbed} = workspaceWindow;
    try {
        const ofWin = await fin.Window.wrap(workspaceWindow);
        await ofWin.setBounds(bounds);

        if (isTabbed) {
            return;
        }

        if (!isShowing) {
            await ofWin.hide();
            return;
        }

        if (state === 'normal') {
            await ofWin.restore();
        } else if (state === 'minimized') {
            await ofWin.minimize();
        } else if (state === 'maximized') {
            await ofWin.maximize();
        }

        await ofWin.updateOptions({frame});
    } catch (e) {
        console.error('position window error: ' + e);
    }
}
