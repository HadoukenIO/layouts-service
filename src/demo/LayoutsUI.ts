import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {ConfigurationObject, Tabstrip} from '../../gen/provider/config/layouts-config';

import {register, deregister, snapAndDock, tabbing, tabstrip, workspaces} from '../client/main';
import {Workspace} from '../client/types';

import * as Storage from './storage';
import {channelPromise} from '../client/connection';
import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/system/application';

export interface Workspace {
    id: string;
    layout: Workspace;
}

let numTabbedWindows = 0;
const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));

interface AppData {
    // Common
    uuid: string;
    url: string;

    // Manifest
    runtime?: string;
    useService?: boolean;

    // Programmatic
    parent?: string;
}
interface ConfigData {
    enabled: boolean;
    snap: boolean;
    dock: boolean;
    tab: boolean;
    'tabstrip-url': string;
    'tabstrip-height': number;
}
interface ManifestData extends AppData {
    config: ConfigData;
}

// ID's of input/select elements in the "custom app" window
const manifestInputs: (keyof AppData)[] = ['uuid', 'url', 'runtime', 'useService'];
const programmaticInputs: (keyof AppData)[] = ['uuid', 'url', 'parent'];
const configInputs: (keyof ConfigData)[] = ['enabled', 'snap', 'dock', 'tab', 'tabstrip-url', 'tabstrip-height'];

export async function deregisterManager(): Promise<void> {
    await deregister();
}
export async function reregisterManager(): Promise<void> {
    await register();
}

export async function setLayout(layoutParam?: Workspace) {
    const id = (document.getElementById('layoutName') as HTMLTextAreaElement).value;
    const layoutSelect = document.getElementById('layoutSelect') as HTMLSelectElement;
    const layout = layoutParam || await workspaces.generate();
    const workspace = {id, layout};

    if (layoutSelect) {
        let optionPresent = false;
        for (let idx = 0; idx < layoutSelect.options.length; idx++) {  // looping over the options
            if (layoutSelect.options[idx].value === id) {
                optionPresent = true;
                break;
            }
        }

        if (!optionPresent) {
            const option = createOptionElement(id);
            layoutSelect.appendChild(option);
        }
    }

    Storage.saveLayout(workspace);
    updateTextArea(layout);
}

export async function showCreateFromManifestPopup(): Promise<void> {
    await fin.Window.create({
        name: 'create-app-manifest',
        url: './create-app-manifest.html',
        autoShow: true,
        resizable: false,
        defaultWidth: 317,
        defaultHeight: 605,
        saveWindowState: false
    });
}

export async function showCreateProgrammaticPopup(): Promise<void> {
    await fin.Window.create({
        name: 'create-app-programmatic',
        url: './create-app-programmatic.html',
        autoShow: true,
        resizable: false,
        defaultWidth: 317,
        defaultHeight: 218,
        saveWindowState: false
    });
}

export function initAppPopup(document: HTMLDocument) {
    const elements = configInputs.map(id => document.getElementById(`config-${id}`) as HTMLInputElement | HTMLSelectElement).filter(e => !!e);

    elements.forEach(element => {
        element.onchange = element.onkeyup = updateConfig.bind(null, document);
    });

    updateUUID(document);
    updateConfig(document);

    const parent = document.getElementById('parent');
    if (parent) {
        fin.System.getAllApplications().then((info: ApplicationInfo[]) => {
            const uuids = info.filter(i => i.isRunning).map(i => i.uuid).sort();

            uuids.forEach(uuid => {
                const option = document.createElement('option');
                option.innerText = uuid;
                option.selected = (uuid === fin.Application.me.uuid);
                parent.appendChild(option);
            });
        });
    }
}

function updateUUID(document: HTMLDocument): void {
    const input = document.getElementById('uuid') as HTMLInputElement;

    if (input.value.startsWith('custom-app-')) {
        input.value = `custom-app-${Math.random().toString(36).substr(2, 4)}`;
    }
}

function updateConfig(document: HTMLDocument): void {
    const preview = document.getElementById('config-preview') as HTMLPreElement;

    if (preview) {
        const config = getConfig(document);
        preview.innerText = config ? JSON.stringify(config, null, 4) : 'No Config';
    }
}

