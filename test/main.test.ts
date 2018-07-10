import {test} from 'ava';

import {getConnection} from './utils/connect';
import {dragWindowTo} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';

test('basic test', async t => {
    const fin = await getConnection();

    const app1 = await fin.Application.create({
        uuid: 'testapp1',
        name: 'testapp1',
        mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200}
    });
    await app1.run();

    const app2 = await fin.Application.create({
        uuid: 'testapp2',
        name: 'testapp2',
        mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200}
    });
    await app2.run();



    const win1 = await fin.Window.wrap({uuid: 'testapp1', name: 'testapp1'});
    const win2 = await fin.Window.wrap({uuid: 'testapp2', name: 'testapp2'});
    const win2Bounds = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.left + 50, win2Bounds.bottom + 2);
    await dragWindowTo(win2, 500, 500);


    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);
    t.is(bounds1.left, bounds2.left);
    t.is(bounds1.top, bounds2.bottom);
});
