import {Context, GenericTestContext, Test, TestContext} from 'ava';
import {Application} from 'hadouken-js-adapter';
import {TestOptions} from 'shelljs';

import {getConnection} from '../../provider/utils/connect';
import {delay} from '../../provider/utils/delay';

import {sendServiceMessage} from './serviceUtils';

type PassIfWindowsCreated = (event: {topic: string, type: string, uuid: string, name: string}) => Promise<void>;
type PassIfAppsCreated = (event: {topic: string, type: string, uuid: string}) => Promise<void>;
type PassFunction = PassIfWindowsCreated|PassIfAppsCreated;
type SaveRestoreTestContext = GenericTestContext<Context<{apps: Application[], n: (e: string) => void, y: () => void, p: Promise<void>}>>;


export async function createApp(t: SaveRestoreTestContext, uuid: string, registration: string, top?: number, left?: number) {
    const registered = registration === 'registered';
    const fin = await getConnection();
    const app = await fin.Application.create({
        uuid,
        url: registered ? 'http://localhost:1337/test/registeredApp.html' : 'http://localhost:1337/test/deregisteredApp.html',
        name: uuid,
        mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: top || 200, defaultLeft: left || 200, defaultHeight: 300, defaultWidth: 300}
    });
    t.context.apps.push(app);
    await app.run();
    if (!registered) {
        // Delay to allow the window to deregister from the service.
        await delay(500);
    }
    return app;
}

export async function createCloseAndRestoreLayout(t: SaveRestoreTestContext, windowCreationFunction: PassFunction, pass: boolean) {
    const fin = await getConnection();
    const generatedLayout = await sendServiceMessage('generateLayout', undefined);
    await Promise.all(t.context.apps.map((app: Application) => app.close()));
    await fin.System.addListener('window-created', windowCreationFunction);
    await sendServiceMessage('restoreLayout', generatedLayout);
    setTimeout(() => {
        if (!pass) {
            t.context.y();
            t.pass();
        } else {
            t.context.n('Too long');
            t.fail();
        }
    }, 3000);
    await t.context.p;
}