export function createAppFromManifest(document: HTMLDocument) {
    const manifest: ManifestData = {config: getConfig(document), ...getInputs(document, manifestInputs)};

    const queryParams: string[] = [];
    Object.keys(manifest).forEach(param => {
        const value = manifest[param as keyof ManifestData];

        if (value) {
            queryParams.push(`${param}=${encodeURIComponent(typeof value === 'object' ? JSON.stringify(value) : value.toString())}`);
        }
    });

    fin.Application.createFromManifest(`${location.origin}/manifest?${queryParams.join('&')}`).then(app => app.run()).catch(alert);
    updateUUID(document);
}

export function createAppProgrammatically(document: HTMLDocument) {
    const data: AppData = getInputs(document, programmaticInputs);
    const options: fin.ApplicationOptions = {uuid: data.uuid, name: data.uuid, mainWindowOptions: {name: data.uuid, url: data.url, autoShow: true}};

    if (data.parent === fin.Application.me.uuid) {
        fin.Application.create(options).then(app => app.run().catch(alert)).catch(alert);
    } else {
        fin.InterApplicationBus.send({uuid: data.uuid, name: data.uuid}, 'create-app', options);
    }

    updateUUID(document);
}

function getInputs<T>(document: HTMLDocument, keys: (keyof T)[], prefix = ''): T {
    return keys.reduce((data: T, key: keyof T) => {
        const input = document.getElementById(prefix + key) as HTMLInputElement;  // | HTMLSelectElement;

        if (input) {
            let value = input.type === 'checkbox' ? input.checked : input.value;

            // Special handling of certain elements
            if (key === 'url') {
                if (value && !value.toString().includes('://')) {
                    // Assume this is a relative URL
                    value = `${location.origin}${value.toString().startsWith('/') ? '' : '/'}${value}`;
                }
            }

            // Parse value
            const dataAny: any = data;  // tslint:disable-line:no-any
            if (value !== undefined && value !== 'default') {
                if (typeof value === 'boolean') {
                    dataAny[key] = value;
                } else if (value === 'true' || value === 'false') {
                    dataAny[key] = (value === 'true');
                } else if (Number.parseFloat(value).toString() === value) {
                    dataAny[key] = Number.parseFloat(value);
                } else {
                    dataAny[key] = value;
                }
            }
        }

        return data;
    }, {} as T);
}

function getConfig(document: HTMLDocument): ConfigurationObject|null {
    const data = getInputs(document, configInputs, 'config-');
    const config: ConfigurationObject = {};
    const configParams = Object.keys(data);

    configParams.forEach((param) => {
        switch (param) {
            case 'enabled':
                config.enabled = data.enabled as boolean;
                break;
            case 'snap':
            case 'dock':
            case 'tab':
                config.features = config.features || {};
                config.features[param] = data[param] as boolean;
                break;
            case 'tabstrip-url':
            case 'tabstrip-height':
                config.tabstrip = config.tabstrip || {} as Tabstrip;
                config.tabstrip[param.replace('tabstrip-', '') as keyof Tabstrip] = data[param] as number | string;
                break;
            default:
                console.warn('Unknown param:', param);
        }
    });

    // Must have either both tabstrip args, or neither
    if (config.tabstrip && !(config.tabstrip.url && config.tabstrip.height)) {
        delete config.tabstrip;
    }

    return Object.keys(config).length > 0 ? config : null;
}

export async function killAllWindows() {
    fin.desktop.System.getAllApplications((apps: fin.ApplicationInfo[]) => {
        apps.forEach((app) => {
            if (app.uuid !== 'layouts-service') {
                const wrappedApp = fin.desktop.Application.wrap(app.uuid);
                wrappedApp.getChildWindows((win) => {
                    win.forEach(w => w.close(true));
                });

                if (app.uuid !== 'Layouts-Manager') {
                    wrappedApp.close(true);
                }
            }
        });
    });
}

export async function getLayout() {
    const id = (document.getElementById('layoutSelect') as HTMLSelectElement).value;
    const workspace = Storage.getLayout(id);
    updateTextArea(workspace);
}

export async function getAllLayouts() {
    const layoutIDs = Storage.getAllLayoutIDs();
    updateTextArea(layoutIDs);
}

