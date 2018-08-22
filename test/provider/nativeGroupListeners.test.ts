import { test, Context, GenericTestContext, AnyContext, TestContext } from 'ava';
import { dragWindowTo, dragWindowToOtherWindow, dragSideToSide } from './utils/dragWindowTo';
import { getBounds, NormalizedBounds } from './utils/getBounds';
import * as robot from 'robotjs';
import { createChildWindow } from './utils/createChildWindow';
import { Window, Fin } from 'hadouken-js-adapter';
import { getConnection } from './utils/connect';
import { undockWindow, WindowIdentity } from './utils/undockWindow';
import { executeJavascriptOnService } from '../demo/utils/executeJavascriptOnService';

let win1: Window, win2: Window;
let fin: Fin;

test.before(async () => {
    fin = await getConnection();
});
test.beforeEach(async () => {
    // Spawn two windows - win1 untabbed, win2 tabbed
    win1 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/demo/frameless-window.html', frame: false });
    win2 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/demo/frameless-window.html', frame: false });
    await delay(1);
});
test.afterEach.always(async () => {
    if (win1 && win1.identity) { await win1.close(); }
    if (win2 && win2.identity) { await win2.close(); }
    win1 = win2 = {} as Window;
});


/* ====== 1 ====== */
test('snap -> native ungroup win1 -> undock win1 >>> should not move ', async t => {

    // Snap the windows together
    await dragSideToSide(win2, 'left', win1, 'right');

    // Assert in snap group and native group
    await assertGrouped(win1, win2, t);

    // Native ungroup
    let boundsBefore = await getBounds(win1);
    await win1.leaveGroup();
    let boundsAfter = await getBounds(win1);

    // Assert did not move (smoke test for native grouping)
    await assertNotMoved(boundsBefore, boundsAfter, t);

    // Assert not in snap group or native group
    await assertNotGrouped(win1, t);
    await assertNotGrouped(win2, t);

    // Undock
    boundsBefore = await getBounds(win1);
    await undockWindow(win1.identity as WindowIdentity);
    boundsAfter = await getBounds(win1);

    // Assert window did not move 
    await assertNotMoved(boundsBefore, boundsAfter, t);

});

test('snap -> native ungroup win1 -> undock win2 >>> should not move ', async t => {

    // Snap the windows together
    await dragSideToSide(win2, 'left', win1, 'right');

    // Assert in snap group and native group
    await assertGrouped(win1, win2, t);

    // Native ungroup
    let boundsBefore = await getBounds(win1);
    await win1.leaveGroup();
    let boundsAfter = await getBounds(win1);

    // Assert did not move (smoke test for native grouping)
    await assertNotMoved(boundsBefore, boundsAfter, t);

    // Assert not in snap group or native group
    await assertNotGrouped(win1, t);
    await assertNotGrouped(win2, t);

    // Undock
    boundsBefore = await getBounds(win2);
    await undockWindow(win2.identity as WindowIdentity);
    boundsAfter = await getBounds(win2);

    // Assert window did not move 
    await assertNotMoved(boundsBefore, boundsAfter, t);

});

test('snap -> undock win1 -> native ungroup win1 >>> should move on undock', async t => {

    // Snap the windows together
    await dragSideToSide(win2, 'left', win1, 'right');

    // Assert in snap group and native group
    await assertGrouped(win1, win2, t);

    // Undock
    let boundsBefore = await getBounds(win1);
    await undockWindow(win1.identity as WindowIdentity);
    let boundsAfter = await getBounds(win1);

    // Assert moved
    await assertMoved(boundsBefore, boundsAfter, t);

    // Assert not in snap group or native group
    await assertNotGrouped(win1, t);
    await assertNotGrouped(win2, t);

    // Native ungroup
    boundsBefore = await getBounds(win1);
    await win1.leaveGroup();
    boundsAfter = await getBounds(win1);

    // Assert window did not move 
    await assertNotMoved(boundsBefore, boundsAfter, t);

});

test('snap -> undock win1 -> native ungroup win2 >>> should move on undock', async t => {

    // Snap the windows together
    await dragSideToSide(win2, 'left', win1, 'right');

    // Assert in snap group and native group
    await assertGrouped(win1, win2, t);

    // Undock
    let boundsBefore = await getBounds(win1);
    await undockWindow(win1.identity as WindowIdentity);
    let boundsAfter = await getBounds(win1);

    // Assert moved
    await assertMoved(boundsBefore, boundsAfter, t);
    
    // Assert not in snap group or native group
    await assertNotGrouped(win1, t);
    await assertNotGrouped(win2, t);

    // Native ungroup
    boundsBefore = await getBounds(win2);
    await win2.leaveGroup();
    boundsAfter = await getBounds(win2);

    // Assert window did not move 
    await assertNotMoved(boundsBefore, boundsAfter, t);


});

test('native group -> native ungroup win1 -> undock win1 >> should not move ', async t => {

    // Native group the windows
    win1.joinGroup(win2);

    // Assert in snap group and native group
    await assertGrouped(win1, win2, t);

    // Native ungroup
    let boundsBefore = await getBounds(win1);
    await win1.leaveGroup();
    let boundsAfter = await getBounds(win1);

    // Assert did not move (smoke test for native grouping)
    await assertNotMoved(boundsBefore, boundsAfter, t);

    // Assert not in snap group or native group
    await assertNotGrouped(win1, t);
    await assertNotGrouped(win2, t);

    // Undock
    boundsBefore = await getBounds(win1);
    await undockWindow(win1.identity as WindowIdentity);
    boundsAfter = await getBounds(win1);

    // Assert window did not move 
    await assertNotMoved(boundsBefore, boundsAfter, t);


});

