import {Identity} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {Layout, LayoutApp, WindowState} from '../client/types';

import * as Storage from './storage';

export interface Workspace {
    id: string;
    layout: Layout;
}

import * as Layouts from '../client/main';

declare var window: _Window&{forgetMe: (identity: Identity) => void};

let numChildren = 0;
let numTabbedWindows = 0;
const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));
const forgetWindows: Identity[] = [];

window.forgetMe = forgetMe;

export const positionWindow = async (win: WindowState) => {
    try {
        const ofWin = await fin.Window.wrap(win);
        if (!win.isTabbed) {
            await ofWin.leaveGroup();
        }
        await ofWin.setBounds(win);

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

export async function setLayout(layoutParam?: Layout) {
    const id = (document.getElementById('layoutName') as HTMLTextAreaElement).value;
    const layoutSelect = document.getElementById('layoutSelect') as HTMLSelectElement;
    const layout = layoutParam || await Layouts.generateLayout();
    const workspace = {id, layout};

    if (layoutSelect) {
        let optionPresent = false;
        for (let idx = 0; idx < layoutSelect.options.length; idx++) {  // looping over the options
            if (layoutSelect.options[idx].value === id) {
                optionPresent = true;
                break;
            }
        }

        if (!optionPresent) {
            const option = createOptionElement(id);
            layoutSelect.appendChild(option);
        }
    }

    Storage.saveLayout(workspace);
    document.getElementById('showLayout')!.innerHTML = JSON.stringify(layout, null, 2);
}

export async function killAllWindows() {
    fin.desktop.System.getAllApplications((apps: fin.ApplicationInfo[]) => {
        apps.forEach((app) => {
            if (app.uuid !== 'layouts-service') {
                const wrappedApp = fin.desktop.Application.wrap(app.uuid);
                wrappedApp.getChildWindows((win) => {
                    win.forEach(w => w.close(true));
                });

                if (app.uuid !== 'Layouts-Manager') {
                    wrappedApp.close(true);
                }
            }
        });
    });
}

export async function getLayout() {
    const id = (document.getElementById('layoutSelect') as HTMLSelectElement).value;
    const workspace = Storage.getLayout(id);
    document.getElementById('showLayout')!.innerHTML = JSON.stringify(workspace, null, 2);
}

export async function getAllLayouts() {
    const layoutIDs = Storage.getAllLayoutIDs();
    document.getElementById('showLayout')!.innerHTML = JSON.stringify(layoutIDs, null, 2);
}

export async function restoreLayout() {
    const id = (document.getElementById('layoutSelect') as HTMLSelectElement).value;
    const workspace = Storage.getLayout(id);
    console.log('Restoring layout');
    const afterLayout = await Layouts.restoreLayout(workspace.layout);
    document.getElementById('showLayout')!.innerHTML = JSON.stringify(afterLayout, null, 2);
}

export async function createChild(parentWindowName: string): Promise<void> {
    openChild(parentWindowName + ' -  win' + numChildren, numChildren);
    numChildren++;
}

export function openChild(name: string, i: number, frame = true, url?: string) {
    const win = fin.Window.create({
        url: url || `${launchDir}/demo-window.html`,
        autoShow: false,
        defaultHeight: 250 + 50 * i,
        defaultWidth: 250 + 50 * i,
        defaultLeft: 320 * (i % 3),
        defaultTop: i > 2 ? 400 : 50,
        saveWindowState: false,
        frame,
        name
    });
    return win;
}

export async function createAppFromManifest2() {
    const appUrl = `${launchDir}/app2.json`;
    console.log('appurl', appUrl);
    fin.desktop.Application.createFromManifest(appUrl, (a: fin.OpenFinApplication) => a.run(), (e: Error) => {
        throw e;
    });
    // v2 api broken for createfromman / run
    // const app = await fin.Application.createFromManifest(appUrl);
    // app.run();
}
export async function createAppFromManifest3() {
    const appUrl = `${launchDir}/app3.json`;
    console.log('appurl', appUrl);
    fin.desktop.Application.createFromManifest(appUrl, (a: fin.OpenFinApplication) => a.run(), (e: Error) => {
        throw e;
    });
    // v2 api broken for createfromman / run
    // const app = await fin.Application.createFromManifest(appUrl);
    // app.run();
}

export async function createAppProgrammatically4() {
    const app = new fin.desktop.Application(
        {
            url: `http://localhost:1337/demo/app4.html`,
            uuid: 'App-4',
            name: 'App-4',
            mainWindowOptions: {defaultWidth: 400, defaultHeight: 300, saveWindowState: false, autoShow: true, defaultCentered: true}
        },
        () => {
            app.run();
        });
}

export async function createAppProgrammatically5() {
    const app = new fin.desktop.Application(
        {
            url: `http://localhost:1337/demo/app5.html`,
            uuid: 'App-5',
            name: 'App-5',
            mainWindowOptions: {defaultWidth: 300, defaultHeight: 400, saveWindowState: false, autoShow: true, defaultCentered: true}
        },
        () => {
            app.run();
        });
}

export function forgetMe(identity: Identity) {
    forgetWindows.push(identity);
}

export function createSnapWindows(): void {
    // Create snap windows
    fin.desktop.main(() => {
        for (let i = 0; i < 6; i++) {
            const unused = new fin.desktop.Window(
                {
                    url: `${launchDir}/frameless-window.html`,
                    autoShow: true,
                    defaultHeight: i > 2 ? 275 : 200,
                    defaultWidth: i > 4 ? 400 : 300,
                    defaultLeft: 350 * (i % 3) + 25,
                    defaultTop: i > 2 ? 300 : 50,
                    saveWindowState: false,
                    frame: false,
                    name: 'Window' + (i + 1),
                },
                console.log,
                console.error);
        }
    });
}

export function createTabbedWindow(page: string) {
    const uuid = `App${numTabbedWindows}`;
    const app = new fin.desktop.Application(
        {
            url: `http://localhost:1337/demo/tabbing/App/${page}.html`,
            uuid,
            name: uuid,
            mainWindowOptions: {defaultWidth: 400, defaultHeight: 300, saveWindowState: false, autoShow: true, defaultCentered: true}
        },
        () => {
            app.run();
            numTabbedWindows++;
        });
}

async function onAppRes(layoutApp: LayoutApp): Promise<LayoutApp> {
    console.log('Apprestore called:', layoutApp);
    // We use the v1 version of Application.getCurrent() due to an event-loop bug
    // when calling the v2 version inside a channel callback. Due for fix in v35
    const ofApp = fin.desktop.Application.getCurrent();
    const openWindows = await new Promise<fin.OpenFinWindow[]>(res => ofApp.getChildWindows(res));
    const openAndPosition = layoutApp.childWindows.map(async (win, index) => {
        if (!openWindows.some((w: fin.OpenFinWindow) => w.name === win.name)) {
            const ofWin = await openChild(win.name, index, win.frame, win.info.url);
            await positionWindow(win);
        } else {
            await positionWindow(win);
        }
    });
    await Promise.all(openAndPosition);
    return layoutApp;
}

function removeForgetWins(window: Identity) {
    return !forgetWindows.some(w => w.name === window.name);
}

function addLayoutNamesToDropdown() {
    const ids = Storage.getAllLayoutIDs();
    const layoutSelect = document.getElementById('layoutSelect');
    ids.forEach((id) => {
        const option = createOptionElement(id);
        if (layoutSelect) {
            layoutSelect.appendChild(option);
        }
    });
}

function createOptionElement(id: string) {
    const option = document.createElement('option');
    option.value = id;
    option.innerHTML = id;
    return option;
}

export function importLayout() {
    const textfield = document.getElementById('showLayout')! as HTMLTextAreaElement;
    const layout = JSON.parse(textfield.value);
    setLayout(layout.layout || layout);
}

// Do not snap to other windows
Layouts.deregister();

// Allow layouts service to save and restore this application
Layouts.onApplicationSave(() => {
    return {test: true};
});
Layouts.onAppRestore(onAppRes);
Layouts.ready();

fin.desktop.main(() => {
    addLayoutNamesToDropdown();
});
