import {Window, Application} from 'hadouken-js-adapter';
import Fin from 'hadouken-js-adapter/out/types/src/api/fin';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';
import { ServiceIdentity } from 'hadouken-js-adapter/out/types/src/api/services/channel';
import { LayoutApp } from '../client/types';

import * as Layouts from '../client/main';

//tslint:disable-next-line:no-any
declare var fin: any;

const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));
const url = `${launchDir}/demo-window.html`;

export function openChild(name: string, i: number) {
    const win = fin.Window.create({
        url,
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

export async function openApp() {
    const appUrl = `${launchDir}/app2.json`;
    console.log('appurl', appUrl);
    fin.desktop.Application.createFromManifest(appUrl, (a: Application)=>a.run(), (e: Error) => { throw e; });
    // v2 api broken for createfromman / run
    // const app = await fin.Application.createFromManifest(appUrl);
    // app.run();
}

const forgetWindows: ServiceIdentity[] = [];
const forgetMe = (identity: ServiceIdentity) => {
    forgetWindows.push(identity);
};
const removeForgetWins = (window: ServiceIdentity) => {
    return !forgetWindows.some(w => w.name === window.name);
};
//tslint:disable-next-line:no-any
(window as any).forgetMe = forgetMe;

async function onAppRes(layoutApp: LayoutApp): Promise<LayoutApp> {
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

Layouts.onWillSaveAppLayout(layoutApp => {
    layoutApp.childWindows = layoutApp.childWindows.filter(removeForgetWins);
    return layoutApp;
});
//tslint:disable-next-line:no-any
Layouts.onAppRestore(onAppRes as any);
Layouts.ready();
