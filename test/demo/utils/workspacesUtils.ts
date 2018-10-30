import {Context, GenericTestContext, Test, TestContext} from 'ava';
import {Application} from 'hadouken-js-adapter';
import {TestOptions} from 'shelljs';
import {getConnection} from '../../provider/utils/connect';
import {sendServiceMessage} from './serviceUtils';

type PassIfWindowsCreated = (event: {topic: string, type: string, uuid: string, name: string}) => Promise<void>;
type PassIfAppsCreated = (event: {topic: string, type: string, uuid: string}) => Promise<void>;
type PassFunction = PassIfWindowsCreated|PassIfAppsCreated;
type SaveRestoreTestContext = GenericTestContext<Context<{apps: Application[], n: (e: string) => void, p: Promise<void>}>>;

export async function createRegisteredApp(t: SaveRestoreTestContext, uuid: string, top?: number, left?: number) {
    const fin = await getConnection();
    const app = await fin.Application.create({
        uuid,
        url: 'http://localhost:1337/test/registeredApp.html',
        name: uuid,
        mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: top || 100, defaultLeft: left || 100, defaultHeight: 300, defaultWidth: 300}
    });
    t.context.apps.push(app);
    await app.run();
    return app;
}

export async function createCloseAndRestoreLayout(t: SaveRestoreTestContext, passIfWindowsCreated: PassFunction) {
    const fin = await getConnection();
    const generatedLayout = await sendServiceMessage('generateLayout', undefined);
    await Promise.all(t.context.apps.map((app: Application) => app.close()));
    await fin.System.addListener('window-created', passIfWindowsCreated);
    await sendServiceMessage('restoreLayout', generatedLayout);
    setTimeout(() => {
        t.context.n('Too long');
        t.fail();
    }, 5000);
    await t.context.p;
}