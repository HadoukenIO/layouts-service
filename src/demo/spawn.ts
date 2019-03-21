import {Application, Identity} from 'hadouken-js-adapter';
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {ConfigurationObject} from '../../gen/provider/config/layouts-config';
import {ConfigWithRules} from '../provider/config/Store';
import {Point} from '../provider/snapanddock/utils/PointUtils';

export type Dictionary<T = string> = {
    [key: string]: T
};

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

/**
 * Higher-level abstraction of 'fin.WindowOptions'.
 *
 * Any fields not specified will be filled-in with default values.
 */
export interface WindowData {
    /**
     * When creating an application, the mainWindow's UUID & name. When creating a window, the window name.
     *
     * If not specified, a random UUID/name will be generated (based on the parent app UUID, if a programmatic app).
     */
    id?: string;

    /**
     * URL of the window. Defaults to the testbed app.
     */
    url?: string;

    /**
     * A set of query string arguments, to append to the end of `url`.
     *
     * Arguments will be URL-encoded. Values can be a primitive (`string`/`number`/`boolean`), or any object
     * serializable by `JSON.stringify`. Only `"object"` values will be ran through `stringify`.
     */
    queryArgs?: Dictionary;

    /**
     * If the window should be created with a frame, defaults to true
     */
    frame?: boolean;

    /**
     * Window position, defaults to top-left of screen.
     *
     * Can use the string `'center'` to use `defaultCenter: true` to position the window.
     */
    position?: Point|'center';

    /**
     * Window size, defaults to 400x300.
     */
    size?: Point;

    /**
     * If non-zero, will add a random offset to size.x/y - for creating windows with roughly similar sizes.
     *
     * Using the x axis as an example, the offset will be a random number between -(width * sizeOffset) and (width * sizeOffset)
     *
     * Will default to zero (no offset applied)
     */
    sizeOffset?: number;

    /**
     * Not a property of the window - instead, this is the Identity of the window that we want to create the app/window.
     *
     * If not specified, the calling window will create the app/window directly.
     */
    parent?: Identity;

    /**
     * State of the window. Defaults to normal.
     */
    state?: 'normal'|'minimized'|'maximized';
}

/**
 * Higher-level abstraction of 'fin.ApplicationOptions'. If type is 'programmatic', none of the other fields in this
 * interface will apply. Fields inherited from base interface work on both 'manifest' and 'programmatic'-launched apps.
 *
 * Any fields not specified will be filled-in with default values.
 */
export interface AppData extends WindowData {
    type?: 'manifest'|'programmatic';

    /**
     * If the application's manifest should declare a 'services' section containing the layouts service.
     */
    useService?: boolean;

    /**
     * The version of the provider to use. Either local/staging/stable, or a version number from the CDN.
     *
     * Has no effect if `useService` is false.
     */
    provider?: string;

    /**
     * Config object to include within the manifest. May also contain rules.
     */
    config?: ConfigWithRules<ConfigurationObject>|null;

    /**
     * Runtime version, can be a release channel name or an explicit version number.
     */
    runtime?: string;

    /**
     * If specified, will place the app in a security realm of the same name.
     */
    realm?: string;

    /**
     * If the security realm should be created with the `--enableMesh` flag. Has no effect if not also passing `realm`.
     *
     * Defaults to true, as service wouldn't otherwise be able to access the window.
     */
    enableMesh?: boolean;
}

/**
 * Creates an IAB channel that is used to listen for app/window spawn requests from other windows/applications. A call
 * to this method is required for a window to be used as the `parent` arg in a call to `createApp` or `createWindow`.
 *
 * This allows any window within the demo app to request any other window create a new app or child window.
 */
export async function addSpawnListeners(): Promise<void> {
    const channel = await fin.InterApplicationBus.Channel.create(`spawn-${fin.Application.me.uuid}`);
    channel.register('createApplication', async (options: AppData) => (await createApplication(options)).identity);
    channel.register('createWindow', async (options: WindowData) => (await createChildWindow(options)).identity);
}

export async function createApp(options: AppData): Promise<Application> {
    const parent = options.parent;

    if (parent && parent.uuid !== fin.Application.me.uuid) {
        // Connect to parent app, and instruct it to create this application
        const channel: ChannelClient = await fin.InterApplicationBus.Channel.connect(`spawn-${parent.uuid}`);
        const identity: Identity = await channel.dispatch('createApplication', options);
        return fin.Application.wrapSync(identity);
    } else {
        // Create the application ourselves
        return await createApplication(options);
    }
}

