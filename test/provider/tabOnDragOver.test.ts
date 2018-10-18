import {test} from 'ava';
import {Fin, Window} from 'hadouken-js-adapter';
import * as robot from 'robotjs';

import {assertNotTabbed, assertTabbed} from './utils/assertions';
import {getConnection} from './utils/connect';
import {createChildWindow} from './utils/createChildWindow';
import {delay} from './utils/delay';
import {dragWindowToOtherWindow} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';
import {tabWindowsTogether} from './utils/tabWindowsTogether';

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

test('Drag window over window - should create tabgroup', async t => {
    // Drag wins[0] over wins[1] to make a tabset (in valid drop region)
    await tabWindowsTogether(wins[0], [wins[1]]);

    // Test that the windows are tabbed
    await assertTabbed(wins[0], wins[1], t);
});

test('Drag window over window, invalid region - should not create tabgroup', async t => {
    // Fail creating group using invalid drop region
    await dragWindowToOtherWindow(wins[0], 'top-left', wins[1], 'top-left', {x: 20, y: 100});

    // Assert a group did not form
    await assertNotTabbed(wins[0], t);
});

test('Drag window into tabgroup - should create 3 tab tabgroup', async t => {
    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 500,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    // Mark win3 for closure
    wins.push(win3);

    // Tab 3 windows together
    await tabWindowsTogether(wins[0], [wins[1], win3]);

    // Assert tab group formed
    await assertTabbed(wins[0], win3, t);
});

test('Drag window into tabgroup, invalid region - should not create 3 tab tabgroup', async t => {
    // Tab 2 Windows Together
    await tabWindowsTogether(wins[1], [wins[0]]);

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

    // Mark win3 for close
    wins.push(win3);

    // Move win3 into invalid drop area
    await dragWindowToOtherWindow(win3, 'top-left', wins[0], 'top-left', {x: 20, y: 50});

    // Assert tab group did not form
    await assertNotTabbed(win3, t);
});

test('Tearout tab - should create 2 singleton windows', async t => {
    // Drag wins[0] over wins[1] to make a tabset
    await tabWindowsTogether(wins[0], [wins[1]]);

    // Test that the windows are tabbed
    await assertTabbed(wins[0], wins[1], t);

    // Tearout the previously dropped window
    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.right - 50, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.right + 200, bounds1.top + 20);
    robot.mouseToggle('up');

    await delay(500);

    // Assert no groups
    await Promise.all([assertNotTabbed(wins[0], t), assertNotTabbed(wins[1], t)]);
});


test('Tearout tab dragged into singleton window - should create new tab group', async t => {
    // Tab 2 Windows Together
    await tabWindowsTogether(wins[1], [wins[0]]);

    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 500,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    // Mark win3 for close
    wins.push(win3);

    // Tearout tab & drag to valid drop region in win3
    const [bounds1, bounds2] = await Promise.all([getBounds(wins[0]), getBounds(win3)]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 15, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds2.left + 20, bounds2.top + 20);
    robot.mouseToggle('up');

    await delay(1000);

    // Assert win1 not tabbed, win2&3 are tabbed
    await Promise.all([assertNotTabbed(wins[0], t), assertTabbed(wins[1], win3, t)]);

    await delay(1000);
});


test('Tearout tab dragged into singleton window, invalid ragion - should not create new tab group', async t => {
    // Tab 2 Windows Together
    await tabWindowsTogether(wins[1], [wins[0]]);

    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 500,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    // Mark win3 for close
    wins.push(win3);

    // Tearout tab & drag to valid drop region in win3
    const [bounds1, bounds2] = await Promise.all([getBounds(wins[0]), getBounds(win3)]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 30, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds2.left + 20, bounds2.bottom - 20);
    robot.mouseToggle('up');

    await delay(500);

    // Assert win1 not tabbed, win2&3 are tabbed
    await Promise.all([assertNotTabbed(wins[0], t), assertNotTabbed(wins[1], t), assertNotTabbed(win3, t)]);
});



test('test Tearout tab dragged into tab group - should add tab to tabgroup', async t => {
    // Tab 2 Windows Together
    await tabWindowsTogether(wins[1], [wins[0]]);

    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 500,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    const win4 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 600,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    // Mark win3 , win4 for close
    wins.push(win3, win4);

    await tabWindowsTogether(win3, [win4]);
    // Tearout tab & drag to valid drop region in win3
    const [bounds1, bounds2] = await Promise.all([getBounds(wins[0]), getBounds(win3)]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 30, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds2.left + 20, bounds2.top - 20);
    robot.mouseToggle('up');

    await delay(500);

    // Assert win1 not tabbed, win2&3 are tabbed
    await Promise.all([assertNotTabbed(wins[0], t), assertTabbed(wins[1], win3, t)]);
});



