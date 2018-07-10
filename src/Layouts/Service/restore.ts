import { LayoutApp, LayoutName, Layout, WindowState } from "../types";
import { Identity } from "hadouken-js-adapter/out/types/src/identity";
import { flexibleGetLayout } from "./storage";
import { promiseMap } from "../../SnapAndDock/Service/utils/async";
import { providerChannel } from "./index";
import { isClientConnection, positionWindow, createAppPlaceholders } from "./utils";
import { regroupLayout } from "./group";


declare var fin: any;
const appsToRestore = new Map();

interface AppToRestore {
    layoutApp: LayoutApp;
    resolve: Function;
}

const setAppToRestore = (layoutApp: LayoutApp, resolve: Function): void => {
    const { uuid } = layoutApp;
    const save = { layoutApp, resolve };
    appsToRestore.set(uuid, save);
};

export const getAppToRestore = (uuid: string): AppToRestore => {
    return appsToRestore.get(uuid);
};

export const restoreApplication = async (layoutApp: LayoutApp, resolve: Function): Promise<void> => {
    const { uuid } = layoutApp;
    const defaultResponse: LayoutApp = { ...layoutApp, childWindows: [] };
    const identity = { uuid, name: uuid };
    console.log('in restoreapplication fn');
    const responseAppLayout: LayoutApp | false = await providerChannel.dispatch(identity, 'restoreApp', layoutApp);
    if (responseAppLayout) {
        resolve(responseAppLayout);
    } else {
        resolve(defaultResponse);
    }
    appsToRestore.delete(uuid);
};

export const restoreLayout = async (payload: LayoutName | Layout, identity: Identity): Promise<Layout> => {
    const layout = await flexibleGetLayout(payload);
    const startupApps: Array<Promise<LayoutApp>> = [];
    // cannot use async/await here because we may need to return a promise that later resolves
    console.log('restore layout', layout);
    const apps = await promiseMap(layout.apps, async (app: any): Promise<LayoutApp> => {
        // get rid of childWindows (anything else?)
        const defaultResponse = { ...app, childWindows: [] };
        const { uuid } = app;
        console.log('app', app);
        const ofApp = await fin.Application.wrap({ uuid });
        const isRunning = await ofApp.isRunning();
        if (isRunning) {
            if (isClientConnection(app)) {
                await positionWindow(app.mainWindow);
                // LATER SET CONTEXT HERE
                console.log('in isrunning', app);
                const response: LayoutApp | false = await providerChannel.dispatch({ uuid, name: uuid }, 'restoreApp', app);
                console.log('response', response);
                return response ? response : defaultResponse;
            } else {
                await positionWindow(app.mainWindow);
                // not connected, return default response
                return defaultResponse;
            }
        } else {
            let ofApp: any;
            createAppPlaceholders(app);

            // not running - setup comm once started
            if (app.confirmed) {
                console.log('out of isrunning', app);
                startupApps.push(new Promise((resolve: (layoutApp: LayoutApp) => void) => {
                    setAppToRestore(app, resolve);
                    console.log('after set app to restore');
                }));
            }
            // start app
            const { manifest, manifestUrl } = app;
            if (typeof manifest === 'object' && manifest.startup_app && manifest.startup_app.uuid === uuid) {
                // started from manifest
                if (manifestUrl) {
                    console.log('in the manifest url...');
                    // v2 api broken
                    // ofApp = await fin.Application.createFromManifest(manifestUrl);
                    fin.desktop.Application.createFromManifest(manifestUrl, (v1App: any) => {
                        v1App.run(() => {
                            positionWindow(app.mainWindow);
                        }, (e:any) => console.log('app run error', e));
                    }, (e:any) => console.log('create from mann error', e));
                } else {
                    console.warn(`NO manifest Url, creating ${app.uuid} from saved manifest, cannot restore if saved again`);
                    ofApp = await fin.Application.create(app.manifest.startup_app);
                }
            } else {
                ofApp = await fin.Application.create(app.initialOptions);
            }
            if (ofApp) {
                await ofApp.run().catch(console.log);
                await positionWindow(app.mainWindow);
            }
            return defaultResponse;
        }
    });
    const startupResponses = await Promise.all(startupApps);
    const allAppResponses = apps.map(app => {
        console.log('in allappres, before');
        const appResponse = startupResponses.find(appRes => appRes.uuid === app.uuid);
        console.log('in allappres, after');
        return appResponse ? appResponse : app;
    });
    layout.apps = allAppResponses;
    console.log('before group');
    await regroupLayout(apps).catch(console.log);
    console.log('AFTER regroup');
    return layout;
};

