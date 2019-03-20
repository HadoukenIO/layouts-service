import {Fin, Window} from 'hadouken-js-adapter';
import * as assert from 'power-assert';
import * as robot from 'robotjs';

import {teardown} from '../teardown';

import {getConnection} from './utils/connect';
import {createChildWindow} from './utils/createChildWindow';
import {dragWindowAndHover} from './utils/dragWindowAndHover';
import {dragWindowTo} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';
import {getWindow} from './utils/getWindow';

let win1: Window, win2: Window;
let fin: Fin;

beforeAll(async () => {
    fin = await getConnection();
});
afterEach(async () => {
    await win1.close();
    await win2.close();

    await teardown();
});

test('normal deregister, snap with registered', async () => {
    win1 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    });
    win2 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/test/popup-deregistered.html',
        frame: false
    });

    const win2Bounds = await getBounds(win2);


    await dragWindowTo(win1, win2Bounds.left + 50, win2Bounds.bottom + 2);
    await dragWindowTo(win2, 500, 500);

    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    assert.notStrictEqual(bounds1.left, bounds2.left);
    assert.notStrictEqual(bounds1.top, bounds2.bottom);
});

test('normal deregister, snap with degistered', async () => {
    win1 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    });
    win2 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/test/popup-deregistered.html',
        frame: false
    });

    const win1bounds = await getBounds(win1);

    await dragWindowTo(win2, win1bounds.left + 50, win1bounds.bottom + 2);
    await dragWindowTo(win1, 500, 500);

    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    assert.notStrictEqual(bounds2.left, bounds1.left);
    assert.notStrictEqual(bounds2.top, bounds1.bottom);
});

test('delayed deregister, snap with registered', async () => {
    win1 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    });
    win2 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/test/popup-delayed-deregistered.html',
        frame: false
    });

    const win2Bounds = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.left + 50, win2Bounds.bottom + 2);
    await dragWindowTo(win2, 500, 500);

    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    assert.notStrictEqual(bounds1.left, bounds2.left);
    assert.notStrictEqual(bounds1.top, bounds2.bottom);
});

test('delayed deregister, snap with deregistered', async () => {
    win1 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    });
    win2 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/test/popup-delayed-deregistered.html',
        frame: false
    });

    const win1bounds = await getBounds(win1);

    await dragWindowTo(win2, win1bounds.left + 50, win1bounds.bottom + 2);
    await dragWindowTo(win1, 500, 500);

    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    assert.notStrictEqual(bounds2.left, bounds1.left);
    assert.notStrictEqual(bounds2.top, bounds1.bottom);
});

test('deregister snapped window', async () => {
    win1 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    });
    win2 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/test/popup-triggered-deregistered.html',
        frame: false
    });

    const win1bounds = await getBounds(win1);

    // Snap windows together
    await dragWindowTo(win2, win1bounds.left + 50, win1bounds.bottom + 2);
    // Move window pair
    await dragWindowTo(win1, 500, 500);

    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    // Windows should still be snapped.
    assert.strictEqual(bounds2.left, bounds1.left);
    assert.strictEqual(bounds2.top, bounds1.bottom);

    // Send message to triggered app to deregister.
    await fin.InterApplicationBus.send(win2.identity, 'deregister', '');

    // Move window pair again
    await dragWindowTo(win1, 100, 100);

    const endbounds1 = await getBounds(win1);
    const endbounds2 = await getBounds(win2);

    // Windows should no longer be snapped.
    assert.notStrictEqual(endbounds2.left, endbounds1.left);
    assert.notStrictEqual(endbounds2.top, endbounds1.bottom);
});

test('no preview when deregistered - dragging registered', async () => {
    // Wrap the pre-spawned preview window
    const previewWin = await getWindow({name: 'successPreview', uuid: 'layouts-service'});

    // Spawn two child windows (one of them deregistered)
    win1 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    });
    win2 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/test/popup-deregistered.html',
        frame: false
    });

    // Drag and hold the reigstered window next to the deregistered window
    const win1Bounds = await getBounds(win1);
    await dragWindowAndHover(win2, win1Bounds.right + 2, win1Bounds.top + 5);

    // The preview window should still be hidden.
    assert.strictEqual(await previewWin.isShowing(), false);

    // Drop the window
    robot.mouseToggle('up');
});

test('no preview when deregistered - dragging deregistered', async () => {
    // Wrap the pre-spawned preview window
    const previewWin = await getWindow({name: 'successPreview', uuid: 'layouts-service'});

    // Spawn two child windows (one of them deregistered)
    win1 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/test/popup-deregistered.html',
        frame: false
    });
    win2 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    });

    // Drag and hold the dereigstered window next to the registered window
    const win1Bounds = await getBounds(win1);
    await dragWindowAndHover(win2, win1Bounds.right + 2, win1Bounds.top + 5);

    // The preview window should still be hidden.
    assert.strictEqual(await previewWin.isShowing(), false);

    // Drop the window
    robot.mouseToggle('up');
});