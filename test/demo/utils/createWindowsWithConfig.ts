import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {createApp, AppData} from 'openfin-service-tooling/spawn';

import {ConfigurationObject, Preview} from '../../../gen/provider/config/layouts-config';
let counter = 0;

/**
 * Creates a set of windows, one per argument.
 *
 * If argument is provided, it will be used as the windows snap preview configuration. If `undefined`, window will use
 * default service config.
 *
 * @param key Unique key
 * @param configs Set of snap preview configs
 */
export async function createWindowsWithConfig(key: string, ...configs: (Preview | undefined)[]): Promise<_Window[]> {
    return Promise.all(configs.map(async (previewConfig: Preview | undefined, index: number) => {
        let config: ConfigurationObject | undefined = undefined;
        if (previewConfig) {
            config = {
                preview: previewConfig
            };
        }

        const appData: AppData<ConfigurationObject> = {
            type: 'manifest',
            // All app uuid's must be unique, due to apparent manifest caching behaviour
            id: `window-${key}-${index}:${counter++}`,
            position: {x: 200 + (index * 350), y: 150},
            config,
            provider: 'testing',
            frame: false,
            url: 'http://localhost:1337/demo/testbed/index.html'
        };

        const app = await createApp(appData);

        return app.getWindow();
    }));
}
