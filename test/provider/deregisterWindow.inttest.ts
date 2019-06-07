import {Window} from 'hadouken-js-adapter';
import * as assert from 'power-assert';
import * as robot from 'robotjs';

import {fin} from '../demo/utils/fin';
import {teardown} from '../teardown';

import {createChildWindow} from './utils/createChildWindow';
import {dragWindowAndHover} from './utils/dragWindowAndHover';
import {dragWindowTo} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';
import {getWindow} from './utils/getWindow';

let win1: Window, win2: Window;

afterEach(async () => {
    await win1.close();
    await win2.close();

    await teardown();
});

it('When dragging a registered window to a de-registered window, windows do not snap', async () => {
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

it('When dragging a de-registered window to a registered window, windows do not snap', async () => {
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

it('When dragging a registered window to a delayed de-registered window, windows do not snap', async () => {
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

it('When dragging a delayed de-registered window to a registered window, windows do not snap', async () => {
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

it('When dragging a de-registered-on-trigger window to a registered window, windows do not snap', async () => {
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

it('When dragging a registered window to a de-registered window, no snap preview window is shown', async () => {
    // Wrap the pre-spawned preview window
    const previewWin = await getWindow({name: 'preview-snap-valid', uuid: 'layouts-service'});

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

    // Drag and hold the registered window next to the de-registered window
    const win1Bounds = await getBounds(win1);
    await dragWindowAndHover(win2, win1Bounds.right + 2, win1Bounds.top + 5);

    // The preview window should still be hidden.
    assert.strictEqual(await previewWin.isShowing(), false);

    // Drop the window
    robot.mouseToggle('up');
});

it('When dragging a de-registered window to a registered window, no snap preview window is shown', async () => {
    // Wrap the pre-spawned preview window
    const previewWin = await getWindow({name: 'preview-snap-valid', uuid: 'layouts-service'});

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

    // Drag and hold the deregistered window next to the registered window
    const win1Bounds = await getBounds(win1);
    await dragWindowAndHover(win2, win1Bounds.right + 2, win1Bounds.top + 5);

    // The preview window should still be hidden.
    assert.strictEqual(await previewWin.isShowing(), false);

    // Drop the window
    robot.mouseToggle('up');
});
