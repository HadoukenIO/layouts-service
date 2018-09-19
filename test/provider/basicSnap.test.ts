import {test} from 'ava';
import {Application, Fin, Window} from 'hadouken-js-adapter';
import * as robot from 'robotjs';

import {getConnection} from './utils/connect';
import {dragWindowTo} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';
import {Win} from './utils/getWindow';
import {resizeWindowToSize} from './utils/resizeWindowToSize';

let win1: Window, win2: Window, fin: Fin, app1: Application, app2: Application;

let appIdCount = 0;

test.before(async () => {
    fin = await getConnection();
});
test.beforeEach(async () => {
    const getAppName = () => 'test-app-' + appIdCount++;
    const app1Name = getAppName();
    const app2Name = getAppName();
    app1 = await fin.Application.create({
        uuid: app1Name,
        name: app1Name,
        mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200}
    });
    app2 = await fin.Application.create({
        uuid: app2Name,
        name: app2Name,
        mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200}
    });

    await app1.run();
    await app2.run();

    win1 = await fin.Window.wrap({uuid: app1.identity.uuid, name: app1.identity.uuid});
    win2 = await fin.Window.wrap({uuid: app2.identity.uuid, name: app2.identity.uuid});
});

test.afterEach.always(async () => {
    await app1.close();
    await app2.close();
});

test('bottom', async t => {
    const win2Bounds = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.left + 5, win2Bounds.bottom + 2);
    await dragWindowTo(win2, 500, 500);

    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    t.is(bounds1.left, bounds2.left);
    t.is(bounds1.top, bounds2.bottom);
});

test('top', async t => {
    const win2Bounds = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.left + 50, win2Bounds.top - (win2Bounds.bottom - win2Bounds.top + 2));
    await dragWindowTo(win2, 500, 500);

    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    t.is(bounds1.left, bounds2.left);
    t.is(bounds1.bottom, bounds2.top);
});

test('left', async t => {
    const win2Bounds = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.left - (win2Bounds.right - win2Bounds.left) - 2, win2Bounds.top + 40);
    await new Promise(r => setTimeout(r, 4000));
    await dragWindowTo(win2, 500, 500);

    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    t.is(bounds1.top, bounds2.top);
    t.is(bounds1.right, bounds2.left);
});

test('right', async t => {
    const win2Bounds = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.right + 2, win2Bounds.top + 40);
    await dragWindowTo(win2, 500, 500);

    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    t.is(bounds1.top, bounds2.top);
    t.is(bounds1.left, bounds2.right);
});

test('resizing group horizontally', async t => {
    let bounds1 = await getBounds(win1);
    let bounds2 = await getBounds(win2);

    await dragWindowTo(win1, bounds2.right + 2, bounds2.top);
    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);
    const combinedWidth = bounds1.right - bounds2.left;

    robot.moveMouseSmooth(bounds2.right - 1, (bounds2.top + bounds2.bottom) / 2);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(bounds2.right - 1 + 40, (bounds2.top + bounds2.bottom) / 2);
    robot.mouseToggle('up');

    // recalculate bounds & combined width
    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);
    const newCombinedWidth = bounds1.right - bounds2.left;

    t.is(combinedWidth, newCombinedWidth);
});

test('resizing group vertically', async t => {
    let bounds1 = await getBounds(win1);
    let bounds2 = await getBounds(win2);

    await dragWindowTo(win1, bounds2.left, bounds2.bottom);
    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);
    const combinedHeight = bounds1.bottom - bounds2.top;

    robot.moveMouseSmooth((bounds2.left + bounds2.right) / 2, bounds2.bottom);
    robot.mouseToggle('down');

    robot.moveMouseSmooth((bounds2.left + bounds2.right) / 2, bounds2.bottom + 50);
    robot.mouseToggle('up');

    // recalculate bounds & combined width
    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);
    const newCombinedHeight = bounds1.bottom - bounds2.top;

    t.is(combinedHeight, newCombinedHeight);
});

test('resize on snap, small to big', async t => {
    const bigHeight = 300;
    await resizeWindowToSize(win1, 200, 200);
    await resizeWindowToSize(win2, 300, bigHeight);
    let bounds1 = await getBounds(win1);
    let bounds2 = await getBounds(win2);
    await dragWindowTo(win1, bounds2.right + 1, bounds2.top + 5);
    await new Promise(r => setTimeout(r, 2000));

    // update bounds
    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);

    const newHeight = bounds1.bottom - bounds1.top;
    t.is(newHeight, bounds2.bottom - bounds2.top);
});

test('resize on snap, big to small', async t => {
    const smallHeight = 200;
    await resizeWindowToSize(win1, 300, 300);
    await resizeWindowToSize(win2, smallHeight, smallHeight);
    let bounds1 = await getBounds(win1);
    let bounds2 = await getBounds(win2);
    await dragWindowTo(win1, bounds2.right + 1, bounds2.top - 50);

    // update bounds
    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);

    const newHeight = bounds1.bottom - bounds1.top;
    t.is(newHeight, bounds2.bottom - bounds2.top);
});

// throws 'Error: Application with specified UUID already exists: a0' rejection
test.failing('should allow reregistration of a previously used identity', async t => {
    const fin = await getConnection();
    // intentionally hardcoding previosuly used uuid
    const app1 = await fin.Application.create({
        uuid: 'test-app-0',
        name: 'test-app-0',
        mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200}
    });
    await app1.run();

    // intentionally hardcoding previosuly used uuid
    const app2 = await fin.Application.create({
        uuid: 'test-app-1',
        name: 'test-app-1',
        mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200}
    });
    await app2.run();


    const win1 = await fin.Window.wrap({uuid: 'test-app-0', name: 'test-app-0'});
    const win2 = await fin.Window.wrap({uuid: 'test-app-1', name: 'test-app-1'});
    const win2Bounds = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.left + 50, win2Bounds.bottom + 2);
    await dragWindowTo(win2, 500, 500);

    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);
    await app1.close();
    await app2.close();
    t.is(bounds1.left, bounds2.left);
    t.is(bounds1.top, bounds2.bottom);
});