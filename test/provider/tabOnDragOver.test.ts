import {Identity, Window} from 'hadouken-js-adapter';
import * as robot from 'robotjs';

import {WindowIdentity} from '../../src/provider/model/DesktopWindow';
import {promiseForEach} from '../../src/provider/snapanddock/utils/async';
import {executeJavascriptOnService} from '../demo/utils/serviceUtils';
import {teardown} from '../teardown';

import {assertAllMaximized, assertAllNormalState, assertNotTabbed, assertPairTabbed} from './utils/assertions';
import {createChildWindow} from './utils/createChildWindow';
import {delay} from './utils/delay';
import {dragWindowTo, dragWindowToOtherWindow} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';
import {tabWindowsTogether} from './utils/tabWindowsTogether';

/**
 * Fetches the tab title of a window. Will fetch the text from the DOM element within the tabstrip window.
 *
 * Assumes that `identity` is a tabbed window.
 *
 * @param identity Tabbed window
 */
async function getTabTitle(identity: Identity) {
    return executeJavascriptOnService(function(this: ProviderWindow, tabIdentity: WindowIdentity) {
        return new Promise((resolve, reject) => {
            const tab = this.model.getWindow(tabIdentity)!;
            const tabGroup = tab.tabGroup!;
            const tabIndex = tabGroup.tabs.findIndex(t => t.id === tab.id);
            const tabstripIdentity = tabGroup.identity;

            const tabstrip = fin.desktop.Window.wrap(tabstripIdentity.uuid, tabstripIdentity.name!);
            tabstrip.executeJavaScript(
                `document.getElementsByClassName("tab")[${tabIndex}].getElementsByClassName("tab-content")[0].innerText`, resolve, reject);
        });
    }, identity as WindowIdentity);
}


jest.setTimeout(30 * 1000);

interface JestInterface {
    retryTimes: Function;
}
(jest as unknown as JestInterface).retryTimes(5);



let wins: Window[] = [];

