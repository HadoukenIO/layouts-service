import {test} from 'ava';
import {Fin, Window} from 'hadouken-js-adapter';

import {promiseMap} from '../../src/provider/snapanddock/utils/async';

import {assertGrouped, assertNotGrouped} from './utils/assertions';
import {getConnection} from './utils/connect';
import {createChildWindow} from './utils/createChildWindow';
import {delay} from './utils/delay';
import {dragSideToSide, dragWindowTo} from './utils/dragWindowTo';
import {getBounds, NormalizedBounds} from './utils/getBounds';

let windows: Window[] = new Array<Window>(2);
let fin: Fin;

const windowOptions = [
    {
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    },
    {
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    }
];

test.before(async t => {
    fin = await getConnection();
});
test.beforeEach(async t => {
    for (let i = 0; i < 2; i++) {
        windows[i] = await createChildWindow(windowOptions[i]);
    }
});
test.afterEach.always(async t => {
    for (let i = 0; i < windows.length; i++) {
        await windows[i].close();
    }
    windows = new Array<Window>(2);

    // Re-enable docking after each test as service state persists through whole run
    await disableDocking(false);
});

test('docking enabled - normal behaviour expected', async t => {
    let bounds: NormalizedBounds[];

    await dragSideToSide(windows[1], 'left', windows[0], 'right', {x: 5, y: 10});

    await assertGrouped(t, windows[0], windows[1]);
    bounds = await promiseMap(windows, win => getBounds(win));
    t.is(bounds[0].right, bounds[1].left);

    await dragWindowTo(windows[0], 200, 400);

    await assertGrouped(t, windows[0], windows[1]);
    bounds = await promiseMap(windows, win => getBounds(win));
    t.is(bounds[0].right, bounds[1].left);
});

test('docking disabled - windows should snap but not dock', async t => {
    await disableDocking(true);

    let bounds: NormalizedBounds[];

    await dragSideToSide(windows[1], 'left', windows[0], 'right', {x: 5, y: 10});

    await assertNotGrouped(windows[0], t);
    await assertNotGrouped(windows[1], t);
    bounds = await promiseMap(windows, win => getBounds(win));
    t.is(bounds[0].right, bounds[1].left);

    await dragWindowTo(windows[0], 400, 400);

    await assertNotGrouped(windows[0], t);
    await assertNotGrouped(windows[1], t);
    bounds = await promiseMap(windows, win => getBounds(win));
    t.not(bounds[0].right, bounds[1].left);
});

async function disableDocking(disabled: boolean): Promise<void> {
    fin.InterApplicationBus.send({uuid: 'layouts-service', name: 'layouts-service'}, 'layoutsService:experimental:disableDocking', disabled);

    // hard code a tiny delay here as IAB is fire-and-forget
    return delay(100);
}