export async function createWindow(options: WindowData): Promise<_Window> {
    const parent = options.parent;

    if (parent && parent.uuid !== fin.Application.me.uuid) {
        // Connect to parent app, and instruct it to create this window
        const channel: ChannelClient = await fin.InterApplicationBus.Channel.connect(`spawn-${parent.uuid}`);
        const identity: Identity = await channel.dispatch('createWindow', options);
        return fin.Window.wrapSync(identity);
    } else {
        // Create the window ourselves
        return await createChildWindow(options);
    }
}

async function createApplication(options: Omit<AppData, 'parent'>): Promise<Application> {
    const uuid: string = options.id || `App-${Math.random().toString().substr(2, 4)}`;
    const url = getUrl(options);
    const position = getWindowPosition(options);
    const size = getWindowSize(options);
    const state = options.state || 'normal';

    if (options.type === 'programmatic') {
        const data: fin.ApplicationOptions = {
            uuid,
            name: uuid,
            mainWindowOptions: {
                ...position,
                url,
                frame: options.frame,
                state,
                autoShow: true,
                saveWindowState: false,
                defaultWidth: size.x,
                defaultHeight: size.y,
            }
        };
        return await startApp(fin.Application.create(data));
    } else {
        const queryOptions: Dictionary<string|number|boolean> = {
            ...position as Required<typeof position>,
            uuid,
            url,
            state,
            defaultWidth: size.x,
            defaultHeight: size.y,
            frame: options.frame || false,
            realmName: options.realm || '',
            enableMesh: options.enableMesh || false,
            runtime: options.runtime || await fin.System.getVersion(),
            useService: options.useService !== undefined ? options.useService : true,
            provider: options.provider || 'local',
            config: options.config ? JSON.stringify(options.config) : ''
        };

        const manifest = `http://localhost:1337/manifest?${
            Object.keys(queryOptions)
                .map(key => {
                    return `${key}=${encodeURIComponent(queryOptions[key].toString())}`;
                })
                .join('&')}`;

        return await startApp(fin.Application.createFromManifest(manifest));
    }
}

async function createChildWindow(data: Omit<WindowData, 'parent'>): Promise<_Window> {
    const name: string = data.id || `Win-${Math.random().toString().substr(2, 4)}`;
    const url = getUrl(data);
    const position = getWindowPosition(data);
    const size = getWindowSize(data);

    const options:
        fin.WindowOptions = {...position, name, url, frame: data.frame, autoShow: true, saveWindowState: false, defaultWidth: size.x, defaultHeight: size.y};
    return await fin.Window.create(options);
}

async function startApp(appPromise: Promise<Application>): Promise<Application> {
    const app = await appPromise;
    await app.run();
    return app;
}

function getUrl(options: WindowData): string {
    // Create URL from base URL + queryArgs
    let url = options.url || 'http://localhost:1337/demo/testbed/index.html';
    const urlQueryParams = options.queryArgs || {};
    const urlQueryKeys = Object.keys(urlQueryParams);

    // Resolve relative URL's
    if (url.indexOf('://') === -1) {
        // No protocol, assume relative URL and resolve against location.href
        url = new URL(url, location.href).href;
    }

    // Add-on querystring arguments
    const queryParams: string[] = [];
    Object.keys(urlQueryParams).forEach(param => {
        const value = urlQueryParams[param];
        if (value) {
            queryParams.push(`${param}=${encodeURIComponent(typeof value === 'object' ? JSON.stringify(value) : value.toString())}`);
        }
    });
    if (urlQueryParams && urlQueryKeys.length > 0) {
        url += `${url.includes('?') ? '&' : '?'}${queryParams.join('&')}`;
    }

    return url;
}

function getWindowPosition(options: WindowData): {defaultCentered?: boolean; defaultLeft?: number; defaultTop?: number} {
    const {position} = options;

    if (position === 'center') {
        // Position in center of screen
        return {defaultCentered: true};
    } else if (position) {
        // Position in fixed x/y position
        const out: {defaultLeft?: number; defaultTop?: number} = {};
        if (position.x !== undefined) {
            out.defaultLeft = position.x;
        }
        if (position.y !== undefined) {
            out.defaultTop = position.y;
        }
        return out;
    } else {
        // Use system-default positioning
        return {};
    }
}

function getWindowSize(options: WindowData): Point {
    return {
        x: (options.size && options.size.x || 400) * (1 + (Math.random() * (options.sizeOffset || 0))),
        y: (options.size && options.size.y || 300) * (1 + (Math.random() * (options.sizeOffset || 0)))
    };
}
