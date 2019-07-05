import robot from 'robotjs';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {PreviewConfig} from '../../../gen/provider/config/layouts-config';
import {dragWindowAndHover} from '../../provider/utils/dragWindowAndHover';
import {teardown} from '../../teardown';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
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

async function createWindows(...options: (PreviewOptions | undefined)[]): Promise<_Window[]> {
    const configs = options.map(option => {
        return {
            snap: option,
            tab: {activeOpacity: null, targetOpacity: null}
        };
    });
    return createWindowsWithConfig(...configs);
}

describe('When two windows are moved within snapping distance', () => {
    async function init(activeIndex: number = 1, ...options: (PreviewOptions | undefined)[]) {
        windows = await createWindows(...options);

        const targetIndex: number = (activeIndex + 1) % 2;

        await Promise.all(options.map((option, i) => {
            return option && option.defaultOpacity ? windows[i].updateOptions({opacity: option.defaultOpacity}) : undefined;
        }));

        const bounds = await windows[targetIndex].getBounds();

        await dragWindowAndHover(windows[activeIndex], bounds.right! + 15, bounds.top);
        await delay(500);
    }

    describe('And windows are using the default configuration', () => {
        beforeEach(async () => {
            await init(1, undefined, undefined);
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
            await init(0, {activeOpacity: null, targetOpacity: null, defaultOpacity: 0.5}, undefined);

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


describe('When a window is moved with snapping distance of a group', () => {
    async function init(...options: (PreviewOptions | undefined)[]) {
        windows = await createWindows(...options);

        // create group of 2 windows
        await dragSideToSide(windows[0], 'right', windows[1], 'left');

        await Promise.all(options.map((option, i) => {
            return option && option.defaultOpacity ? windows[i].updateOptions({opacity: option.defaultOpacity}) : undefined;
        }));

        // make preview window state
        await dragSideToSide(windows[2], 'top', windows[1], 'bottom', undefined, false);
    }

    describe('All windows using default configuration', () => {
        it('All windows change to 80% opacity', async () => {
            await init(undefined, undefined, undefined);
            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[2].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When the active window has custom activeOpacity', () => {
        it('Active window has 60% opacity.  Grouped target windows have default 80%', async () => {
            await init(undefined, undefined, {activeOpacity: 0.6});

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[2].getOptions()).toHaveProperty('opacity', 0.6);
        });
    });

    describe('When a grouped window has custom targetOpacity', () => {
        it('Customised window has 50% opacity.  All other windows have 80% opacity.', async () => {
            await init({targetOpacity: 0.5}, undefined, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.5);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.8);
            expect(await windows[2].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When both grouped windows have custom targetOpacity', () => {
        it('Grouped windows have their respective opacity applied.  Active window 80% opacity.', async () => {
            await init({targetOpacity: 0.5}, {targetOpacity: 0.1}, undefined);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 0.5);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 0.1);
            expect(await windows[2].getOptions()).toHaveProperty('opacity', 0.8);
        });
    });

    describe('When active window has activeOpacity of null', () => {
        it('Keeps its preset opacity.', async () => {
            await init(undefined, undefined, {activeOpacity: null, defaultOpacity: 0.5});

            await dragSideToSide(windows[2], 'left', windows[1], 'right', undefined, false);

            expect(await windows[2].getOptions()).toHaveProperty('opacity', 0.5);
        });
    });
});

describe('When moving a group of windows', () => {
    async function init(...options: (PreviewOptions | undefined)[]) {
        windows = await createWindows(...options);

        // create group of 2 windows
        await dragSideToSide(windows[0], 'right', windows[1], 'left');

        // group 3 windows
        await dragSideToSide(windows[2], 'top', windows[1], 'bottom');
    }

    describe('All windows have custom activeOpacity and targetOpacity', () => {
        it('Windows remain at 100% opacity during move.', async () => {
            await init({activeOpacity: 0.5, targetOpacity: 0.6}, {activeOpacity: 0.5, targetOpacity: 0.6}, {activeOpacity: 0.5, targetOpacity: 0.6});

            const bounds = await windows[0].getBounds();
            await dragWindowAndHover(windows[0], bounds.left + 50, bounds.top + 50);

            expect(await windows[0].getOptions()).toHaveProperty('opacity', 1);
            expect(await windows[1].getOptions()).toHaveProperty('opacity', 1);
            expect(await windows[2].getOptions()).toHaveProperty('opacity', 1);
        });
    });
});
