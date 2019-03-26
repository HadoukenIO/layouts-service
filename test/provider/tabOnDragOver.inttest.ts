import {Identity, Window} from 'hadouken-js-adapter';
import * as assert from 'power-assert';
import * as robot from 'robotjs';

import {WindowIdentity} from '../../src/provider/model/DesktopWindow';
import {executeJavascriptOnService} from '../demo/utils/serviceUtils';
import {getTabstrip} from '../demo/utils/tabServiceUtils';
import {tearoutTab} from '../demo/utils/tabstripUtils';
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

it('When dragging a window over a window, tabgroup is created', async () => {
    // Drag wins[0] over wins[1] to make a tabset (in valid drop region)
    await tabWindowsTogether(wins[0], wins[1]);

    // Test that the windows are tabbed
    await assertPairTabbed(wins[0], wins[1]);
});

it('When dragging a window over a window, window title is displayed in tabstrip', async () => {
    await tabWindowsTogether(wins[0], wins[1]);
    await assertPairTabbed(wins[0], wins[1]);

    const tabTitles = await Promise.all(wins.map(w => getTabTitle(w.identity)));

    // First window programmatically sets document.title
    assert.strictEqual(tabTitles[0], 'Window 1');

    // Second window doesn't set a title, tab title should default to window name
    assert.strictEqual(tabTitles[1], 'tab-window-2');
});

it('When dragging a window over a window\'s invalid region, tabgroup is not created', async () => {
    // Fail creating group using invalid drop region
    await dragWindowToOtherWindow(wins[0], 'top-left', wins[1], 'top-left', {x: 20, y: 100});

    // Assert a group did not form
    await assertNotTabbed(wins[0]);
});

it('When dragging a window into a tabgroup, 3 tab tabgroup is created', async () => {
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
    await assertPairTabbed(wins[0], win3);
});

it('When dragging a window over a tabgroups\'s invalid region, tabgroup is not created', async () => {
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
    await assertNotTabbed(win3);
});

it('When tearing out tab, 2 singleton windows are created', async () => {
    // Drag wins[0] over wins[1] to make a tabset
    await tabWindowsTogether(wins[0], wins[1]);

    // Test that the windows are tabbed
    await assertPairTabbed(wins[0], wins[1]);

    // Tearout the previously dropped window
    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.right - 50, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.right + 200, bounds1.top + 20);
    robot.mouseToggle('up');

    await delay(500);

    // Assert no groups
    await assertNotTabbed(wins[0]);
    await assertNotTabbed(wins[1]);
});


it('When tearout tab dragged into singleton window, new tab group is created', async () => {
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
    await Promise.all([assertNotTabbed(wins[0]), assertPairTabbed(wins[1], win3)]);

    await delay(1000);
});


it('When tearout tab dragged into singleton window\'s, invalid ragion, new tab group is created', async () => {
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
    await Promise.all([assertNotTabbed(wins[0]), assertNotTabbed(wins[1]), assertNotTabbed(win3)]);
});



