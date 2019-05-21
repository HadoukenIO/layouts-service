import robot from 'robotjs';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {PreviewConfig} from '../../../gen/provider/config/layouts-config';
import {dragWindowAndHover} from '../../provider/utils/dragWindowAndHover';
import {createApp} from '../../../src/demo/spawn';
import {teardown} from '../../teardown';

let windows: _Window[];
let counter = 0;

/**
 * Creates a set of windows, one per argument.
 *
 * If argument is provided, it will be used as the windows snap preview configuration. If `undefined`, window will use
 * default service config.
 *
 * @param configs Set of snap preview configs
 */
async function createWindowsWithConfig(...configs: (PreviewConfig|undefined)[]): Promise<_Window[]> {
    return Promise.all(configs.map(async (config: PreviewConfig|undefined, index: number) => {
        const app = await createApp({
            type: 'manifest',
            // All app uuid's must be unique, due to apparent manifest caching behaviour
            id: `window-${index}:${counter++}`,
            position: {x: 200 + (index * 350), y: 150},
            config: config ? {preview: {snap: config}} : undefined
        });

        return app.getWindow();
    }));
}

afterEach(async () => {
    robot.mouseToggle('up');

    await Promise.all(windows.map(window => window.close()));
    windows.length = 0;

    await teardown();
});

describe('When two windows are moved within snapping distance', () => {
    async function init(config1?: PreviewConfig, config2?: PreviewConfig, activeIndex: number = 1) {
        windows = await createWindowsWithConfig(config1, config2);

        const targetIndex: number = (activeIndex + 1) % 2;
        const bounds = await windows[targetIndex].getBounds();

        await dragWindowAndHover(windows[activeIndex], bounds.right! + 15, bounds.top);
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
});
