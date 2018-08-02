import * as Layouts from '../client/main';
import { Application } from 'hadouken-js-adapter';
import { ServiceIdentity } from 'hadouken-js-adapter/out/types/src/api/services/channel';
import { _Window } from 'hadouken-js-adapter/out/types/src/api/window/window';
import { LayoutApp } from '../types';

//tslint:disable-next-line:no-any
declare var fin: any;
declare var window: _Window & {forgetMe: (identity: ServiceIdentity)=>void};

let numChildren = 0;
const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));
const forgetWindows: ServiceIdentity[] = [];

window.forgetMe = forgetMe;

export async function setLayout() {
    const name = (document.getElementById('layoutName') as HTMLTextAreaElement).value;
    const layout = await Layouts.saveCurrentLayout(name);
    document.getElementById('showLayout')!.innerHTML = JSON.stringify(layout, null, 2);
}

export async function getLayout() {
    const name = (document.getElementById('layoutName') as HTMLTextAreaElement).value;
    const layout = await Layouts.getLayout(name);

    layout.apps.forEach(app => {
        app.mainWindow.image = "...";
        app.childWindows.forEach(win => {
            win.image = "...";
        });
    });

    document.getElementById('showLayout')!.innerHTML = JSON.stringify(layout, null, 2);
}

export async function getAllLayouts() {
    const layoutNames = await Layouts.getAllLayoutNames();
    document.getElementById('showLayout')!.innerHTML = JSON.stringify(layoutNames, null, 2);
}

export async function restoreLayout() {
    const name = (document.getElementById('layoutName') as HTMLTextAreaElement).value;
    const layout = await Layouts.restoreLayout(name);
    console.log('after layout,', layout);
}

export async function createChild() {
    openChild('win' + numChildren, numChildren);
    numChildren++;
}

export function openChild(name: string, i: number) {
    const win = fin.Window.create({
        url: `${launchDir}/demo-window.html`,
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

export async function createApp() {
    const appUrl = `${launchDir}/app2.json`;
    console.log('appurl', appUrl);
    fin.desktop.Application.createFromManifest(appUrl, (a: Application)=>a.run(), (e: Error) => { throw e; });
    // v2 api broken for createfromman / run
    // const app = await fin.Application.createFromManifest(appUrl);
    // app.run();
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

async function delayPromise(ms: number): Promise<{}> {
    return new Promise(res => {
        setTimeout(res, ms);
    });
}

async function onAppRes(layoutApp: LayoutApp): Promise<LayoutApp> {
    await delayPromise(2000);
    console.log('Apprestore called:', layoutApp);
    const ofApp = await fin.Application.getCurrent();
    const openWindows = await ofApp.getChildWindows();
    const openAndPosition = layoutApp.childWindows.map(async (win, index) => {
        if(!openWindows.some((w: Application) => w.identity.name === win.name)) {
            const ofWin = await openChild(win.name, index);
            await ofWin.setBounds(win).catch((e: Error) => console.log('Setbounds error:', e));
        } else {
            const ofWin = await fin.Window.wrap(win);
            await ofWin.leaveGroup();
            await ofWin.setBounds(win).catch((e: Error) => console.log('Setbounds error:', e));
        }
    });
    await Promise.all(openAndPosition);
    return layoutApp;
}

function removeForgetWins(window: ServiceIdentity) {
    return !forgetWindows.some(w => w.name === window.name);
}

Layouts.onWillSaveAppLayout(layoutApp => {
    layoutApp.childWindows = layoutApp.childWindows.filter(removeForgetWins);
    return layoutApp;
});
//tslint:disable-next-line:no-any
Layouts.onAppRestore(onAppRes as any);
Layouts.ready();