it('When tearout tab dragged into tab group, tab is added to tabgroup', async () => {
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



it('When tearout tab dragged into tab group\'s invalid region, tab is not added to tabgroup', async () => {
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


it('When tab is closed in two-tab tabgroup, tabgroup is destroyed', async () => {
    // Create tab group
    await tabWindowsTogether(wins[1], wins[0]);
    await assertPairTabbed(wins[0], wins[1]);

    // Close a window
    await wins[0].close();
    await delay(500);

    // Assert no group
    await assertNotTabbed(wins[1]);
});

it('When tab is torn-out in two-tab tabgroup, tabgroup is destroyed', async () => {
    // Create tab group
    await tabWindowsTogether(wins[1], wins[0]);
    await assertPairTabbed(wins[0], wins[1]);

    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 30, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.left, bounds1.bottom + 50);
    robot.mouseToggle('up');

    await delay(500);
    // Assert no group
    await Promise.all([assertNotTabbed(wins[1]), assertNotTabbed(wins[0])]);
});

it('When tab is closed in three-tab tabgroup, tabgroup is retained', async () => {
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

    await Promise.all([assertPairTabbed(wins[0], wins[1]), assertPairTabbed(wins[0], win3)]);

    // Close 3rd window
    await win3.close();
    await delay(500);

    // Assert group remains
    await assertPairTabbed(wins[0], wins[1]);
});

it('When tab is torn-out in three-tab tabgroup, tabgroup is retained', async () => {
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

    await Promise.all([assertPairTabbed(wins[0], wins[1]), assertPairTabbed(wins[0], win3)]);

    // Tearout tab
    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 15, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.left, bounds1.bottom + 50);
    robot.mouseToggle('up');

    // Assert group remains
    await Promise.all([assertPairTabbed(win3, wins[0]), assertNotTabbed(wins[1])]);
});

it('When tab is torn-out then retabbed, tabgroup is created', async () => {
    // Drag wins[0] over wins[1] to make a tabset
    await tabWindowsTogether(wins[0], wins[1]);

    // Test that the windows are tabbed
    await assertPairTabbed(wins[0], wins[1]);

    // Tearout the previously dropped window
    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.right - 50, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.right + 200, bounds1.top + 20);
    robot.mouseToggle('up');

    await delay(500);

    // Check that the two windows are now in seperate tabgroups
    await Promise.all([assertNotTabbed(wins[0]), assertNotTabbed(wins[1])]);

    await delay(500);

    // // Drag win3 over wins[1] to make a tabset
    await tabWindowsTogether(wins[0], wins[1]);

    // Assert group is formed again
    await assertPairTabbed(wins[1], wins[0]);
});


it('When tab is closed in two-tab tabgroup, then a window is dragged over, tabgroup is created', async () => {
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

    // Drag wins[0] over wins[3] to make a tabset
    await tabWindowsTogether(wins[0], win3);
    await delay(500);

    // Close tab
    await win3.close();

    await delay(500);

    await assertNotTabbed(wins[0]);

    // Attempt to retab remaining windows
    await tabWindowsTogether(wins[0], wins[1]);

    await delay(500);

    // Assert group is formed again
    await assertPairTabbed(wins[1], wins[0]);

    await delay(1000);
});


it('When tab is torn-out then dragged over tabgroup, tabgroup is retained', async () => {
    // Create tab group
    await tabWindowsTogether(wins[1], wins[0]);
    await assertPairTabbed(wins[0], wins[1]);

    const bounds1 = await getBounds(wins[0]);
    robot.mouseToggle('up');
    robot.moveMouseSmooth(bounds1.left + 15, bounds1.top - 20);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds1.left + 30, bounds1.top - 20);
    robot.mouseToggle('up');

    await delay(500);

    // Assert group remains
    await assertPairTabbed(wins[0], wins[1]);

    await delay(1000);
});

it('When window is dragged into tabgroup then torn-out, window is maximizable if-and-only-if not in tabgroup', async () => {
    // Check that we can maximize windows
    await wins[0].maximize();
    await wins[1].maximize();

    await assertAllMaximized(wins);

    await wins[0].restore();
    await wins[1].restore();

    // Create a tab group, and check we can no longer maximize windows
    await tabWindowsTogether(wins[0], wins[1]);

    await wins[0].maximize();
    await wins[1].maximize();

    await assertAllNormalState(wins);

    // Tearout tab. and check that we can maximize windows again
    await tearoutTab(await getTabstrip(wins[0].identity), 0);

    await wins[0].maximize();
    await wins[1].maximize();

    await assertAllMaximized(wins);
});

it('When window is dragged on top obscured window, window is not tabbed', async () => {
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
    await Promise.all(wins.map(win => assertNotTabbed(win)));
});

it('When window is dragged on top window obscured by deregistered window, window is not tabbed', async () => {
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
    await Promise.all(wins.map(win => assertNotTabbed(win)));
});