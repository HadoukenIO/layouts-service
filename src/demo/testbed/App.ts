import {Application} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {workspaces} from '../../client/main';
import {WorkspaceApp, WorkspaceWindow} from '../../client/types';
import {addSpawnListeners, createWindow} from '../spawn';

import {EventsUI} from './EventsUI';
import {RegistrationUI} from './RegistrationUI';
import {SnapAndDockUI} from './SnapAndDockUI';
import {TabbingUI} from './TabbingUI';
import {View} from './View';
import {WindowsUI} from './WindowsUI';

/**
 * Dictionary of user-facing strings
 */
export enum Messages {
    STATUS_DOCKED = 'Docked to one or more windows',
    STATUS_UNDOCKED = 'Window currently undocked',
    STATUS_TABBED = 'Tabbed to one or more other windows',
    STATUS_UNTABBED = 'Not tabbed'
}

/**
 * Key-value map of any query-string parameters.
 *
 * Assumes that all parameters are JSON.stringify'd.
 *
 * e.g: "?a=1&b='2'&c=3%204" => {a: 1, b: '2', c: '3 4'}
 */
export type QueryParams = {
    [key: string]: string|number|boolean|{}
};

export class App {
    private _view: View|null;
    private _args: QueryParams;

    constructor() {
        this._view = null;
        this._args = this.getQueryParams();

        // Allow layouts service to save and restore this application
        workspaces.setGenerateHandler(() => {
            console.log('Generate handler called');
            return {test: true};
        });
        workspaces.setRestoreHandler(async (workspace: WorkspaceApp) => {
            console.log('Restore handler called:', workspace);

            const app: Application = fin.Application.getCurrentSync();
            const openWindows: _Window[] = await app.getChildWindows();

            await Promise.all(workspace.childWindows.map(async (win: WorkspaceWindow, index: number) => {
                if (!openWindows.some((w: _Window) => w.identity.name === win.name)) {
                    await createWindow({id: win.name, frame: win.frame, size: {x: win.width, y: win.height}, position: {x: win.left, y: win.top}});
                } else {
                    await this.positionWindow(win);
                }
            }));

            return workspace;
        });
        workspaces.ready();

        // Listen for requests to spawn child windows/applications
        addSpawnListeners();

        // Wait until DOM has loaded, then initialise app
        document.addEventListener('DOMContentLoaded', this.init.bind(this));
    }

    public get args(): QueryParams {
        return this._args;
    }

    public get view(): View {
        return this._view!;
    }

    private async init(): Promise<void> {
        // Set default values for some args
        if (this._args.framed === undefined) {
            // Fetch framed status of window
            this._args.framed = (await fin.Window.getCurrentSync().getOptions()).frame;
        }
        if (this._args.border === undefined) {
            // If border property isn't specified, default to the framed status of the window
            this._args.border = !this._args.framed;
        }

        // Initialise view
        const view = new View(this._args);
        const elements = view.elements;
        this._view = view;

        // Create component 'controllers'
        const eventsUI: EventsUI = new EventsUI(elements);
        const snapAndDockUI: SnapAndDockUI = new SnapAndDockUI(elements, eventsUI);
        const tabbingUI: TabbingUI = new TabbingUI(elements, eventsUI);
        const registrationUI: RegistrationUI = new RegistrationUI(elements, eventsUI);
        const windowUI: WindowsUI = new WindowsUI(elements);

        // Make objects accessible from the debugger
        Object.assign(window, {view, eventsUI, snapAndDockUI, tabbingUI, registrationUI, windowUI});
    }

    private getQueryParams(): QueryParams {
        const params = location.search.replace(/^\?/, '').split('&');
        const args = params.reduce((args: QueryParams, queryParam: string) => {
            const [key, value] = queryParam.split('=');
            if (key !== undefined && value !== undefined) {
                try {
                    args[key] = JSON.parse(decodeURIComponent(value));
                } catch (e) {
                    console.warn(`Query param '${key}' couldn't be parsed. Value:`, value);
                    args[key] = decodeURIComponent(value);
                }
            }
            return args;
        }, {});

        return args;
    }

    private async positionWindow(win: WorkspaceWindow): Promise<void> {
        try {
            const {isShowing, isTabbed} = win;

            const ofWin = await fin.Window.wrap(win);
            await ofWin.setBounds(win);

            if (isTabbed) {
                await ofWin.show();
                return;
            }

            await ofWin.leaveGroup();

            if (isShowing) {
                if (win.state === 'normal') {
                    // Need to both restore and show because the restore function doesn't emit a `shown` or `show-requested` event
                    await ofWin.restore();
                    await ofWin.show();
                } else if (win.state === 'minimized') {
                    await ofWin.minimize();
                } else if (win.state === 'maximized') {
                    await ofWin.maximize();
                }
            } else {
                await ofWin.hide();
            }
        } catch (e) {
            console.error('position window error', e);
        }
    }
}
