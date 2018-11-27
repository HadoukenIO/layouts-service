import {Application} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {getConnection} from '../../provider/utils/connect';
import {createChildWindow} from '../../provider/utils/createChildWindow';
import { randomCoordinate } from '../workspaces/basicSaveAndRestore.test';

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
    defaultHeight: 300,
    defaultWidth: 300,
    defaultLeft: 200,
    defaultTop: 200,
    saveWindowState: false,
    frame: true,
    name: 'BASE'
};

export class AppInitializer {

    constructor() {}

    public async initApps(params: AppInitializerInfo[]): Promise<TestApp[]> {
        const fin = await getConnection();
        const result: TestApp[] = [];
        for (const param of params) {
            let createdApp: Application;
            if (param.createType === 'programmatic') {
                createdApp = await fin.Application.create(param.appOptions);
                await createdApp.run();
            } else {
                createdApp = await fin.Application.createFromManifest(param.manifestUrl);
                await createdApp.run();
            }

            const childWindows: _Window[] = [];
            for (let index = 0; index < param.childWindows.length; index++) {
                const child = param.childWindows[index];
                childWindows.push(await createChildWindow(
                    {...CHILD_WINDOW_BASE, defaultTop: randomCoordinate(), defaultLeft: randomCoordinate(), ...child}, createdApp.identity.uuid));
            }

            result.push({
                uuid: createdApp.identity.uuid,
                app: createdApp,
                mainWindow: await createdApp.getWindow(),
                children: childWindows,
            });
        }
        return result;
    }
}
