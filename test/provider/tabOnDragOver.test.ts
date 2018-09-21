import {AnyContext, GenericTestContext, test} from 'ava';
import {Fin, Window} from 'hadouken-js-adapter';
import * as robot from 'robotjs';
import {getConnection} from './utils/connect';
import {createChildWindow} from './utils/createChildWindow';
import {delay} from './utils/delay';
import {dragWindowToOtherWindow} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';
import {assertTabbed, assertNotTabbed} from './utils/assertions';

let win1: Window, win2: Window, win3: Window;
let fin: Fin;

test.before(async () => {
    fin = await getConnection();
});
test.beforeEach(async () => {
    // Spawn two windows - win1 untabbed, win2 tabbed
    win1 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/frameless-window.html',
        frame: false
    });
    win2 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });
    await delay(1000);
});
test.afterEach.always(async () => {
    if (win1 && win1.identity) {
        await win1.close();
    }
    if (win2 && win2.identity) {
        await win2.close();
    }
    if (win3 && win3.identity) {
        await win3.close();
    }
    win1 = win2 = win3 = {} as Window;
});

test.skip('Tabset on dragover - basic drop', async t => {
    // Drag win1 over win2 to make a tabset
    await dragWindowToOtherWindow(win1, 'top-left', win2, 'top-left', {x: -20, y: -20});

    // Test that the windows are tabbed
    await assertTabbed(win1, win2, t);
});

test('Tabset on dragover - tearout dropped window', async t => {
    // Drag win1 over win2 to make a tabset
    await dragWindowToOtherWindow(win1, 'top-left', win2, 'top-left', {x: -20, y: -20});
    await delay(500);

    // Test that the windows are tabbed
    await assertTabbed(win1, win2, t);

    await delay(1000);

    // Tearout the previously dropped window
    const bounds1 = await getBounds(win1);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.right - 50, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.right + 200, bounds1.top + 20);
    robot.mouseToggle('up');

    await delay(1000);

    await Promise.all([assertNotTabbed(win1, t), assertNotTabbed(win2, t)]);
});

test('Tabset on dragover - drop on torn-out dropped window', async t => {
    // Drag win1 over win2 to make a tabset
    await dragWindowToOtherWindow(win1, 'top-left', win2, 'top-left', {x: -20, y: -20});
    await delay(500);

    // Test that the windows are tabbed
    await assertTabbed(win1, win2, t);

    await delay(1000);

    // Tearout the previously dropped window
    const bounds1 = await getBounds(win1);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.right - 50, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.right + 200, bounds1.top + 20);
    robot.mouseToggle('up');

    await delay(1000);

    // Check that the two windows are now in seperate tabgroups
    await Promise.all([assertNotTabbed(win1, t), assertNotTabbed(win2, t)]);

    // Spawn a third window
    win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/frameless-window.html',
        frame: false
    });

    // Drag win3 over win2 to make a tabset
    await dragWindowToOtherWindow(win3, 'top-left', win2, 'top-left', {x: -20, y: -20});
    await delay(500);

    await assertTabbed(win3, win2, t);
});
