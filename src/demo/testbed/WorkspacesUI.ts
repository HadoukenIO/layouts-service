import {workspaces} from '../../client/main';
import {createWindow} from '../spawn';
import {EventsUI} from './EventsUI';
import {WorkspaceWindow, WorkspaceApp} from '../../client/types';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

export class WorkspacesUI {
    private _log: EventsUI;

    constructor(log: EventsUI) {
        // Allow layouts service to save and restore this application
        workspaces.setGenerateHandler(() => {
            return {test: true};
        });
        workspaces.setRestoreHandler(this.onAppRes);
        workspaces.ready();

        workspaces.addEventListener('workspace-restored', (e: Event) => {
            log.addEvent(e);
        });
        this._log = log;
    }

    private async onAppRes(layoutApp: WorkspaceApp): Promise<WorkspaceApp> {
        console.log('Apprestore called:', layoutApp);
        const ofApp = fin.Application.getCurrentSync();
        const openWindows = await ofApp.getChildWindows();
        const openAndPosition = layoutApp.childWindows.map(async (win: WorkspaceWindow, index: number) => {
            console.log("win.name", win.name);
            if (!openWindows.some((w: _Window) => w.identity.name === win.name)) {
                await createWindow(win);
            } else {
                await this.positionWindow(win);
            }
        });
        await Promise.all(openAndPosition);
        return layoutApp;
    }

    // Positions a window when it is restored.
    // Also given to the client to use.
    private async positionWindow(win: WorkspaceWindow) {
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
    }
}
