
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {promiseMap} from '../snapanddock/utils/async';
import {LayoutApp, WindowState} from '../../client/types';

// tslint:disable-next-line:no-any
declare var fin: any;

export const getGroup = (identity: Identity): Promise<Identity[]> => {
    const {uuid, name} = identity;
    const ofWin = fin.desktop.Window.wrap(uuid, name);
    // v2api getgroup broken
    return new Promise((res, rej) => {
        ofWin.getGroup((group: fin.OpenFinWindow[]) => {
            const groupIds = group
                                 .map((win: fin.OpenFinWindow) => {
                                     return {uuid: win.uuid, name: win.name};
                                 })
                                 .filter((id: Identity) => {
                                     return id.uuid !== uuid || id.name !== name;
                                 });
            res(groupIds);
            return;
        }, () => res([]));
    });
};

export const regroupLayout = async (apps: LayoutApp[]) => {
    await promiseMap(apps, async(app: LayoutApp): Promise<void> => {
        await groupWindow(app.mainWindow);
        await promiseMap(app.childWindows, async (child: WindowState) => {
            await groupWindow(child);
        });
    });
};

export const groupWindow = async (win: WindowState) => {
    const {uuid, name} = win;
    const ofWin = await fin.Window.wrap({uuid, name});
    await promiseMap(win.windowGroup, async (w: Identity) => {
        const toWindow = await fin.Window.wrap({uuid: w.uuid, name: w.name});
        const toGroup = await toWindow.getGroup();

        // Merging two ungrouped windows does not raise any grouping events through the runtime
        // In that case, we will call joinGroup. This will have no impact on behaviour from S&R's 
        // perspective, but will allow S&R to integrate properly with S&D.
        if (toGroup.length > 0) {
            await ofWin.mergeGroups(toWindow);
        } else {
            await ofWin.joinGroup(toWindow);
        }
    });
};