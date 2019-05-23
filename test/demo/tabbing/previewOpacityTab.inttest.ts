import robot from 'robotjs';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {PreviewConfig} from '../../../gen/provider/config/layouts-config';
import {teardown} from '../../teardown';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {delay} from '../../provider/utils/delay';
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

    await delay(1000);
    await teardown();
});

describe('When two windows are about to be tabbed together', () => {
    async function init(config1?: PreviewConfig, config2?: PreviewConfig, activeIndex: number = 1) {
        windows = await createWindowsWithConfig(config1, config2);

        const targetIndex: number = (activeIndex + 1) % 2;
        await tabWindowsTogether(windows[targetIndex], windows[activeIndex], false, false);
    }

    describe('And windows are using the default configuration', () => {
        beforeEach(async () => {
            await init();
        });

        it('Windows are reduced to 80% capacity', async () => {
            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When a window declares a custom activeOpacity', () => {
        it('When customised window is active, it\'s custom opacity is applied', async () => {
            await init({activeOpacity: 0.2}, undefined, 0);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.2);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('When customised window is target, it uses the standard 80% opacity', async () => {
            await init({activeOpacity: 0.5}, undefined, 1);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When a window declares a custom targetOpacity', () => {
        it('When customised window is target, it\'s custom opacity is applied', async () => {
            await init({targetOpacity: 0.2}, undefined, 1);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.2);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('When customised window is active, it uses the standard 80% opacity', async () => {
            await init({targetOpacity: 0.5}, undefined, 0);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When a window declares a custom targetOpacity and activeOpacity', () => {
        it('When customised window is target, it\'s custom opacity is applied', async () => {
            await init({targetOpacity: 0.2, activeOpacity: 0.4}, undefined, 1);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.2);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('When customised window is active, it\'s custom opacity is applied', async () => {
            await init({targetOpacity: 0.2, activeOpacity: 0.4}, undefined, 0);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.4);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When both windows declare a custom activeOpacity and targetOpacity', () => {
        it('Target and active windows have different respective opacity values', async () => {
            await init({targetOpacity: 0.1, activeOpacity: 0.2}, {targetOpacity: 0.1, activeOpacity: 0.2}, 1);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.1);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.2);
        });
    });

    describe('When a window declares custom targetOpacity of null', () => {
        it('Keeps its preset opacity when target', async () => {
            windows = await createWindowsWithConfig({targetOpacity: null}, undefined);

            await windows[0].updateOptions({opacity: 0.5});

            await tabWindowsTogether(windows[0], windows[1], false, false);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.5);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('Default 80% opacity applied when active', async () => {
            windows = await createWindowsWithConfig({targetOpacity: null}, undefined);
            await windows[0].updateOptions({opacity: 0.5});

            await tabWindowsTogether(windows[1], windows[0], false, false);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When a window declares custom activeOpacity of null', () => {
        it('Keeps its preset opacity when active', async () => {
            windows = await createWindowsWithConfig({activeOpacity: null}, undefined);

            await windows[0].updateOptions({opacity: 0.5});

            await tabWindowsTogether(windows[1], windows[0], false, false);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.5);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('Default 80% opacity applied when target', async () => {
            windows = await createWindowsWithConfig({activeOpacity: null}, undefined);
            await windows[0].updateOptions({opacity: 0.5});

            await tabWindowsTogether(windows[0], windows[1], false, false);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When a window declares custom activeOpacity and targetOpacity of null', () => {
        it('Keeps its preset opacity when active', async () => {
            windows = await createWindowsWithConfig({activeOpacity: null, targetOpacity: null}, undefined);

            await windows[0].updateOptions({opacity: 0.5});

            await tabWindowsTogether(windows[1], windows[0], false, false);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.5);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });

        it('Keeps its preset opacity when target', async () => {
            windows = await createWindowsWithConfig({activeOpacity: null, targetOpacity: null}, undefined);

            await windows[0].updateOptions({opacity: 0.5});

            await tabWindowsTogether(windows[0], windows[1], false, false);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.5);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });
});

describe('When adding a window to an existing tab group', () => {
    async function init(config1?: PreviewOptions, config2?: PreviewOptions, config3?: PreviewOptions) {
        windows = await createWindowsWithConfig(config1, config2, config3);

        await Promise.all([config1, config2, config3].map((config, i) => {
            return config && config.defaultOpacity ? windows[i].updateOptions({opacity: config.defaultOpacity}) : undefined;
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
    async function init(config1?: PreviewOptions, config2?: PreviewOptions, config3?: PreviewOptions, config4?: PreviewOptions) {
        windows = await createWindowsWithConfig(config1, config2, config3, config4);

        await Promise.all([config1, config2, config3, config4].map((config, i) => {
            return config && config.defaultOpacity ? windows[i].updateOptions({opacity: config.defaultOpacity}) : undefined;
        }));

        await tabWindowsTogether(windows[0], windows[1]);
        await tabWindowsTogether(windows[2], windows[3]);

        await delay(1000);

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
