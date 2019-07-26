/**
 * @module RestoreHelpers
 */
import {WorkspaceWindow, WorkspaceApp} from './workspaces';

/**
 * A simple restore handler that can be passed to {@link setRestoreHandler} when no custom logic is needed.
 *
 * This restore handler will open and position any child windows which are not currently running
 * and move any open child windows to their expected positions for the restoring workspace.
 *
 * ``` ts
 * import {workspaces, restoreHelpers} from 'openfin-layouts';
 *
 * workspaces.setRestoreHandler(restoreHelpers.standardRestoreHandler);
 * ```
 */
export async function standardRestoreHandler(workspaceApp: WorkspaceApp) {
    const errors: Error[] = [];

    const openWindows = await fin.Application.getCurrentSync().getChildWindows();

    // Iterate through the child windows of the WorkspaceApp
    const opened = workspaceApp.childWindows.map(async (win: WorkspaceWindow): Promise<void> => {
        // Check if the window already exists
        if (!openWindows.some(w => w.identity.name === win.name)) {
            // Create the OpenFin window based on the data in the workspaceApp
            return createChild(win).catch((e: Error) => {
                errors.push(e);
            });
        } else {
            // Only position if the window exists
            return positionChild(win).catch((e: Error) =>{
                errors.push(e);
            });
        }
    });

    // Wait for all windows to open and be positioned before returning
    await Promise.all(opened);
    if (errors.length === 0) {
        return workspaceApp;
    } else {
        // Consolidate any errors in restoring the children into a single error
        throw new Error('One or more errors encountered when restoring children: ' + errors.map(e => e.message).join(', '));
    }
}

/**
 * An additional helper function that can be used to create custom restore handlers.
 *
 * Given a {@link WorkspaceWindow} it will determine if the window is open and then
 * call {@link createChild} or {@link positionChild} as appropriate.
 *
 * @param workspaceWindow Object containing details of the window identity and how it should
 * be positioned/created.
 */
export async function createOrPositionChild(workspaceWindow: WorkspaceWindow) {
    const openWindows = await fin.Application.getCurrentSync().getChildWindows();

    if (!openWindows.some(w => w.identity.name === workspaceWindow.name)) {
        // create the OpenFin window based on the data in the workspaceApp
        return createChild(workspaceWindow);
    } else {
        // only position if the window exists
        return positionChild(workspaceWindow);
    }
}

/**
 * Given a {@link WorkspaceWindow} for a non-open window, this function will create the window, position it,
 * and update its visibility, state, and frame to fit with the restoring workspace.
 *
 * Called by the {@link standardRestoreHandler} for any non-open windows in the WorkspaceApp.
 *
 * @param workspaceWindow Object containing details of the window identity and how it should
 * be created.
 * 
 * @throws `Error`: If there is an existing child window with the same name.
 */
export async function createChild(workspaceWindow: WorkspaceWindow): Promise<void> {
    const {bounds, frame, isShowing, name, state, url} = workspaceWindow;
    await fin.Window.create({
        url,
        autoShow: isShowing,
        defaultHeight: bounds.height,
        defaultWidth: bounds.width,
        defaultLeft: bounds.left,
        defaultTop: bounds.top,
        frame,
        state,
        name
    });
}

/**
 * Given a {@link WorkspaceWindow} object for a currently open window, this will position and
 * update the visibility, state and frame of that window to fit with the restoring
 * workspace.
 *
 * Called by the {@link standardRestoreHandler} for any currently running windows in the workspace.
 *
 * @param workspaceWindow Object containing details of the window identity and how it should
 * be positioned.
 *
 * @throws `Error`: If the window described by `workspaceWindow` is not currently running.
 */
export async function positionChild(workspaceWindow: WorkspaceWindow): Promise<void> {
    const {bounds, frame, isShowing, state, isTabbed} = workspaceWindow;

    const ofWin = fin.Window.wrapSync(workspaceWindow);
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

    return ofWin.updateOptions({frame});
}
