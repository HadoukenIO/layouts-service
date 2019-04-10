import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {WorkspaceApp, WorkspaceWindow} from '../../client/workspaces';
import {model} from '../main';
import {WindowIdentity} from '../model/DesktopWindow';
import {promiseMap} from '../snapanddock/utils/async';

export const getGroup = (identity: Identity): Promise<Identity[]> => {
    const {uuid, name} = identity;
    const ofWin = fin.desktop.Window.wrap(uuid, name!);
    // v2api getGroup broken
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

export const regroupWorkspace = async (apps: WorkspaceApp[]) => {
    await promiseMap(apps, async(app: WorkspaceApp): Promise<void> => {
        await groupWindow(app.mainWindow);
        await promiseMap(app.childWindows, async (child: WorkspaceWindow) => {
            await groupWindow(child);
        });
    });
};

export const groupWindow = async (baseWindow: WorkspaceWindow) => {
    await promiseMap(baseWindow.windowGroup, async (windowFromWindowGroup: Identity) => {
        if (windowFromWindowGroup.uuid === 'layouts-service') {
            return;
        }

        // We cannot guarantee that any particular requested window will be restored, so we don't rely on any particular entry in windowGroup being present.
        const curEntityWindow = await model.expect(windowFromWindowGroup as WindowIdentity);
        const targetEntityWindow = await model.expect(baseWindow as WindowIdentity);
        if (curEntityWindow && targetEntityWindow) {
            // If window has a tabGroup, we should group it instead of the window itself.
            const targetEntity = targetEntityWindow.tabGroup || targetEntityWindow;
            const curEntity = curEntityWindow.tabGroup || curEntityWindow;

            if (curEntity.snapGroup.id !== targetEntity.snapGroup.id) {
                try {
                    await curEntity.setSnapGroup(targetEntity.snapGroup);
                } catch (error) {
                    console.error('setSnapGroup in groupWindow failed for: ', baseWindow, windowFromWindowGroup);
                }
            }
        }
    });
};
