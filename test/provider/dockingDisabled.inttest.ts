import {Window} from 'hadouken-js-adapter';
import * as assert from 'power-assert';

import {Scope} from '../../gen/provider/config/layouts-config';
import {promiseMap} from '../../src/provider/snapanddock/utils/async';
import {executeJavascriptOnService} from '../demo/utils/serviceUtils';
import {teardown} from '../teardown';

import {assertGrouped, assertNotGrouped} from './utils/assertions';
import {createChildWindow} from './utils/createChildWindow';
import {dragSideToSide, dragWindowTo} from './utils/dragWindowTo';
import {getBounds, NormalizedBounds} from './utils/bounds';

let windows: Window[] = new Array<Window>(2);

const windowOptions = [
    {
        name: 'dock-win1',
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    },
    {
        name: 'dock-win2',
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    }
];
const windowScopes: Scope[] = [{level: 'window', uuid: 'testApp', name: 'dock-win1'}, {level: 'window', uuid: 'testApp', name: 'dock-win2'}];

beforeEach(async () => {
    for (let i = 0; i < 2; i++) {
        windows[i] = await createChildWindow(windowOptions[i]);
    }
});
afterEach(async () => {
    for (let i = 0; i < windows.length; i++) {
        await windows[i].close();
    }
    windows = new Array<Window>(2);

    await teardown();
});

it('When docking is not disabled, dragging windows together does not group windows', async () => {
    let bounds: NormalizedBounds[];

    await dragSideToSide(windows[1], 'left', windows[0], 'right', {x: 5, y: 10});

    await assertGrouped(windows[0], windows[1]);
    bounds = await promiseMap(windows, win => getBounds(win));
    assert.strictEqual(bounds[0].right, bounds[1].left);

    await dragWindowTo(windows[0], 200, 400);

    await assertGrouped(windows[0], windows[1]);
    bounds = await promiseMap(windows, win => getBounds(win));
    assert.strictEqual(bounds[0].right, bounds[1].left);
});

it('When docking is disabled, dragging windows together does not group windows', async () => {
    await toggleDocking(false);

    let bounds: NormalizedBounds[];

    await dragSideToSide(windows[1], 'left', windows[0], 'right', {x: 5, y: 10});

    await assertNotGrouped(windows[0]);
    await assertNotGrouped(windows[1]);
    bounds = await promiseMap(windows, win => getBounds(win));
    assert.strictEqual(bounds[0].right, bounds[1].left);

    await dragWindowTo(windows[0], 400, 400);

    await assertNotGrouped(windows[0]);
    await assertNotGrouped(windows[1]);
    bounds = await promiseMap(windows, win => getBounds(win));
    assert.notStrictEqual(bounds[0].right, bounds[1].left);
});

export async function toggleDocking(dockingEnabled: boolean): Promise<void> {
    return executeJavascriptOnService(function(this: ProviderWindow, {windowScopes, dockingEnabled}) {
        windowScopes.forEach(scope => this.config.add(scope, {features: {dock: dockingEnabled}}));
    }, {windowScopes, dockingEnabled});
}
