import * as Layouts from '../client/main';
import { Application } from 'hadouken-js-adapter';
import { ServiceIdentity } from 'hadouken-js-adapter/out/types/src/api/services/channel';
import { _Window } from 'hadouken-js-adapter/out/types/src/api/window/window';
import { LayoutApp } from '../client/types';
import { positionWindow } from '../provider/workspaces/utils';

//tslint:disable-next-line:no-any
declare var fin: any;
declare var window: _Window & {forgetMe: (identity: ServiceIdentity)=>void};

let numChildren = 0;
let numTabbedWindows = 0;
const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));
const forgetWindows: ServiceIdentity[] = [];

window.forgetMe = forgetMe;

export async function setLayout() {
    const name = (document.getElementById('layoutName') as HTMLTextAreaElement).value;
    const layoutSelect = document.getElementById('layoutSelect') as HTMLSelectElement;
    const layout = await Layouts.saveCurrentLayout(name);

    if (layoutSelect) {
        let optionPresent = false;
        for (let idx = 0; idx < layoutSelect.options.length;  idx++) { // looping over the options
            if (layoutSelect.options[idx].value === name) {
                optionPresent = true;
                return;
            }
        }

        if (!optionPresent) {
            const option = createOptionElement(name);
            layoutSelect.appendChild(option);
        }
    }
    document.getElementById('showLayout')!.innerHTML = JSON.stringify(layout, null, 2);
}

export async function getLayout() {
    const name = (document.getElementById('layoutSelect') as HTMLSelectElement).value;
    const layout = await Layouts.getLayout(name);

    document.getElementById('showLayout')!.innerHTML = JSON.stringify(layout, null, 2);
}

export async function getAllLayouts() {
    const layoutNames = await Layouts.getAllLayoutNames();
    document.getElementById('showLayout')!.innerHTML = JSON.stringify(layoutNames, null, 2);
}

export async function restoreLayout() {
    const name = (document.getElementById('layoutSelect') as HTMLSelectElement).value;
    const layout = await Layouts.restoreLayout(name);
    console.log('after layout,', layout);
}

export async function createChild() {
    openChild('win' + numChildren, numChildren);
    numChildren++;
}

export function openChild(name: string, i: number, url?: string) {
    const win = fin.Window.create({
        url: url || `${launchDir}/demo-window.html`,
        autoShow: true,
        defaultHeight: 250 + 50*i,
        defaultWidth: 250 + 50*i,
        defaultLeft: 320*(i%3),
        defaultTop: i > 2 ? 400 : 50,
        saveWindowState: false,

        name
    });
    return win;
}

export async function createAppFromManifest2() {
    const appUrl = `${launchDir}/app2.json`;
    console.log('appurl', appUrl);
    fin.desktop.Application.createFromManifest(appUrl, (a: Application)=>a.run(), (e: Error) => { throw e; });
    // v2 api broken for createfromman / run
    // const app = await fin.Application.createFromManifest(appUrl);
    // app.run();
}
export async function createAppFromManifest3() {
    const appUrl = `${launchDir}/app3.json`;
    console.log('appurl', appUrl);
    fin.desktop.Application.createFromManifest(appUrl, (a: Application)=>a.run(), (e: Error) => { throw e; });
    // v2 api broken for createfromman / run
    // const app = await fin.Application.createFromManifest(appUrl);
    // app.run();
}

export async function createAppProgrammatically4() {
    const app = new fin.desktop.Application({
        url: `http://localhost:1337/demo/app4.html`,
        uuid: 'App-4',
        name: 'App-4',
        mainWindowOptions: {
            defaultWidth: 400,
            defaultHeight: 300,
            saveWindowState: false,
            autoShow: true,
            defaultCentered: true
        }
    },
        () => {
            app.run();
        }
    );
}

export async function createAppProgrammatically5() {
    const app = new fin.desktop.Application({
        url: `http://localhost:1337/demo/app5.html`,
        uuid: 'App-5',
        name: 'App-5',
        mainWindowOptions: {
            defaultWidth: 300,
            defaultHeight: 400,
            saveWindowState: false,
            autoShow: true,
            defaultCentered: true
        }
    },
        () => {
            app.run();
        }
    );
}

export function forgetMe(identity: ServiceIdentity) {
    forgetWindows.push(identity);
}

export function createSnapWindows(): void {
    // Create snap windows
    fin.desktop.main(() => {
        for (let i = 0; i < 6; i++) {
            const unused = new fin.desktop.Window({
                url: `${launchDir}/frameless-window.html`,
                autoShow: true,
                defaultHeight: i > 2 ? 275 : 200,
                defaultWidth: i > 4 ? 400 : 300,
                defaultLeft: 350 * (i % 3) + 25,
                defaultTop: i > 2 ? 300 : 50,
                saveWindowState: false,
                frame: false,
                name: 'Window' + (i + 1),
            }, console.log, console.error);
        }
    });
}

export function createTabbedWindow(page: string) {
    const uuid = `App${numTabbedWindows}`;
    const app = new fin.desktop.Application({
        url: `http://localhost:1337/demo/tabbing/App/${page}.html`, 
        uuid, 
        name: uuid,
        mainWindowOptions: {
            defaultWidth: 400,
            defaultHeight: 300,
            saveWindowState: false,
            autoShow: true,
            defaultCentered: true
        }
    },
        () => {
            app.run();
            numTabbedWindows++;
        }
    );
}

async function onAppRes(layoutApp: LayoutApp): Promise<LayoutApp> {
    console.log('Apprestore called:', layoutApp);
    const ofApp = await fin.Application.getCurrent();
    const openWindows = await ofApp.getChildWindows();
    const openAndPosition = layoutApp.childWindows.map(async (win, index) => {
        if(!openWindows.some((w: Application) => w.identity.name === win.name)) {
            const ofWin = await openChild(win.name, index, win.info.url);
            positionWindow(win);
        } else {
            positionWindow(win);
        }
    });
    await Promise.all(openAndPosition);
    return layoutApp;
}

function removeForgetWins(window: ServiceIdentity) {
    return !forgetWindows.some(w => w.name === window.name);
}

function addLayoutNamesToDropdown() {
    Layouts.getAllLayoutNames().then((names) => {
        const layoutSelect = document.getElementById('layoutSelect');
        names.forEach((name) => {
            const option = createOptionElement(name);
            if (layoutSelect) {
                layoutSelect.appendChild(option);
            }
        });
    });
}

function createOptionElement(name: string) {
    const option = document.createElement('option');
    option.value = name;
    option.innerHTML = name;
    return option;
}

//Do not snap to other windows
Layouts.deregister();

//Allow layouts service to save and restore this application
Layouts.onWillSaveAppLayout(layoutApp => {
    layoutApp.childWindows = layoutApp.childWindows.filter(removeForgetWins);
    return layoutApp;
});
Layouts.onAppRestore(onAppRes);
Layouts.ready();

fin.desktop.main(() => {
    addLayoutNamesToDropdown();
});
