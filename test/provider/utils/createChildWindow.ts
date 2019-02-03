import {Application, Identity} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {getConnection} from './connect';

let childWindowCount = 1;

const getClientConnection = async (uuid: string) => {
    const fin = await getConnection();
    // Snap&Dock and Tabbing use a single app (`testApp`) to spawn child windows, while S&R uses multiple apps
    // Thus, our connection strings are different
    const connectionString = uuid === 'testApp' ? 'test-app-comms' : `test-comms-${uuid}`;

    return fin.InterApplicationBus.Channel.connect(connectionString);
};

getConnection().then(fin => {
    fin.System.addListener('window-closed', evt => {
        if (evt.uuid === 'testApp' && evt.name.match(/win\d/)) {
            childWindowCount--;
        }
    });
});

export async function createChildApp(app: string|fin.ApplicationOptions, parentUuid?: string): Promise<Application> {
    parentUuid = parentUuid || 'testApp';
    const fin = await getConnection();
    const client = await getClientConnection(parentUuid);

    if (typeof app === 'string') {
        // Create a new app from manifest URL
        const identity: Identity = await client.dispatch('createAppFromManifest', app);
        return fin.Application.wrap(identity);
    } else {
        // Fill-in some default values, if not specified
        const {uuid, mainWindowOptions, ...additionalOptions} = app;
        const options: fin.ApplicationOptions = {
            uuid: uuid || `child-app-${Math.floor(Math.random() * 1000)}`,
            name: app.name || uuid,
            mainWindowOptions: {name: uuid, autoShow: true, defaultWidth: 300, defaultHeight: 200, ...mainWindowOptions},
            ...additionalOptions
        };

        // Create a new app from ApplicationOptions
        const identity: Identity = await client.dispatch('createAppFromOptions', options);
        return fin.Application.wrapSync(identity);
    }
}

export async function createChildWindow(windowOptions: fin.WindowOptions, uuid?: string): Promise<_Window> {
    uuid = uuid || 'testApp';
    const fin = await getConnection();
    const client = await getClientConnection(uuid);

    const windowName: string = windowOptions.name || 'win' + childWindowCount++;
    await client.dispatch('createWindow', {saveWindowState: false, ...windowOptions, uuid, name: windowName});

    const newWin = fin.Window.wrapSync({uuid, name: windowName});
    return newWin;
}