test('Tearout tab dragged into tab group, invalid region - should not add tab to tabgroup', async t => {
    // Tab 2 Windows Together
    await tabWindowsTogether(wins[1], [wins[0]]);

    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 500,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    const win4 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 600,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    // Mark win3 , win4 for close
    wins.push(win3, win4);

    await tabWindowsTogether(win3, [win4]);
    // Tearout tab & drag to valid drop region in win3
    const [bounds1, bounds2] = await Promise.all([getBounds(wins[0]), getBounds(win3)]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 30, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds2.left + 20, bounds2.bottom - 20);
    robot.mouseToggle('up');

    await delay(500);

    // Assert win1 not tabbed, win2&3 are tabbed
    await Promise.all([assertNotTabbed(wins[0], t), assertNotTabbed(wins[1], t)]);
});


test('2 tab tabgroup, Tab closed - should destroy tabgroup', async t => {
    // Create tab group
    await tabWindowsTogether(wins[1], [wins[0]]);
    await assertTabbed(wins[0], wins[1], t);

    // Close a window
    await wins[0].close();
    await delay(500);

    // Assert no group
    await assertNotTabbed(wins[1], t);
});

test('2 tab tabgroup, Tab tearout - should destroy tabgroup', async t => {
    // Create tab group
    await tabWindowsTogether(wins[1], [wins[0]]);
    await assertTabbed(wins[0], wins[1], t);

    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 30, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.left, bounds1.bottom + 50);
    robot.mouseToggle('up');

    await delay(500);
    // Assert no group
    await Promise.all([assertNotTabbed(wins[1], t), assertNotTabbed(wins[0], t)]);
});

test('3 tab tabgroup, Tab closed - should retain tabgroup', async t => {
    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 500,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    // Create tab group of 3 windows
    await tabWindowsTogether(wins[1], [wins[0], win3]);

    await Promise.all([assertTabbed(wins[0], wins[1], t), assertTabbed(wins[0], win3, t)]);

    // Close 3rd window
    await win3.close();
    await delay(500);

    // Assert group remains
    await assertTabbed(wins[0], wins[1], t);
});

test('3 tab tabgroup, Tab tearout - should retain tabgroup', async t => {
    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 500,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    wins.push(win3);

    // Create tab group of 3 windows
    await tabWindowsTogether(wins[1], [wins[0], win3]);

    await Promise.all([assertTabbed(wins[0], wins[1], t), assertTabbed(wins[0], win3, t)]);

    // Tearout tab
    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 15, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.left, bounds1.bottom + 50);
    robot.mouseToggle('up');

    // Assert group remains
    await Promise.all([assertTabbed(win3, wins[0], t), assertNotTabbed(wins[1], t)]);
});

test('Tearout tab then retab - should create tabgroup', async t => {
    // Drag wins[0] over wins[1] to make a tabset
    await tabWindowsTogether(wins[0], [wins[1]]);

    // Test that the windows are tabbed
    await assertTabbed(wins[0], wins[1], t);

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

    await delay(500);

    // // Drag win3 over wins[1] to make a tabset
    await tabWindowsTogether(wins[0], [wins[1]]);

    // Assert group is formed again
    await assertTabbed(wins[1], wins[0], t);
});


test('Close tab then retab - should create tabgroup', async t => {
    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 500,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/App/default.html',
        frame: true
    });

    // Drag wins[0] over wins[1] to make a tabset
    await tabWindowsTogether(wins[0], [win3]);
    await delay(500);

    // Close tab
    await win3.close();

    await delay(500);

    await assertNotTabbed(wins[0], t);

    // Attempt to retab remaining windows
    await tabWindowsTogether(wins[0], [wins[1]]);

    await delay(500);

    // Assert group is formed again
    await assertTabbed(wins[1], wins[0], t);

    await delay(1000);
});


test('Tearout tab onto itself - should remain in tabgroup', async t => {
    // Create tab group
    await tabWindowsTogether(wins[1], [wins[0]]);
    await assertTabbed(wins[0], wins[1], t);

    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 15, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.left + 30, bounds1.top - 20);
    robot.mouseToggle('up');

    await delay(500);

    // Assert group remains
    await assertTabbed(wins[0], wins[1], t);

    await delay(1000);
});