export async function restoreLayout() {
    const id = (document.getElementById('layoutSelect') as HTMLSelectElement).value;
    const workspace = Storage.getLayout(id);
    console.log('Restoring layout');
    const afterLayout = await workspaces.restore(workspace.layout);
    updateTextArea(afterLayout);
}

export async function createAppFromManifest2() {
    const appUrl = `${launchDir}/app2.json`;
    console.log('appurl', appUrl);
    fin.desktop.Application.createFromManifest(appUrl, (a: fin.OpenFinApplication) => a.run(), (e: Error) => {
        throw e;
    });
    // v2 api broken for createfromman / run
    // const app = await fin.Application.createFromManifest(appUrl);
    // app.run();
}
export async function createAppFromManifest3() {
    const appUrl = `${launchDir}/app3.json`;
    console.log('appurl', appUrl);
    fin.desktop.Application.createFromManifest(appUrl, (a: fin.OpenFinApplication) => a.run(), (e: Error) => {
        throw e;
    });
    // v2 api broken for createfromman / run
    // const app = await fin.Application.createFromManifest(appUrl);
    // app.run();
}

export async function createAppProgrammatically4() {
    const app = new fin.desktop.Application(
        {
            url: `http://localhost:1337/demo/app4.html`,
            uuid: 'App-4',
            name: 'App-4',
            mainWindowOptions: {defaultWidth: 400, defaultHeight: 300, saveWindowState: false, autoShow: true, defaultCentered: true}
        },
        () => {
            app.run();
        },
        console.error);
}

export async function createAppProgrammatically5() {
    const app = new fin.desktop.Application(
        {
            url: `http://localhost:1337/demo/app5.html`,
            uuid: 'App-5',
            name: 'App-5',
            mainWindowOptions: {defaultWidth: 300, defaultHeight: 400, saveWindowState: false, autoShow: true, defaultCentered: true}
        },
        () => {
            app.run();
        },
        console.error);
}

export function createSnapWindows(): void {
    // Create snap windows
    fin.desktop.main(() => {
        for (let i = 0; i < 6; i++) {
            fin.Window
                .create({
                    url: `${launchDir}/popup.html`,
                    autoShow: true,
                    defaultHeight: i > 2 ? 275 : 200,
                    defaultWidth: i > 4 ? 400 : 300,
                    defaultLeft: 350 * (i % 3) + 25,
                    defaultTop: i > 2 ? 300 : 50,
                    saveWindowState: false,
                    frame: false,
                    name: 'Window' + (i + 1)
                })
                .then(console.log)
                .catch(console.log);
        }
    });
}

export function createSimpleWindow(page: string) {
    const uuid = `App${numTabbedWindows}`;
    const app = new fin.desktop.Application(
        {
            url: `http://localhost:1337/demo/${page}.html`,
            uuid,
            name: uuid,
            mainWindowOptions: {defaultWidth: 400, defaultHeight: 300, saveWindowState: false, autoShow: true, defaultCentered: true}
        },
        () => {
            app.run();
            numTabbedWindows++;
        },
        console.error);
}

function updateTextArea(content: {}): void {
    const textArea = document.getElementById('showLayout') as HTMLTextAreaElement;
    textArea.value = JSON.stringify(content, null, 2);
}

function addLayoutNamesToDropdown() {
    const ids = Storage.getAllLayoutIDs();
    const layoutSelect = document.getElementById('layoutSelect');
    ids.forEach((id) => {
        const option = createOptionElement(id);
        if (layoutSelect) {
            layoutSelect.appendChild(option);
        }
    });
}

function createOptionElement(id: string) {
    const option = document.createElement('option');
    option.value = id;
    option.innerHTML = id;
    return option;
}

export function importLayout() {
    const textfield = document.getElementById('showLayout') as HTMLTextAreaElement;
    const layout = JSON.parse(textfield.value);
    setLayout(layout.layout || layout);
}

workspaces.ready();

fin.desktop.main(() => {
    addLayoutNamesToDropdown();
});

// Expose layouts API on window for debugging/demoing
const api = {
    register,
    deregister,
    snapAndDock,
    tabbing,
    tabstrip,
    workspaces
};
(window as Window & {layouts: typeof api}).layouts = api;
