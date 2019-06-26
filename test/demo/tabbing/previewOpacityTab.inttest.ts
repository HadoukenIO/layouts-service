import robot from 'robotjs';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {PreviewConfig, Preview} from '../../../gen/provider/config/layouts-config';
import {teardown} from '../../teardown';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {tearoutToOtherTabstrip} from '../utils/tabstripUtils';
import {getTabstrip} from '../utils/tabServiceUtils';
import {createWindowsWithConfig} from '../utils/createWindowsWithConfig';

/**
 * Combines the default preview config with the option to set an initial opacity on a window.
 */
type PreviewOptions = PreviewConfig & {defaultOpacity?: Number};

let windows: _Window[];

afterEach(async () => {
    robot.mouseToggle('up');

    await Promise.all(windows.map(window => window.close()));
    windows.length = 0;

    await teardown();
});

function createPreviewConfigs(...options: (PreviewOptions | undefined)[]): Preview[] {
    return options.map(option => {
        return {
            tab: option,
            snap: {activeOpacity: null, targetOpacity: null}
        };
    });
}

describe('When two windows are about to be tabbed together', () => {
    /**
     * Creates two windows and hovers one over the tab area of the other to generate a preview window response.
     */
    async function init(activeIndex: number = 1, ...options: (PreviewOptions | undefined)[]) {
        const configs = createPreviewConfigs(...options);
        windows = await createWindowsWithConfig(...configs);
        const targetIndex: number = (activeIndex + 1) % 2;
        await Promise.all([...options].map((option, i) => {
            return option && option.defaultOpacity ? windows[i].updateOptions({opacity: option.defaultOpacity}) : undefined;
        }));

        await tabWindowsTogether(windows[targetIndex], windows[activeIndex], false, false);
    }

    describe('And windows are using the default configuration', () => {
        beforeEach(async () => {
            await init(0, undefined, undefined);
        });

        it('Windows are reduced to 80% capacity', async () => {
            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When a window declares a custom activeOpacity', () => {
        it('When customised window is active, it\'s custom opacity is applied', async () => {
            await init(0, {activeOpacity: 0.2}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.2);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('When customised window is target, it uses the standard 80% opacity', async () => {
            await init(1, {activeOpacity: 0.5}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When a window declares a custom targetOpacity', () => {
        it('When customised window is target, it\'s custom opacity is applied', async () => {
            await init(1, {targetOpacity: 0.2}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.2);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('When customised window is active, it uses the standard 80% opacity', async () => {
            await init(0, {targetOpacity: 0.5}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When a window declares a custom targetOpacity and activeOpacity', () => {
        it('When customised window is target, it\'s custom opacity is applied', async () => {
            await init(1, {targetOpacity: 0.2, activeOpacity: 0.4}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.2);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('When customised window is active, it\'s custom opacity is applied', async () => {
            await init(0, {targetOpacity: 0.2, activeOpacity: 0.4}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.4);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When both windows declare a custom activeOpacity and targetOpacity', () => {
        it('Target and active windows have different respective opacity values', async () => {
            await init(1, {targetOpacity: 0.1, activeOpacity: 0.2}, {targetOpacity: 0.1, activeOpacity: 0.2});

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.1);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.2);
        });
    });

    describe('When a window declares custom targetOpacity of null', () => {
        it('Keeps its preset opacity when target', async () => {
            await init(1, {targetOpacity: null, defaultOpacity: 0.5}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.5);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('Default 80% opacity applied when active', async () => {
            await init(0, {targetOpacity: null, defaultOpacity: 0.5}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When a window declares custom activeOpacity of null', () => {
        it('Keeps its preset opacity when active', async () => {
            await init(0, {activeOpacity: null, defaultOpacity: 0.5}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.5);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('Default 80% opacity applied when target', async () => {
            await init(1, {activeOpacity: null, defaultOpacity: 0.5}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When a window declares custom activeOpacity and targetOpacity of null', () => {
        it('Keeps its preset opacity when active', async () => {
            await init(0, {activeOpacity: null, targetOpacity: null, defaultOpacity: 0.5}, {defaultOpacity: 0.8});

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.5);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('Keeps its preset opacity when target', async () => {
            await init(1, {activeOpacity: null, targetOpacity: null, defaultOpacity: 0.5}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.5);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });
});

describe('When adding a window to an existing tab group', () => {
    /**
     * Creates a tab group of 2 windows, then moves the third window over the tab area to generate a preview window response.
     */
    async function init(...options: (PreviewOptions | undefined)[]) {
        const configs = createPreviewConfigs(...options);
        windows = await createWindowsWithConfig(...configs);

        await Promise.all(options.map((option, i) => {
            return option && option.defaultOpacity ? windows[i].updateOptions({opacity: option.defaultOpacity}) : undefined;
        }));
        await tabWindowsTogether(windows[1], windows[2]);
        await tabWindowsTogether(windows[1], windows[0], false, false);
    }

    describe('Window has custom activeOpacity', () => {
        it('Has custom opacity applied when active', async () => {
            await init({activeOpacity: 0.2}, undefined, undefined);
            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.2);
        });

        it('Applies default 80% opacity when active tab in target group', async () => {
            await init(undefined, undefined, {activeOpacity: 0.2});
            expect(await windows[2].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('Keeps preset opacity when set with null', async () => {
            await init({activeOpacity: null, defaultOpacity: 0.2}, undefined, undefined);
            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.2);
        });
    });

    describe('Window has custom targetOpacity', () => {
        it('Applies default 80% opacity when active', async () => {
            await init({targetOpacity: 0.2}, undefined, undefined);
            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('Applies custom opacity when active tab in target group', async () => {
            await init(undefined, undefined, {targetOpacity: 0.2});
            expect(await windows[2].getOptions()).toHaveProperty('opacity', 0.2);
        });

        it('Keeps preset opacity when set with null', async () => {
            await init(undefined, undefined, {targetOpacity: null, activeOpacity: null, defaultOpacity: 0.2});
            expect(await windows[2].getOptions()).toHaveProperty('opacity', 0.2);
        });
    });
});


describe('When tearing a tab out into a new group', () => {
    /**
     * Creates two tab groups and tears out a tab from the first group into the second with hover, generating a preview window response.
     */
    async function init(...options: (PreviewOptions | undefined)[]) {
        const configs = createPreviewConfigs(...options);
        windows = await createWindowsWithConfig(...configs);

        await Promise.all(options.map((option, i) => {
            return option && option.defaultOpacity ? windows[i].updateOptions({opacity: option.defaultOpacity}) : undefined;
        }));

        await tabWindowsTogether(windows[0], windows[1]);
        await tabWindowsTogether(windows[2], windows[3]);
        await tearoutToOtherTabstrip(await getTabstrip(windows[0].identity), 0, await getTabstrip(windows[3].identity), true);
    }

    describe('A window has custom activeOpacity', () => {
        it('Applies custom opacity when active', async () => {
            await init({activeOpacity: 0.2}, undefined, undefined, undefined);
            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.2);
        });

        it('Applies default 80% opacity when target', async () => {
            await init(undefined, undefined, undefined, {activeOpacity: 0.2});
            expect(await windows[3].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('Keeps preset opacity when set with null and is active', async () => {
            await init({activeOpacity: null, targetOpacity: null, defaultOpacity: 0.2}, undefined, undefined, undefined);
            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.2);
        });
    });

    describe('A window has custom targetOpacity', () => {
        it('Applies custom opacity when target', async () => {
            await init(undefined, undefined, undefined, {targetOpacity: 0.2});
            expect(await windows[3].getOptions()).toHaveProperty('opacity', 0.2);
        });

        it('Applies default 80% opacity when active', async () => {
            await init({targetOpacity: 0.2}, undefined, undefined, undefined);
            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('Keeps preset opacity when set with null and is target', async () => {
            await init(undefined, undefined, undefined, {activeOpacity: null, targetOpacity: null, defaultOpacity: 0.2});
            expect(await windows[3].getOptions()).toHaveProperty('opacity', 0.2);
        });
    });
});