beforeEach(async () => {
    // Spawn two windows - wins[0] unframed, wins[1] framed.  Any additional windows needed should be created in the test.
    wins[0] = await createChildWindow({
        name: 'tab-window-1',
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
        name: 'tab-window-2',
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
    for (const win of wins) {
        await win.close().catch(e => {
            console.warn(`error closing window ${win.identity.name}`);
        });
    }

    wins = [];
    await delay(500);
    await teardown();
});

/*
test('Drag window over window - should create tabgroup', async t => {
    // Drag wins[0] over wins[1] to make a tabset (in valid drop region)
    await tabWindowsTogether(wins[0], wins[1]);

    // Test that the windows are tabbed
    await assertPairTabbed(wins[0], wins[1], t);
});

test('Drag window over window - window title is displayed in tabstrip', async t => {
    await tabWindowsTogether(wins[0], wins[1]);
    await assertPairTabbed(wins[0], wins[1], t);

    const tabTitles = await Promise.all(wins.map(w => getTabTitle(w.identity)));

    // First window programmatically sets document.title
    t.is(tabTitles[0], 'Window 1');

    // Second window doesn't set a title, tab title should default to window name
    t.is(tabTitles[1], 'tab-window-2');
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
        url: 'http://localhost:1337/demo/tabbing/default.html',
        frame: true
    });

    // Mark win3 for closure
    wins.push(win3);

    // Tab 3 windows together
    await tabWindowsTogether(wins[0], wins[1]);
    await tabWindowsTogether(wins[0], win3);

    // Assert tab group formed
    await assertPairTabbed(wins[0], win3, t);
});

test('Drag window into tabgroup, invalid region - should not create 3 tab tabgroup', async t => {
    // Tab 2 Windows Together
    await tabWindowsTogether(wins[1], wins[0]);

    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 50,
        defaultLeft: 50,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/default.html',
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
    await tabWindowsTogether(wins[0], wins[1]);

    // Test that the windows are tabbed
    await assertPairTabbed(wins[0], wins[1], t);

    // Tearout the previously dropped window
    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.right - 50, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.right + 200, bounds1.top + 20);
    robot.mouseToggle('up');

    await delay(500);

    // Assert no groups
    await assertNotTabbed(wins[0], t);
    await assertNotTabbed(wins[1], t);
});


test('Tearout tab dragged into singleton window - should create new tab group', async t => {
    // Tab 2 Windows Together
    await tabWindowsTogether(wins[1], wins[0]);

    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 500,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/default.html',
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
    await Promise.all([assertNotTabbed(wins[0], t), assertPairTabbed(wins[1], win3, t)]);

    await delay(1000);
});


test('Tearout tab dragged into singleton window, invalid ragion - should not create new tab group', async t => {
    // Tab 2 Windows Together
    await tabWindowsTogether(wins[1], wins[0]);

    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 500,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/default.html',
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
*/

const test1Runs = new Set<number>();
const test2Runs = new Set<number>();

for (let i = 0; i < 50; i++) {
    const count = i;

    test('test Tearout tab dragged into tab group - should add tab to tabgroup', async () => {
        if (!test1Runs.has(count)) {
            test1Runs.add(count);
            console.log(`*** Running ${count} test Tearout tab dragged into tab group - should add tab to tabgroup`);
        } else {
            console.log(`*** Retrying ${count} test Tearout tab dragged into tab group - should add tab to tabgroup`);
        }

        // Tab 2 Windows Together
        await tabWindowsTogether(wins[1], wins[0]);

        const win3 = await createChildWindow({
            autoShow: true,
            saveWindowState: false,
            defaultTop: 500,
            defaultLeft: 500,
            defaultHeight: 200,
            defaultWidth: 200,
            url: 'http://localhost:1337/demo/tabbing/default.html',
            frame: true
        });

        const win4 = await createChildWindow({
            autoShow: true,
            saveWindowState: false,
            defaultTop: 500,
            defaultLeft: 600,
            defaultHeight: 200,
            defaultWidth: 200,
            url: 'http://localhost:1337/demo/tabbing/default.html',
            frame: true
        });

        // Mark win3 , win4 for close
        wins.push(win3, win4);

        await tabWindowsTogether(win3, win4);
        // Tearout tab & drag to valid drop region in win3
        const [bounds1, bounds2] = await Promise.all([getBounds(wins[0]), getBounds(win3)]);
        robot.mouseToggle('up');
        robot.moveMouseSmooth(bounds1.left + 30, bounds1.top - 20);
        robot.mouseToggle('down');
        robot.moveMouseSmooth(bounds2.left + 20, bounds2.top - 20);
        robot.mouseToggle('up');

        await delay(500);

        // Assert win1 not tabbed, win2&3 are tabbed
        await Promise.all([assertNotTabbed(wins[0]), assertPairTabbed(wins[1], win3)]);
    });

    test('Tearout tab dragged into tab group, invalid region - should not add tab to tabgroup', async () => {
        if (!test2Runs.has(count)) {
            test2Runs.add(count);
            console.log(`*** Running ${count} Tearout tab dragged into tab group, invalid region - should not add tab to tabgroup`);
        } else {
            console.log(`*** Retrying ${count} Tearout tab dragged into tab group, invalid region - should not add tab to tabgroup`);
        }


        // Tab 2 Windows Together
        await tabWindowsTogether(wins[1], wins[0]);

        const win3 = await createChildWindow({
            autoShow: true,
            saveWindowState: false,
            defaultTop: 80,
            defaultLeft: 200,
            defaultHeight: 200,
            defaultWidth: 200,
            url: 'http://localhost:1337/demo/tabbing/default.html',
            frame: true
        });

        const win4 = await createChildWindow({
            autoShow: true,
            saveWindowState: false,
            defaultTop: 500,
            defaultLeft: 600,
            defaultHeight: 200,
            defaultWidth: 200,
            url: 'http://localhost:1337/demo/tabbing/default.html',
            frame: true
        });

        // Mark win3 , win4 for close
        wins.push(win3, win4);

        await tabWindowsTogether(win3, win4);
        // Tearout tab & drag to valid drop region in win3
        const [bounds1, bounds2] = await Promise.all([getBounds(wins[0]), getBounds(win3)]);
        robot.mouseToggle('up');
        robot.moveMouseSmooth(bounds1.left + 30, bounds1.top - 20);
        robot.mouseToggle('down');
        robot.moveMouseSmooth(bounds2.left + 20, bounds2.bottom - 20);
        robot.mouseToggle('up');

        await delay(500);

        // Assert win1 not tabbed, win2&3 are tabbed
        await Promise.all([assertNotTabbed(wins[0]), assertNotTabbed(wins[1])]);
    });
}
/*

test('2 tab tabgroup, Tab closed - should destroy tabgroup', async t => {
    // Create tab group
    await tabWindowsTogether(wins[1], wins[0]);
    await assertPairTabbed(wins[0], wins[1], t);

    // Close a window
    await wins[0].close();
    await delay(500);

    // Assert no group
    await assertNotTabbed(wins[1], t);
});

test('2 tab tabgroup, Tab tearout - should destroy tabgroup', async t => {
    // Create tab group
    await tabWindowsTogether(wins[1], wins[0]);
    await assertPairTabbed(wins[0], wins[1], t);

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
        defaultTop: 600,
        defaultLeft: 600,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/default.html',
        frame: true
    });

    // Create tab group of 3 windows
    await tabWindowsTogether(wins[1], wins[0]);
    await tabWindowsTogether(wins[1], win3);

    await Promise.all([assertPairTabbed(wins[0], wins[1], t), assertPairTabbed(wins[0], win3, t)]);

    // Close 3rd window
    await win3.close();
    await delay(500);

    // Assert group remains
    await assertPairTabbed(wins[0], wins[1], t);
});

test('3 tab tabgroup, Tab tearout - should retain tabgroup', async t => {
    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 600,
        defaultLeft: 600,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/default.html',
        frame: true
    });

    wins.push(win3);

    // Create tab group of 3 windows
    await tabWindowsTogether(wins[1], wins[0]);
    await tabWindowsTogether(wins[1], win3);

    await Promise.all([assertPairTabbed(wins[0], wins[1], t), assertPairTabbed(wins[0], win3, t)]);

    // Tearout tab
    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 15, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.left, bounds1.bottom + 50);
    robot.mouseToggle('up');

    // Assert group remains
    await Promise.all([assertPairTabbed(win3, wins[0], t), assertNotTabbed(wins[1], t)]);
});

test('Tearout tab then retab - should create tabgroup', async t => {
    // Drag wins[0] over wins[1] to make a tabset
    await tabWindowsTogether(wins[0], wins[1]);

    // Test that the windows are tabbed
    await assertPairTabbed(wins[0], wins[1], t);

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
    await tabWindowsTogether(wins[0], wins[1]);

    // Assert group is formed again
    await assertPairTabbed(wins[1], wins[0], t);
});


test('Close tab then retab - should create tabgroup', async t => {
    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 500,
        defaultLeft: 500,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/default.html',
        frame: true
    });

    // Drag wins[0] over wins[1] to make a tabset
    await tabWindowsTogether(wins[0], win3);
    await delay(500);

    // Close tab
    await win3.close();

    await delay(500);

    await assertNotTabbed(wins[0], t);

    // Attempt to retab remaining windows
    await tabWindowsTogether(wins[0], wins[1]);

    await delay(500);

    // Assert group is formed again
    await assertPairTabbed(wins[1], wins[0], t);

    await delay(1000);
});


test('Tearout tab onto itself - should remain in tabgroup', async t => {
    // Create tab group
    await tabWindowsTogether(wins[1], wins[0]);
    await assertPairTabbed(wins[0], wins[1], t);

    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 15, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.left + 30, bounds1.top - 20);
    robot.mouseToggle('up');

    await delay(500);

    // Assert group remains
    await assertPairTabbed(wins[0], wins[1], t);

    await delay(1000);
});

test('Drag window into tabgroup then tearout - window should be maximizable if-and-only-if not in tabgroup', async t => {
    // Check that we can maximize windows
    wins[0].maximize();
    wins[1].maximize();

    assertAllMaximized(t, wins);

    wins[0].restore();
    wins[1].restore();

    // Create a tab group, and check we can no longer maximize windows
    await tabWindowsTogether(wins[0], wins[1]);

    wins[0].maximize();
    wins[1].maximize();

    assertAllNormalState(t, wins);

    // Tearout tab. and check that we can maximize windows again
    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 15, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.left + 30, bounds1.top - 20);
    robot.mouseToggle('up');

    await delay(500);

    wins[0].maximize();
    wins[1].maximize();

    assertAllMaximized(t, wins);
});

test('Cannot tab to an obscured window', async t => {
    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 20,
        defaultLeft: 200,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/tabbing/default.html',
        frame: true
    });
    wins.push(win3);

    await delay(500);
    await dragWindowTo(wins[1], 250, 120);
    await delay(500);
    await Promise.all(wins.map(win => assertNotTabbed(win, t)));
});

test('Cannot tab to a window that is obscured by a window not registered to the service', async t => {
    const win3 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 20,
        defaultLeft: 200,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/test/popup-deregistered.html',
        frame: true
    });
    wins.push(win3);

    await delay(500);
    await dragWindowTo(wins[1], 250, 120);
    await delay(500);
    await Promise.all(wins.map(win => assertNotTabbed(win, t)));
});

*/