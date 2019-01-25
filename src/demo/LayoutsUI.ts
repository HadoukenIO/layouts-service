import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import * as Layouts from '../client/main';
import {Workspace} from '../client/types';

import * as Storage from './storage';

export interface Workspace {
    id: string;
    layout: Workspace;
}

let numTabbedWindows = 0;
const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));

export async function setLayout(layoutParam?: Workspace) {
    const id = (document.getElementById('layoutName') as HTMLTextAreaElement).value;
    const layoutSelect = document.getElementById('layoutSelect') as HTMLSelectElement;
    const layout = layoutParam || await Layouts.Workspaces.generate();
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
    const afterLayout = await Layouts.Workspaces.restore(workspace.layout);
    document.getElementById('showLayout')!.innerHTML = JSON.stringify(afterLayout, null, 2);
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
        },
        console.error);
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
        },
        console.error);
}

export function createSnapWindows(): void {
    // Create snap windows
    fin.desktop.main(() => {
        for (let i = 0; i < 6; i++) {
            fin.Window
                .create({
                    url: `${launchDir}/popup.html`,
                    autoShow: true,
                    defaultHeight: i > 2 ? 275 : 200,
                    defaultWidth: i > 4 ? 400 : 300,
                    defaultLeft: 350 * (i % 3) + 25,
                    defaultTop: i > 2 ? 300 : 50,
                    saveWindowState: false,
                    frame: false,
                    name: 'Window' + (i + 1)
                })
                .then(console.log)
                .catch(console.log);
        }
    });
}

export function createSimpleWindow(page: string) {
    const uuid = `App${numTabbedWindows}`;
    const app = new fin.desktop.Application(
        {
            url: `http://localhost:1337/demo/${page}.html`,
            uuid,
            name: uuid,
            mainWindowOptions: {defaultWidth: 400, defaultHeight: 300, saveWindowState: false, autoShow: true, defaultCentered: true}
        },
        () => {
            app.run();
            numTabbedWindows++;
        },
        console.error);
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

Layouts.Workspaces.ready();

fin.desktop.main(() => {
    addLayoutNamesToDropdown();
});

// Expose layouts API on window for debugging/demoing
(window as Window & {layouts: typeof Layouts}).layouts = Layouts;
