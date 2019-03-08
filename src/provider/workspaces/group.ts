import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {WorkspaceApp, WorkspaceWindow} from '../../client/workspaces';
import {model} from '../main';
import {WindowIdentity} from '../model/DesktopWindow';
import {promiseMap} from '../snapanddock/utils/async';

export const getGroup = (identity: Identity): Promise<Identity[]> => {
    const {uuid, name} = identity;
    const ofWin = fin.desktop.Window.wrap(uuid, name!);
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

        // We iterate through baseWindow.windowGroup for all main WorkspaceWindows and child WorkspaceWindows.
        // Each application saves its own Workspace information at the time the generate function is called, 
        // and each application also has the opportunity to pass back different Workspace information with its setRestoreHandler function.
        // As a result, a window's baseWindow.windowGroup may include windows from another application that are no longer coming up.
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