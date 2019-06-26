import robot from 'robotjs';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {ConfigurationObject, Overlay, Preview} from '../../gen/provider/config/layouts-config';
import {teardown} from '../teardown';
import {delay} from '../provider/utils/delay';
import {dragWindowAndHover} from '../provider/utils/dragWindowAndHover';
import {getWindowConfig} from '../provider/utils/getWindowConfig';
import {RequiredRecursive} from '../../src/provider/config/ConfigUtil';
import {tabWindowsTogether} from '../provider/utils/tabWindowsTogether';

import {createWindowsWithConfig} from './utils/createWindowsWithConfig';
import {getPreviewWindows, getAllPreviewWindowsStyles, PreviewMap, PreviewType, isWindowShowing, testPreviewMap, OverlayValidKey, compareOverlays, convertCSS} from './utils/previewWindowUtils';
import {getTabstrip} from './utils/tabServiceUtils';

let defaultConfig: RequiredRecursive<ConfigurationObject>;
let windows: _Window[] = [];
let previewWindows: PreviewMap<_Window>;
let previewWindowsStyles: PreviewMap<Overlay>;

// Do not use Hex values as they will be converted to rgb and tests will fail.
const window1Style: RequiredRecursive<Preview> = {
    tab: {
        activeOpacity: null,
        targetOpacity: null,
        overlayValid: {background: 'green', border: '10px solid yellow', opacity: 0.2},
        overlayInvalid: {background: 'red', border: '2px solid white', opacity: 0.3}
    },
    snap: {
        activeOpacity: null,
        targetOpacity: null,
        overlayValid: {background: 'yellow', border: '10px dashed purple', opacity: 0.6},
        overlayInvalid: {background: 'pink', border: '2px solid red', opacity: 0.6}
    }
};

const window2Style: RequiredRecursive<Preview> = {
    tab: {
        activeOpacity: null,
        targetOpacity: null,
        overlayValid: {background: 'blue', border: '11px dotted orange', opacity: 0.9},
        overlayInvalid: {background: 'white', border: '2px solid aqua', opacity: 0.6}
    },
    snap: {
        activeOpacity: null,
        targetOpacity: null,
        overlayValid: {background: 'brown', border: '10px dashed white', opacity: 0.3},
        overlayInvalid: {background: 'aqua', border: '8px dotted black', opacity: 0.7}
    }
};

const windowStyles = [window1Style, window2Style];

beforeAll(async () => {
    defaultConfig = await getWindowConfig({name: '', uuid: ''}) as RequiredRecursive<ConfigurationObject>;
    /* Chrome reorders/converts CSS attributes values between set -> get.
     * For example hex values get converted to rgb.
     * `#333 no-repeat` -> `no-repeat rgb(51, 51, 51)`
     * A window is used to get the converted CSS rule to test against preview windows. */
    defaultConfig.preview.tab.overlayValid.background = await convertCSS(['background', defaultConfig.preview.tab.overlayValid.background]) || '';
    defaultConfig.preview.tab.overlayValid.border = await convertCSS(['border', defaultConfig.preview.tab.overlayValid.border]) || '';

    defaultConfig.preview.tab.overlayInvalid.background = await convertCSS(['background', defaultConfig.preview.tab.overlayInvalid.background]) || '';
    defaultConfig.preview.tab.overlayInvalid.border = await convertCSS(['border', defaultConfig.preview.tab.overlayInvalid.border]) || '';

    defaultConfig.preview.snap.overlayValid.background = await convertCSS(['background', defaultConfig.preview.snap.overlayValid.background]) || '';
    defaultConfig.preview.snap.overlayValid.border = await convertCSS(['border', defaultConfig.preview.snap.overlayValid.border]) || '';

    defaultConfig.preview.snap.overlayInvalid.background = await convertCSS(['background', defaultConfig.preview.snap.overlayInvalid.background]) || '';
    defaultConfig.preview.snap.overlayInvalid.border = await convertCSS(['border', defaultConfig.preview.snap.overlayInvalid.border]) || '';
});

beforeEach(async () => {
    previewWindows = getPreviewWindows();
});

afterEach(async () => {
    robot.mouseToggle('up');
    if (windows.length > 0) {
        await Promise.all(windows.map(window => window.close()));
    }
    windows.length = 0;
    await teardown();
});

describe('When starting up the service', () => {
    it('There should be preview windows created for all possible previews types', async () => {
        testPreviewMap(previewWindows, (win: _Window) => {
            expect(win).toBeDefined();
        });
    });

    it('All preview windows should be hidden', async () => {
        testPreviewMap(previewWindows, async (win: _Window) => {
            const isShowing = await isWindowShowing(win);
            expect(isShowing).toEqual(false);
        });
    });
});

describe('When transforming a window', () => {
    async function init(...configs: Preview[]) {
        windows = await createWindowsWithConfig(...configs);
        const bounds = await windows[1].getBounds();
        await dragWindowAndHover(windows[1], bounds.right! + 300, bounds.top);
        await delay(100);
    }

    beforeEach(async () => {
        await init(window1Style, window2Style);
        previewWindowsStyles = await getAllPreviewWindowsStyles();
    });

    it('All preview windows should be hidden', async () => {
        testPreviewMap(previewWindows, async (win: _Window) => {
            const isShowing = await isWindowShowing(win);
            expect(isShowing).toEqual(false);
        });
    });

    it('All preview windows should preload their styles from the active window config', async () => {
        const expectedStyle = window2Style;
        testPreviewMap(previewWindowsStyles, async (style: Overlay, previewType: PreviewType, valid: OverlayValidKey) => {
            const compare = await compareOverlays(style, expectedStyle[previewType][valid], true);
            expect(compare).toEqual(true);
        });
    });

    it('All preview windows should preload the style from the next window to be transformed', async () => {
        const activeWindow = windows[0];
        await dragWindowAndHover(activeWindow, 100, 100);
        const expectedStyle = window2Style;

        testPreviewMap(previewWindowsStyles, async (style: Overlay, previewType: PreviewType, valid: OverlayValidKey) => {
            const compare = await compareOverlays(style, expectedStyle[previewType][valid], true);
            expect(compare).toEqual(true);
        });
    });
});

