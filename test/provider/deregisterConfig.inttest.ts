import {Window} from 'hadouken-js-adapter';
import * as assert from 'power-assert';

import {ConfigurationObject, Scope} from '../../gen/provider/config/layouts-config';
import {executeJavascriptOnService} from '../demo/utils/serviceUtils';
import {isWindowRegistered} from '../demo/utils/snapServiceUtils';
import {teardown} from '../teardown';

import {assertGrouped, assertPairTabbed} from './utils/assertions';
import {createChildWindow} from './utils/createChildWindow';
import {delay} from './utils/delay';
import {dragSideToSide, dragWindowTo} from './utils/dragWindowTo';
import {tabWindowsTogether} from './utils/tabWindowsTogether';

type TestContext = {
    windows: Window[]
};

const context: TestContext = {
    windows: []
};

const DEFAULT_OPTIONS: fin.WindowOptions = {
    url: 'http://localhost:1337/demo/popup.html',
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultWidth: 300,
    defaultHeight: 200
};

async function addRuleToProvider(scope: Scope, config: ConfigurationObject): Promise<void> {
    await executeJavascriptOnService(function(this: ProviderWindow, data) {
        this.config.add(data.scope, data.config);
    }, {scope, config});

    // Small delay to allow any side effects of the rule addition to take place
    await delay(500);
}

beforeEach(async () => {
    context.windows = [];
});
afterEach(async () => {
    await Promise.all(context.windows.map(win => win.close()));

    await teardown();
});

it('Window can be de-registered by adding a rule to the store', async () => {
    const win = await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow'});
    context.windows.push(win);

    assert.strictEqual(await isWindowRegistered(win.identity), true);
    await addRuleToProvider({level: 'window', uuid: 'testApp', name: 'testWindow'}, {enabled: false});

    assert.strictEqual(await isWindowRegistered(win.identity), false);
});

it('A de-registered window can be re-registered by adding a rule to the store', async () => {
    const win = await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow', url: 'http://localhost:1337/test/popup-deregistered.html'});
    context.windows.push(win);

    assert.strictEqual(await isWindowRegistered(win.identity), false);
    await addRuleToProvider({level: 'window', uuid: 'testApp', name: 'testWindow'}, {enabled: true});
    assert.strictEqual(await isWindowRegistered(win.identity), true);
});

it('When a snapped window is de-registered, it is removed from its snap group', async () => {
    const {windows} = context;
    windows.push(await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow1'}));
    windows.push(await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow2'}));

    await dragSideToSide(windows[0], 'left', windows[1], 'right');
    await assertGrouped(...windows);
    await addRuleToProvider({level: 'window', uuid: 'testApp', name: 'testWindow1'}, {enabled: false});

    assert.strictEqual(await isWindowRegistered(windows[0].identity), false);
    assert.strictEqual(await isWindowRegistered(windows[1].identity), true);

    const groups = await Promise.all(windows.map(w => w.getGroup()));
    assert.strictEqual(groups[0].length, 0);
    assert.strictEqual(groups[1].length, 0);
});

it('When a tabbed window is de-registered, it is removed from its tab group', async () => {
    const {windows} = context;
    const w1 = await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow1'});
    const w2 = await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow2'});
    windows.push(w1, w2);

    await tabWindowsTogether(windows[0], windows[1]);

    await delay(1000);

    await assertPairTabbed(windows[0], windows[1]);
    await addRuleToProvider({level: 'window', uuid: 'testApp', name: 'testWindow1'}, {enabled: false});

    assert.strictEqual(await isWindowRegistered(windows[0].identity), false);
    assert.strictEqual(await isWindowRegistered(windows[1].identity), true);

    const groups = await Promise.all(windows.map(w => w.getGroup()));
    assert.strictEqual(groups[0].length, 0);
    assert.strictEqual(groups[1].length, 0);
});

it('When a tabbed window is de-registered, it is removed from its snapped tab group', async () => {
    const {windows} = context;
    for (let i = 0; i < 4; i++) {
        windows.push(await createChildWindow({
            ...DEFAULT_OPTIONS,
            name: `testWindow${i + 1}`,
            defaultLeft: (i % 2) * 320,
            defaultTop: Math.floor(i / 2) * 220
        }));
    }

    // Setup tab/snap groups.
    // Windows are frameless, so can snap by windows rather than by tabstrips
    await tabWindowsTogether(windows[0], windows[1]);
    await tabWindowsTogether(windows[2], windows[3]);
    await dragSideToSide(windows[0], 'left', windows[2], 'right');
    const bounds = await windows[0].getBounds();
    await dragWindowTo(windows[0], bounds.left + 100, bounds.top + 100);

    // Ensure windows are in position
    await assertPairTabbed(windows[0], windows[1]);
    await assertPairTabbed(windows[2], windows[3]);
    await assertGrouped(...windows);

    // De-register first window
    await addRuleToProvider({level: 'window', uuid: 'testApp', name: 'testWindow1'}, {enabled: false});

    // Allow for config to be applied and window de-registered
    await delay(500);

    // Ensure first window is de-registered
    assert.strictEqual(await isWindowRegistered(windows[0].identity), false);
    for (let i = 1; i < 4; i++) {
        assert.strictEqual(await isWindowRegistered(windows[i].identity), true);
    }

    // Ensure first window is de-tabbed whilst others remain grouped
    const groups = await Promise.all(windows.map(w => w.getGroup()));
    const groupSizes = groups.map(g => g.length);
    assert.deepEqual(groupSizes, [0, 4, 4, 4]);  // 4 Windows in group - 3 tabs and the one remaining tabstrip
});
