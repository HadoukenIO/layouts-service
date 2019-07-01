import robot from 'robotjs';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {ConfigurationObject, Overlay, Preview} from '../../gen/provider/config/layouts-config';
import {teardown} from '../teardown';
import {dragWindowAndHover} from '../provider/utils/dragWindowAndHover';
import {getWindowConfig} from '../provider/utils/getWindowConfig';
import {RequiredRecursive} from '../../src/provider/config/ConfigUtil';
import {tabWindowsTogether} from '../provider/utils/tabWindowsTogether';
import {PreviewMap, PreviewType, forEachPreviewMap, Validity} from '../../src/provider/PreviewMap';

import {createWindowsWithConfig} from './utils/createWindowsWithConfig';
import {getPreviewWindows, getAllPreviewWindowsStyles, isPreviewShowing, compareOverlays} from './utils/previewWindowUtils';
import {getTabstrip} from './utils/tabServiceUtils';

let defaultConfig: RequiredRecursive<ConfigurationObject>;
let windows: _Window[] = [];
let previewWindows: PreviewMap<_Window>;
let previewWindowsStyles: PreviewMap<Promise<Overlay>>;

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
        await forEachPreviewMap(previewWindows, (win: _Window) => {
            expect(win).toBeDefined();
        });
    });

    it('All preview windows should be hidden', async () => {
        await forEachPreviewMap(previewWindows, async (win: _Window) => {
            const isShowing = await isPreviewShowing(win);
            expect(isShowing).toEqual(false);
        });
    });
});

describe('When transforming a window', () => {
    async function init(...configs: Preview[]) {
        windows = await createWindowsWithConfig(...configs);
        const bounds = await windows[1].getBounds();
        await dragWindowAndHover(windows[1], bounds.right! + 300, bounds.top);
    }

    beforeEach(async () => {
        await init(window1Style, window2Style);
        previewWindowsStyles = getAllPreviewWindowsStyles();
    });

    it('All preview windows should be hidden', async () => {
        await forEachPreviewMap(previewWindows, async (win: _Window) => {
            const isShowing = await isPreviewShowing(win);
            expect(isShowing).toEqual(false);
        });
    });

    it('All preview windows should preload their styles from the active window config', async () => {
        const expectedStyle = window2Style;
        await forEachPreviewMap(previewWindowsStyles, async (style: Promise<Overlay>, previewType: PreviewType, valid: Validity) => {
            const compare = await compareOverlays(await style, expectedStyle[previewType][valid], true);
            expect(compare).toEqual(true);
        });
    });

    it('All preview windows should preload the style from the next window to be transformed', async () => {
        const activeWindow = windows[0];
        await dragWindowAndHover(activeWindow, 100, 100);
        const expectedStyle = window2Style;

        await forEachPreviewMap(previewWindowsStyles, async (style: Promise<Overlay>, previewType: PreviewType, valid: Validity) => {
            const compare = await compareOverlays(await style, expectedStyle[previewType][valid], true);
            expect(compare).toEqual(true);
        });
    });
});

describe('When windows are about to be tabbed together', () => {
    async function init(activeIndex: number, ...configs: (Preview | undefined)[]) {
        windows = await createWindowsWithConfig(...configs);
        const targetIndex = (activeIndex + 1) % 2;
        await tabWindowsTogether(windows[targetIndex], windows[activeIndex], false, false);
    }

    describe('And a window is using the default configuration', () => {
        beforeEach(async () => {
            await init(0, undefined, undefined);
            previewWindowsStyles = await getAllPreviewWindowsStyles();
        });

        it('The default valid preview style is shown', async () => {
            const isShowing = await isPreviewShowing(previewWindows.tab.overlayValid);
            const overlayComparison = await compareOverlays(await previewWindowsStyles.tab.overlayValid, defaultConfig.preview.tab.overlayValid);
            expect(overlayComparison).toBe(true);
            expect(isShowing).toBe(true);
        });
    });

    describe('And a window is using a custom preview style', () => {
        beforeEach(async () => {
            await init(0, window1Style, window2Style, undefined);
            previewWindowsStyles = getAllPreviewWindowsStyles();
        });

        it('The active window\'s valid preview is shown', async () => {
            const activeIndex = 0;
            const expectedStyle = windowStyles[activeIndex].tab.overlayValid;

            await forEachPreviewMap(previewWindowsStyles, async (style: Promise<Overlay>, previewType: PreviewType, valid: Validity) => {
                const isShowing = await isPreviewShowing(previewWindows[previewType][valid]);

                if (previewType === 'tab' && valid === Validity.VALID) {
                    const overlayComparison = await compareOverlays(await style, expectedStyle);
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
    }

    describe('And a window is using the default configuration', () => {
        beforeEach(async () => {
            await init(0, undefined, undefined);
            previewWindowsStyles = getAllPreviewWindowsStyles();
        });

        it('The default valid preview style is shown', async () => {
            const isShowing = await isPreviewShowing(previewWindows.snap.overlayValid);
            const style = await previewWindowsStyles.snap.overlayValid;
            const overlayComparison = await compareOverlays(style, defaultConfig.preview.snap.overlayValid);
            expect(overlayComparison).toBe(true);
            expect(isShowing).toBe(true);
        });
    });

    describe('And windows are using custom configurations', () => {
        beforeEach(async () => {
            await init(0, window1Style, window2Style);
            previewWindowsStyles = getAllPreviewWindowsStyles();
        });

        it('The active window valid snap style is shown', async () => {
            const activeIndex = 0;
            const expectedStyle = windowStyles[activeIndex].snap.overlayValid;
            await forEachPreviewMap(previewWindowsStyles, async (style: Promise<Overlay>, previewType: PreviewType, valid: Validity) => {
                const isShowing = await isPreviewShowing(previewWindows[previewType][valid]);
                if (previewType === 'snap' && valid === Validity.VALID) {
                    const overlayComparison = await compareOverlays(await style, expectedStyle);
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
    }

    beforeEach(async () => {
        await init(0, window1Style, undefined, window2Style);
        previewWindowsStyles = getAllPreviewWindowsStyles();
    });

    describe('When a tab group snaps to another window', () => {
        it('The active tab\'s preview style is shown', async () => {
            const activeIndex = 0;
            const expectedStyle = windowStyles[activeIndex].snap.overlayValid;

            await forEachPreviewMap(previewWindowsStyles, async (style: Promise<Overlay>, previewType: PreviewType, valid: Validity) => {
                const isShowing = await isPreviewShowing(previewWindows[previewType][valid]);

                if (previewType === 'snap' && valid === Validity.VALID) {
                    const overlayComparison = await compareOverlays(await style, expectedStyle);
                    expect(isShowing).toEqual(true);
                    expect(overlayComparison).toEqual(true);
                } else {
                    expect(isShowing).toEqual(false);
                }
            });
        });
    });
});
