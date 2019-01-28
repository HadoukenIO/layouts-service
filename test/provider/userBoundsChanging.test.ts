import {AnyContext, GenericTestContext, test} from 'ava';
import {Fin, Window} from 'hadouken-js-adapter';

import {teardown} from '../teardown';

import {getConnection} from './utils/connect';
import {createChildWindow} from './utils/createChildWindow';
import {delay} from './utils/delay';
import {getBounds} from './utils/getBounds';

let fin: Fin;

let wins: Window[] = [];

test.before(async () => {
    fin = await getConnection();
});
test.beforeEach(async () => {
    // Spawn two windows - wins[0] untabbed, wins[1] tabbed.  Any additional windows needed should be created in the test.
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

test.afterEach.always(async (t) => {
    // Try and close all the windows.  If the window is already closed then it will throw an error which we catch and ignore.
    await Promise.all(wins.map(win => {
        try {
            return win.close();
        } catch (e) {
            return;
        }
    }));

    wins = [];
    await teardown(t);
});

test('Animate Basic Snap, top - should not snap', async t => {
    const win2Bounds = await getBounds(wins[1]);

    await wins[0].animate(
        {position: {left: win2Bounds.left + 50, top: win2Bounds.top - (win2Bounds.bottom - win2Bounds.top + 2), duration: 3000}}, {interrupt: false});

    await wins[1].animate({position: {left: 500, top: 500, duration: 3000}}, {interrupt: false});

    const bounds1 = await getBounds(wins[0]);
    const bounds2 = await getBounds(wins[1]);

    t.not(bounds1.left, bounds2.left);
    t.not(bounds1.bottom, bounds2.top);
});


test('Animate Basic Tab - should not tab', async t => {
    const win2bounds = await getBounds(wins[1]);

    await wins[0].animate({position: {left: win2bounds.left + 20, top: win2bounds.top + 20, duration: 3000}}, {interrupt: false});

    await delay(500);
    // Test that the windows are tabbed
    await assertNotTabbed(wins[0], t);
});

test('Programmatic move, Basic Snap, top - should not snap', async t => {
    const win2Bounds = await getBounds(wins[1]);

    await wins[0].moveTo(
        win2Bounds.left + 50,
        win2Bounds.top - (win2Bounds.bottom - win2Bounds.top + 2),
    );

    await wins[1].moveTo(500, 500);

    const bounds1 = await getBounds(wins[0]);
    const bounds2 = await getBounds(wins[1]);

    t.not(bounds1.left, bounds2.left);
    t.not(bounds1.bottom, bounds2.top);
});


test('Programmatic move, Tab - should not tab', async t => {
    const win2bounds = await getBounds(wins[1]);

    await wins[0].moveTo(win2bounds.left + 20, win2bounds.top + 20);

    await delay(500);
    // Test that the windows are tabbed
    await assertNotTabbed(wins[0], t);
});


/**
 * Asserts that two windows are successfully tabbed together
 * @param t Ava test context against which to assert
 */
async function assertTabbed(win1: Window, win2: Window, t: GenericTestContext<AnyContext>): Promise<void> {
    // TODO: Determine if the window is tabbed on the service side.

    // Both windows are in the same native openfin group
    const [group1, group2] = [await win1.getGroup(), await win2.getGroup()];
    for (let i = 0; i < group1.length; i++) {
        t.deepEqual(group1[i].identity, group2[i].identity, 'Window native groups are different');
    }

    // Checks if a tabset window is present in the group (detached tab check)
    t.truthy(
        group1.find((win) => {
            return win.identity.name!.includes('TABSET-');
        }),
        'No tabset window found in openfin group!');

    // Both windows have the same bounds
    const [bounds1, bounds2] = [await getBounds(win1), await getBounds(win2)];
    t.deepEqual(bounds1, bounds2, 'Tabbed windows do not have the same bounds');
}

async function assertNotTabbed(win: Window, t: GenericTestContext<AnyContext>): Promise<void> {
    // TODO: Determine if the window is tabbed on the service side.

    // Window is native grouped only to the tabstrip
    const nativeGroup = await win.getGroup();

    // Not grouped to any other windows
    t.is(nativeGroup.length, 0);
}