describe('When windows are about to be tabbed together', () => {
    async function init(activeIndex: number, ...configs: (Preview | undefined)[]) {
        windows = await createWindowsWithConfig(...configs);
        const targetIndex = (activeIndex + 1) % 2;
        await tabWindowsTogether(windows[targetIndex], windows[activeIndex], false, false);
        await delay(100);
    }

    describe('And a window is using the default configuration', () => {
        beforeEach(async () => {
            await init(0, undefined, undefined);
            previewWindowsStyles = await getAllPreviewWindowsStyles();
        });

        it('The default valid preview style is shown', async () => {
            const isShowing = await isWindowShowing(previewWindows.tab.overlayValid);
            const overlayComparison = await compareOverlays(previewWindowsStyles.tab.overlayValid, defaultConfig.preview.tab.overlayValid);
            expect(overlayComparison).toBe(true);
            expect(isShowing).toBe(true);
        });
    });

    describe('And a window is using a custom preview style', () => {
        beforeEach(async () => {
            await init(0, window1Style, window2Style, undefined);
            previewWindowsStyles = await getAllPreviewWindowsStyles();
        });

        it('The active window\'s valid preview is shown', async () => {
            const activeIndex = 0;
            const expectedStyle = windowStyles[activeIndex].tab.overlayValid;

            await testPreviewMap(previewWindowsStyles, async (style: Overlay, previewType: PreviewType, valid: OverlayValidKey) => {
                const isShowing = await isWindowShowing(previewWindows[previewType][valid]);

                if (previewType === 'tab' && valid === OverlayValidKey.VALID) {
                    const overlayComparison = await compareOverlays(style, expectedStyle);
                    expect(isShowing).toEqual(true);
                    expect(overlayComparison).toEqual(true);
                } else {
                    expect(isShowing).toEqual(false);
                }
            });
        });
    });
});

describe('When snapping two windows together', () => {
    async function init(activeIndex: number, ...configs: (Preview | undefined)[]) {
        windows = await createWindowsWithConfig(...configs);
        const targetIndex = (activeIndex + 1) % 2;
        const bounds = await windows[targetIndex].getBounds();
        await dragWindowAndHover(windows[activeIndex], bounds.right! + 15, bounds.top);
        await delay(100);
    }

    describe('And a window is using the default configuration', () => {
        beforeEach(async () => {
            await init(0, undefined, undefined);
            previewWindowsStyles = await getAllPreviewWindowsStyles();
        });

        it('The default valid preview style is shown', async () => {
            const isShowing = await isWindowShowing(previewWindows.snap.overlayValid);
            const overlayComparison = await compareOverlays(previewWindowsStyles.snap.overlayValid, defaultConfig.preview.snap.overlayValid);
            expect(overlayComparison).toBe(true);
            expect(isShowing).toBe(true);
        });
    });

    describe('And windows are using custom configurations', () => {
        beforeEach(async () => {
            await init(0, window1Style, window2Style);
            previewWindowsStyles = await getAllPreviewWindowsStyles();
        });

        it('The active window valid snap style is shown', async () => {
            const activeIndex = 0;
            const expectedStyle = windowStyles[activeIndex].snap.overlayValid;

            await testPreviewMap(previewWindowsStyles, async (style: Overlay, previewType: PreviewType, valid: OverlayValidKey) => {
                const isShowing = await isWindowShowing(previewWindows[previewType][valid]);

                if (previewType === 'snap' && valid === OverlayValidKey.VALID) {
                    const overlayComparison = await compareOverlays(style, expectedStyle);
                    expect(isShowing).toEqual(true);
                    expect(overlayComparison).toEqual(true);
                } else {
                    expect(isShowing).toEqual(false);
                }
            });
        });
    });
});

describe('When tabbing & snapping', () => {
    async function init(activeIndex: number, ...configs: (Preview | undefined)[]) {
        windows = await createWindowsWithConfig(...configs);
        const targetIndex = (activeIndex + 1) % 2;
        const bounds = await windows[2].getBounds();
        await tabWindowsTogether(windows[targetIndex], windows[activeIndex], true, true);
        const tabstrip = await getTabstrip(windows[0].identity);
        await dragWindowAndHover(tabstrip, bounds.right! + 15, bounds.top);
        await delay(50);
    }

    beforeEach(async () => {
        await init(0, window1Style, undefined, window2Style);
        previewWindowsStyles = await getAllPreviewWindowsStyles();
    });

    describe('When a tab group snaps to another window', () => {
        it('The active tab\'s preview style is shown', async () => {
            const activeIndex = 0;
            const expectedStyle = windowStyles[activeIndex].snap.overlayValid;

            await testPreviewMap(previewWindowsStyles, async (style: Overlay, previewType: PreviewType, valid: OverlayValidKey) => {
                const isShowing = await isWindowShowing(previewWindows[previewType][valid]);

                if (previewType === 'snap' && valid === OverlayValidKey.VALID) {
                    const overlayComparison = await compareOverlays(style, expectedStyle);
                    expect(isShowing).toEqual(true);
                    expect(overlayComparison).toEqual(true);
                } else {
                    expect(isShowing).toEqual(false);
                }
            });
        });
    });
});
