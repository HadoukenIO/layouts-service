import {Application} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {getConnection} from '../../provider/utils/connect';
import {createChildWindow} from '../../provider/utils/createChildWindow';
import {delay} from '../../provider/utils/delay';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';

// import { randomCoordinate } from '../workspaces/basicSaveAndRestore.test';

interface ParamBase {
    childWindows: fin.WindowOptions[];
}

interface ProgrammaticParam extends ParamBase {
    createType: 'programmatic';
    appOptions: fin.ApplicationOptions;
}

interface ManifestParams extends ParamBase {
    createType: 'manifest';
    manifestUrl: string;
}

export type AppInitializerInfo = ProgrammaticParam|ManifestParams;

export interface TestApp {
    uuid: string;
    app: Application;
    mainWindow: _Window;
    children: _Window[];
}

const CHILD_WINDOW_BASE = {
    url: `http://localhost:1337/test/demo-window.html`,
    autoShow: true,
    defaultHeight: 250,
    defaultWidth: 250,
    defaultLeft: 200,
    defaultTop: 200,
    saveWindowState: false,
    frame: true,
    name: 'BASE'
};

function childYCoordinate(appNum: number, childNum: number) {
    return (appNum * 275) + (childNum * 50) + 100;
}

function childXCoordinate(appNum: number, childNum: number) {
    return ((appNum + childNum) * 280) + 300;
}

export class AppInitializer {
    constructor() {}

    public async initApps(params: AppInitializerInfo[]): Promise<TestApp[]> {
        const fin = await getConnection();
        const result: TestApp[] = [];

        for (let appIdx = 0; appIdx < params.length; appIdx++) {
            const param = params[appIdx];

            // Create the parent app
            let createdApp: Application;
            if (param.createType === 'programmatic') {
                createdApp = await fin.Application.create(param.appOptions);
            } else {
                createdApp = await fin.Application.createFromManifest(param.manifestUrl);
            }

            await createdApp.run();

            // Delay to give the app time to start up
            await delay(300);

            // Create its child windows
            const childWindows: _Window[] = [];
            for (let childIdx = 0; childIdx < param.childWindows.length; childIdx++) {
                const child = param.childWindows[childIdx];
                const defaultTop = childYCoordinate(appIdx, childIdx);
                const defaultLeft = childXCoordinate(appIdx, childIdx);
                const childOptions = {...CHILD_WINDOW_BASE, defaultLeft, defaultTop, ...child};
                const childWindow = await createChildWindow(childOptions, createdApp.identity.uuid);

                childWindows.push(childWindow);
            }

            // Save the information in the array
            result.push({
                uuid: createdApp.identity.uuid,
                app: createdApp,
                mainWindow: await createdApp.getWindow(),
                children: childWindows,
            });
        }

        return result;
    }

    public async snapWindows(snapWindowGrouping: number[][], windows: _Window[]): Promise<void> {
        for (const group of snapWindowGrouping) {
            const win1 = windows[group[0]];
            const win2 = windows[group[1]];
            await dragSideToSide(win1, 'left', win2, 'right');
        }
    }

    public async tabWindows(tabWindowGrouping: number[][], windows: _Window[]): Promise<void> {
        for (const group of tabWindowGrouping) {
            const win1 = windows[group[0]];
            const win2 = windows[group[1]];
            await tabWindowsTogether(win1, win2);
        }
    }
}
