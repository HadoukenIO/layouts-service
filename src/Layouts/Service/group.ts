
import { Identity } from 'hadouken-js-adapter/out/types/src/identity';
import { LayoutApp, WindowState } from '../types';
import { promiseMap } from '../../SnapAndDock/Service/utils/async';
declare var fin: any;

// UTILS
export const getGroup = (identity: Identity): Promise<Identity[]> => {
    const { uuid, name } = identity;
    const ofWin = fin.desktop.Window.wrap(uuid, name);
    // v2api getgroup broken
    return new Promise((res, rej) => {
        ofWin.getGroup((group: Array<{ identity: Identity }>) => {
            console.log('group v1', group);
            const groupIds = group.map((win: any) => {
                console.log('in group, see uuid?', win);
                return { uuid: win.uuid, name: win.name };
            }).filter((id: Identity) => {
                console.log('in group, see uuid?', id);
                return id.uuid !== uuid || id.name !== name;
            });
            res(groupIds);
            return;
        }, () => res([]));
    });
    // return promiseMap(group, async (wrappedWindow: any) => {
    //   // only identities, not wrapped windows
    //   const info = await wrappedWindow.getInfo();
    //   const { uuid, name } = wrappedWindow.identity;
    //   return { uuid, name, url: info.url };
    // });
};

export const regroupLayout = async (apps: LayoutApp[]) => {
    await promiseMap(apps, async (app: LayoutApp): Promise<void> => {
        await groupWindow(app.mainWindow);
        await promiseMap(app.childWindows, async (child: WindowState) => {
            await groupWindow(child);
        });
    });
};

export const groupWindow = async (win: WindowState) => {
    const { uuid, name } = win;
    const ofWin = await fin.Window.wrap({ uuid, name });
    await promiseMap(win.windowGroup, async (w: Identity) => {
        const toGroup = await fin.Window.wrap({ uuid: w.uuid, name: w.name });
        console.log('about to merge', toGroup, ofWin);
        await ofWin.mergeGroups(toGroup);
    });
};