test('native group -> native ungroup win1 -> undock win2 >> should not move ', async t => {

    // Native group the windows
    win1.joinGroup(win2);

    // Assert in snap group and native group
    await assertGrouped(win1, win2, t);

    // Native ungroup
    let boundsBefore = await getBounds(win1);
    await win1.leaveGroup();
    let boundsAfter = await getBounds(win1);

    // Assert did not move (smoke test for native grouping)
    await assertNotMoved(boundsBefore, boundsAfter, t);

    // Assert not in snap group or native group
    await assertNotGrouped(win1, t);
    await assertNotGrouped(win2, t);

    // Undock
    boundsBefore = await getBounds(win2);
    await undockWindow(win2.identity as WindowIdentity);
    boundsAfter = await getBounds(win2);

    // Assert window did not move 
    await assertNotMoved(boundsBefore, boundsAfter, t);


});

test('native group -> undock win1 -> native ungroup win1 >>> should move on undock ', async t => {

    // Native group the windows
    win1.joinGroup(win2);

    // Assert in snap group and native group
    await assertGrouped(win1, win2, t);

    // Undock
    let boundsBefore = await getBounds(win1);
    await undockWindow(win1.identity as WindowIdentity);
    let boundsAfter = await getBounds(win1);

    // Assert moved
    await assertMoved(boundsBefore, boundsAfter, t);
    
    // Assert not in snap group or native group
    await assertNotGrouped(win1, t);
    await assertNotGrouped(win2, t);

    // Native ungroup
    boundsBefore = await getBounds(win1);
    await win1.leaveGroup();
    boundsAfter = await getBounds(win1);

    // Assert window did not move 
    await assertNotMoved(boundsBefore, boundsAfter, t);

});

test('native group -> undock win1 -> native ungroup win1 >>> should move on undock ', async t => {

    // Native group the windows
    win1.joinGroup(win2);

    // Assert in snap group and native group
    await assertGrouped(win1, win2, t);

    // Undock
    let boundsBefore = await getBounds(win1);
    await undockWindow(win1.identity as WindowIdentity);
    let boundsAfter = await getBounds(win1);

    // Assert moved
    await assertMoved(boundsBefore, boundsAfter, t);
    
    // Assert not in snap group or native group
    await assertNotGrouped(win1, t);
    await assertNotGrouped(win2, t);

    // Native ungroup
    boundsBefore = await getBounds(win2);
    await win2.leaveGroup();
    boundsAfter = await getBounds(win2);

    // Assert window did not move 
    await assertNotMoved(boundsBefore, boundsAfter, t);

});

test.failing('native group merge -> undock win1 -> native ungroup win1 >>> should move on undock ', async t => {
// Runtime issue: native group merge does not raise an event when grouping two ungrouped windows

    // Native group the windows
    win1.mergeGroups(win2);

    // Assert in snap group and native group
    await assertGrouped(win1, win2, t);

    // Undock
    let boundsBefore = await getBounds(win1);
    await undockWindow(win1.identity as WindowIdentity);
    let boundsAfter = await getBounds(win1);

    // Assert moved
    await assertMoved(boundsBefore, boundsAfter, t);
   
    // Assert not in snap group or native group
    await assertNotGrouped(win1, t);
    await assertNotGrouped(win2, t);

    // Native ungroup
    boundsBefore = await getBounds(win1);
    await win1.leaveGroup();
    boundsAfter = await getBounds(win1);

    // Assert window did not move 
    await assertNotMoved(boundsBefore, boundsAfter, t);

});

/* ====== Utils ====== */

async function assertGrouped(win1: Window, win2: Window, t: TestContext) {
    // Both windows are in the same native openfin group
    const [group1, group2] = [await win1.getGroup(), await win2.getGroup()];
    for (let i = 0; i < group1.length; i++) {
        t.deepEqual(group1[i].identity, group2[i].identity, 'Window native groups are different');
    }
    
    // Both windows are in the same SnapGroup
    const [snapGroup1, snapGroup2] = [await getSnapGroup(win1), await getSnapGroup(win2)];
    t.deepEqual(snapGroup1, snapGroup2);
}

async function assertNotGrouped(win: Window, t: TestContext) {
    // Window is not native grouped
    const group = await win.getGroup();
    t.is(group.length, 0);

    // Window is alone in it's SnapGroup
    const snapGroup = await getSnapGroup(win);
    t.is(snapGroup.length, 1);
}

async function assertMoved(bounds1:NormalizedBounds, bounds2:NormalizedBounds, t: TestContext) {
    t.notDeepEqual(bounds1, bounds2);
}

async function assertNotMoved(bounds1:NormalizedBounds, bounds2:NormalizedBounds, t: TestContext) {
    t.deepEqual(bounds1, bounds2);
}

// Should replace this 'any' once types can be imported seperately to implementation
async function getSnapGroup(win: Window): Promise<any[]> {
    return JSON.parse(await executeJavascriptOnService(`
    snapService.getSnapWindow({
        uuid: "${win.identity.uuid}", 
        name: "${win.identity.name}"
    }).group.windows.map(w => w.identity)
    `));
}

async function delay(seconds: number) {
    return new Promise<void>(r => setTimeout(r, seconds * 1000));
}