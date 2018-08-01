import { test } from 'ava';
import { dragWindowTo } from './utils/dragWindowTo';
import { getBounds, NormalizedBounds } from './utils/getBounds';
import { createChildWindow } from './utils/createChildWindow';
import { Window, Fin } from 'hadouken-js-adapter';
import { getConnection } from './utils/connect';
import { undockWindow, WindowIdentity} from './utils/undockWindow';
import { resolve } from 'url';

// TODO - Change client/service file structure to allow importing these values
const UNDOCK_MOVE_DISTANCE = 30; 

let win1: Window, win2: Window, win3: Window, win4: Window;
let bounds1: NormalizedBounds, bounds2:NormalizedBounds;
let fin: Fin;

test.before(async () => {
    fin = await getConnection();
});
test.afterEach.always(async () => {
    await win1.close();
    await win2.close();
});

test('Two windows - undock bottom', async t => {
    t.plan(4);

    win1 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/SnapDockDemo/frameless-window.html', frame: false });
    win2 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/SnapDockDemo/frameless-window.html', frame: false });

    const win2Bounds = await getBounds(win2);

    // Snap the windows
    await dragWindowTo(win1, win2Bounds.left + 50, win2Bounds.bottom + 2);

    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);

    // Windows are adjacent
    t.is(bounds1.left, bounds2.left);
    t.is(bounds1.top, bounds2.bottom);

    // Send and undock message to the service
    await undockWindow(win1.identity as WindowIdentity);

    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);

    // Undocked window moved away from other window(s)
    t.is(bounds1.left, bounds2.left);
    t.is(bounds1.top, bounds2.bottom + UNDOCK_MOVE_DISTANCE);
});

test('Two windows - undock top', async t => {
    t.plan(4);

    

    win1 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/SnapDockDemo/frameless-window.html', frame: false });
    win2 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/SnapDockDemo/frameless-window.html', frame: false });

    const win1Bounds = await getBounds(win1);

    // Snap the windows
    await dragWindowTo(win2, win1Bounds.left + 50, win1Bounds.bottom + 2);

    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);

    // Windows are adjacent
    t.is(bounds1.left, bounds2.left);
    t.is(bounds1.bottom, bounds2.top);

    // Send and undock message to the service
    await undockWindow(win1.identity as WindowIdentity);

    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);

    // Undocked window moved away from other window(s)
    t.is(bounds1.left, bounds2.left);
    t.is(bounds1.bottom, bounds2.top - UNDOCK_MOVE_DISTANCE);
});


test('Two windows - undock right', async t => {
    t.plan(4);

    win1 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/SnapDockDemo/frameless-window.html', frame: false });
    win2 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/SnapDockDemo/frameless-window.html', frame: false });

    const win2Bounds = await getBounds(win2);

    // Snap the windows
    await dragWindowTo(win1, win2Bounds.right + 2, win2Bounds.top + 50);

    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);

    // Windows are adjacent
    t.is(bounds1.left, bounds2.right);
    t.is(bounds1.top, bounds2.top);

    // Send and undock message to the service
    await undockWindow(win1.identity as WindowIdentity);

    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);

    // Undocked window moved away from other window(s)
    t.is(bounds1.left, bounds2.right + UNDOCK_MOVE_DISTANCE);
    t.is(bounds1.top, bounds2.top);
});

test('Two windows - undock left', async t => {
    t.plan(4);

    win1 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/SnapDockDemo/frameless-window.html', frame: false });
    win2 = await createChildWindow({ autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/SnapDockDemo/frameless-window.html', frame: false });

    const win1Bounds = await getBounds(win1);

    // Snap the windows
    await dragWindowTo(win2, win1Bounds.right + 2, win1Bounds.top + 50);

    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);

    // Windows are adjacent
    t.is(bounds1.right, bounds2.left);
    t.is(bounds1.top, bounds2.top);

    // Send and undock message to the service
    await undockWindow(win1.identity as WindowIdentity);

    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);

    // Undocked window moved away from other window(s)
    t.is(bounds1.right, bounds2.left - UNDOCK_MOVE_DISTANCE);
    t.is(bounds1.top, bounds2.top);
});
