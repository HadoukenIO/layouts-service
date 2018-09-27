import {AnyContext, GenericTestContext, test} from 'ava';
import {Fin, Window} from 'hadouken-js-adapter';
import * as robot from 'robotjs';
import {getConnection} from './utils/connect';
import {createChildWindow} from './utils/createChildWindow';
import {delay} from './utils/delay';
import {dragWindowToOtherWindow} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';

let fin: Fin;

let wins: Window[] = [];

test.before(async () => {
    fin = await getConnection();
});
test.beforeEach(async () => {
    // Spawn two windows - wins[0] untabbed, wins[1] tabbed
    wins[0] = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/frameless-window.html',
        frame: false
    });
    wins[1] = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });
    await delay(500);
});

test.afterEach.always(async () => {
    await Promise.all(wins.map(win => {
        try {
            return win.close();
        } catch (e) {
            return;
        }
    }));
    wins = [];
});

test('Tabset on dragover - basic drop', async t => {
    // Drag wins[0] over wins[1] to make a tabset
    await dragWindowToOtherWindow(wins[0], 'top-left', wins[1], 'top-left', {x: -20, y: -20});
    await delay(500);
    // Test that the windows are tabbed
    await assertTabbed(wins[0], wins[1], t);
});

test('Drop window on tabset', async t => {
    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 50,
        defaultLeft: 50,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    wins.push(win3);

    await dragWindowToOtherWindow(wins[0], 'top-left', wins[1], 'top-left', {x: -20, y: -20});
    await delay(500);
    await dragWindowToOtherWindow(win3, 'top-left', wins[0], 'top-left', {x: -20, y: -20});
    await delay(500);

    await assertTabbed(wins[0], win3, t);
});

test('Tabset on dragover - tearout dropped window', async t => {
    // Drag wins[0] over wins[1] to make a tabset
    await dragWindowToOtherWindow(wins[0], 'top-left', wins[1], 'top-left', {x: -20, y: -20});
    await delay(500);

    // Test that the windows are tabbed
    await assertTabbed(wins[0], wins[1], t);

    await delay(500);

    // Tearout the previously dropped window
    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.right - 50, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.right + 200, bounds1.top + 20);
    robot.mouseToggle('up');

    await delay(500);

    await Promise.all([assertNotTabbed(wins[0], t), assertNotTabbed(wins[1], t)]);
});

test('Tabset on dragover - drop on torn-out dropped window', async t => {
    // Drag wins[0] over wins[1] to make a tabset
    await dragWindowToOtherWindow(wins[0], 'top-left', wins[1], 'top-left', {x: -20, y: -20});
    await delay(500);

    // Test that the windows are tabbed
    await assertTabbed(wins[0], wins[1], t);

    await delay(500);

    // Tearout the previously dropped window
    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.right - 50, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.right + 200, bounds1.top + 20);
    robot.mouseToggle('up');

    await delay(500);

    // Check that the two windows are now in seperate tabgroups
    await Promise.all([assertNotTabbed(wins[0], t), assertNotTabbed(wins[1], t)]);

    // Spawn a third window
    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 50,
        defaultLeft: 50,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/frameless-window.html',
        frame: false
    });



    await delay(500);
    // Drag win3 over wins[1] to make a tabset
    await dragWindowToOtherWindow(win3, 'top-left', wins[0], 'top-left', {x: -20, y: -20});
    await delay(500);

    await assertTabbed(win3, wins[0], t);
    wins.push(win3);
});

test('TabGroup destroyed on tab removal (2 tab - 1)', async t => {
    await dragWindowToOtherWindow(wins[0], 'top-left', wins[1], 'top-left', {x: -20, y: -20});
    await delay(500);
    await assertTabbed(wins[0], wins[1], t);
    await delay(500);

    await wins[0].close();
    await delay(500);
    await assertNotTabbed(wins[1], t);
});

test('TabGroup remains on tab removal (3 tab - 1)', async t => {
    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 50,
        defaultLeft: 50,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    await dragWindowToOtherWindow(wins[0], 'top-left', wins[1], 'top-left', {x: -20, y: -20});
    await delay(500);
    await dragWindowToOtherWindow(win3, 'top-left', wins[1], 'top-left', {x: -20, y: -20});
    await delay(500);
    await assertTabbed(wins[0], wins[1], t);
    await assertTabbed(wins[0], win3, t);
    await delay(500);

    await win3.close();
    await delay(500);
    await assertTabbed(wins[0], wins[1], t);
});

/**
 * Asserts that two windows are succesfully tabbed together
 * @param t Ava test context against which to assert
 */
async function assertTabbed(win1: Window, win2: Window, t: GenericTestContext<AnyContext>): Promise<void> {
    // TODO: Determine if the window is tabbed on the service side.

    // Both windows are in the same native openfin group
    const [group1, group2] = [await win1.getGroup(), await win2.getGroup()];
    for (let i = 0; i < group1.length; i++) {
        t.deepEqual(group1[i].identity, group2[i].identity, 'Window native groups are different');
    }

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
