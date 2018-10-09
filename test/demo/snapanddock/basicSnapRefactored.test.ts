import {Macro, test, TestContext} from 'ava';
import {Fin} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {assertAdjacent, assertGrouped} from '../../provider/utils/assertions';
import {getConnection} from '../../provider/utils/connect';
import {createChildWindow} from '../../provider/utils/createChildWindow';
import {delay} from '../../provider/utils/delay';
import {dragSideToSide, dragWindowTo} from '../../provider/utils/dragWindowTo';
import {opposite, Side, sideArray} from '../../provider/utils/SideUtils';

let windows: _Window[] = new Array<_Window>();
let fin: Fin;

const windowPositions = [{defaultTop: 300, defaultLeft: 300}, {defaultTop: 300, defaultLeft: 600}];
const windowOptions: fin.WindowOptions[] = windowPositions.map(position => {
    return Object.assign(
        {autoShow: true, saveWindowState: false, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/demo/frameless-window.html', frame: false},
        position);
});

test.before(async () => {
    fin = await getConnection();
});

test.beforeEach(async (t: TestContext) => {
    // Create all windows
    for (let i = 0; i < windowOptions.length; i++) {
        const element = windowOptions[i];
        windows[i] = await createChildWindow(element);
    }

    // Delay slightly to allow windows to initialize
    await delay(300);
});

test.afterEach.always(async (t: TestContext) => {
    // Close all windows
    await Promise.all(windows.map(win => win.close()));

    // Reset the windows array
    windows = new Array<_Window>();
});

const basicSnapDockMacro: Macro<TestContext> = async (t: TestContext, side: Side) => {
    // Align windows
    await dragSideToSide(windows[1], opposite(side), windows[0], side);

    // Assert snapped and docked
    await assertAdjacent(windows[0], windows[1], side, t);
    await assertGrouped(windows[0], windows[1], t);

    // Move windows
    await dragWindowTo(windows[0], 700, 700);

    // Assert still docked and adjacent
    await assertAdjacent(windows[0], windows[1], side, t);
    await assertGrouped(windows[0], windows[1], t);
};
basicSnapDockMacro.title = (providedTitle, side) => `${providedTitle} - ${side}`;

// Test snap and dock for each side
sideArray.forEach(side => {
    test('Basic SnapDock Tests', basicSnapDockMacro, side);
});