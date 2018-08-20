import { test, Context, GenericTestContext, AnyContext } from 'ava';
import { dragWindowTo, dragWindowToOtherWindow } from './utils/dragWindowTo';
import { getBounds } from './utils/getBounds';
import * as robot from 'robotjs';
import { createChildWindow } from './utils/createChildWindow';
import { Window, Fin } from 'hadouken-js-adapter';
import { getConnection } from './utils/connect';

let win1: Window, win2: Window;
let fin: Fin;

test.before(async () => {
    fin = await getConnection();
});
test.beforeEach(async () => {
    // Spawn two windows - win1 untabbed, win2 tabbed
    win1 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/demo/frameless-window.html', frame: false });
    win2 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/demo/tabbing/App/default.html', frame: true });
    await delay(1);
});
test.afterEach.always(async () => {
    await win1.close();
    await win2.close();
});

test('Tabset on dragover - basic drop', async t => {

    // Drag win1 over win2 to make a tabset
    await dragWindowToOtherWindow(win1,'top-left', win2, 'top-left', {x:-20, y:-20});

    // Test that the windows are tabbed
    await assertTabbed(win1, win2, t);
});

test('Tabset on dragover - tearout dropped window', async t => {

    // Drag win1 over win2 to make a tabset
    await dragWindowToOtherWindow(win1,'top-left', win2, 'top-left', {x:-20, y:-20});
    await delay(0.5);

    // Test that the windows are tabbed
    await assertTabbed(win1, win2, t);

    await delay(3);

    // Tearout the previously dropped window
    const bounds1= await getBounds(win1);
     robot.mouseToggle('up');
     robot.moveMouseSmooth(bounds1.right - 50 ,bounds1.top -20);
     robot.mouseToggle('down');
     robot.moveMouseSmooth(bounds1.right + 200, bounds1.top + 20);
     robot.mouseToggle('up');

    await delay(1);

    await Promise.all([assertAloneInTab(win1, t), assertAloneInTab(win2, t)]);

});

test.only('Tabset on dragover - drop on torn-out dropped window', async t => {

    // Drag win1 over win2 to make a tabset
    await dragWindowToOtherWindow(win1,'top-left', win2, 'top-left', {x:-20, y:-20});
    await delay(0.5);

    // Test that the windows are tabbed
    await assertTabbed(win1, win2, t);

    await delay(3);

    // Tearout the previously dropped window
    const bounds1= await getBounds(win1);
     robot.mouseToggle('up');
     robot.moveMouseSmooth(bounds1.right - 50 ,bounds1.top -20);
     robot.mouseToggle('down');
     robot.moveMouseSmooth(bounds1.right + 200, bounds1.top + 20);
     robot.mouseToggle('up');

    await delay(1);

    // Check that the two windows are now in seperate tabgroups
    await Promise.all([assertAloneInTab(win1, t), assertAloneInTab(win2, t)]);

    // Spawn a third window
    const win3 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/demo/frameless-window.html', frame: false });

    // Drag win3 over win2 to make a tabset
    await dragWindowToOtherWindow(win3,'top-left', win2, 'top-left', {x:-20, y:-20});
    await delay(0.5);

    await assertTabbed(win3, win2, t);

});

/**
 * Asserts that two windows are succesfully tabbed together
 * @param t Ava test context against which to assert
 */
async function assertTabbed(win1: Window, win2: Window, t:GenericTestContext<AnyContext>):Promise<void> {
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

async function assertAloneInTab(win: Window, t: GenericTestContext<AnyContext>):Promise<void> {
    // TODO: Determine if the window is tabbed on the service side.

    // Window is native grouped only to the tabstrip
    const nativeGroup = await win.getGroup();
    const otherGroupedWindows = nativeGroup.filter(w => w.identity.name !== win.identity.name || w.identity.uuid !== win.identity.uuid);

    // Only one other window in group
    t.is(otherGroupedWindows.length, 1);
    // Window's name is in the correct format for our auto-generated tabstrips
    t.regex(otherGroupedWindows[0].identity.name as string, /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/);

}

async function delay(seconds: number) {
    return new Promise<void>(r => setTimeout(r, seconds * 1000));
}