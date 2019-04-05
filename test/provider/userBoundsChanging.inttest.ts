import {Fin, Window} from 'hadouken-js-adapter';
import * as assert from 'power-assert';

import {teardown} from '../teardown';

import {getConnection} from './utils/connect';
import {createChildWindow} from './utils/createChildWindow';
import {delay} from './utils/delay';
import {getBounds} from './utils/getBounds';

let fin: Fin;

let wins: Window[] = [];

beforeAll(async () => {
    fin = await getConnection();
});
beforeEach(async () => {
    // Spawn two windows - wins[0] un-tabbed, wins[1] tabbed.  Any additional windows needed should be created in the test.
    wins[0] = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    });
    wins[1] = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/default.html',
        frame: true
    });
    await delay(500);
});

afterEach(async () => {
    // Try and close all the windows.  If the window is already closed then it will throw an error which we catch and ignore.
    await Promise.all(wins.map(win => {
        try {
            return win.close();
        } catch (e) {
            return;
        }
    }));

    wins = [];
});
afterEach(teardown);

it('When animating window movement, windows should not snap', async () => {
    const win2Bounds = await getBounds(wins[1]);

    await wins[0].animate(
        {position: {left: win2Bounds.left + 50, top: win2Bounds.top - (win2Bounds.bottom - win2Bounds.top + 2), duration: 3000}}, {interrupt: false});

    await wins[1].animate({position: {left: 500, top: 500, duration: 3000}}, {interrupt: false});

    const bounds1 = await getBounds(wins[0]);
    const bounds2 = await getBounds(wins[1]);

    assert.notStrictEqual(bounds1.left, bounds2.left);
    assert.notStrictEqual(bounds1.bottom, bounds2.top);
});


it('When animating window movement, window should not tab', async () => {
    const win2bounds = await getBounds(wins[1]);

    await wins[0].animate({position: {left: win2bounds.left + 20, top: win2bounds.top + 20, duration: 3000}}, {interrupt: false});

    await delay(500);
    // Test that the windows are tabbed
    await assertNotTabbed(wins[0]);
});

it('When programmatically moving window, window should not snap', async () => {
    const win2Bounds = await getBounds(wins[1]);

    await wins[0].moveTo(
        win2Bounds.left + 50,
        win2Bounds.top - (win2Bounds.bottom - win2Bounds.top + 2),
    );

    await wins[1].moveTo(500, 500);

    const bounds1 = await getBounds(wins[0]);
    const bounds2 = await getBounds(wins[1]);

    assert.notStrictEqual(bounds1.left, bounds2.left);
    assert.notStrictEqual(bounds1.bottom, bounds2.top);
});


it('When programmatically moving window, window should not tab', async () => {
    const win2bounds = await getBounds(wins[1]);

    await wins[0].moveTo(win2bounds.left + 20, win2bounds.top + 20);

    await delay(500);
    // Test that the windows are tabbed
    await assertNotTabbed(wins[0]);
});

async function assertNotTabbed(win: Window): Promise<void> {
    // TODO: Determine if the window is tabbed on the service side.

    // Window is native grouped only to the tabstrip
    const nativeGroup = await win.getGroup();

    // Not grouped to any other windows
    assert.strictEqual(nativeGroup.length, 0);
}
