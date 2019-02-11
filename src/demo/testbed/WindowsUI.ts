import {Application, Identity} from 'hadouken-js-adapter';

import {ConfigurationObject, Rule, Tabstrip} from '../../../gen/provider/config/layouts-config';
import {IdentityRule} from '../../client/types';
import {ConfigWithRules, ScopedConfig, Scopes} from '../../provider/config/Store';

import {Elements} from './View';

// tslint:disable-next-line:no-any
declare const $: any;

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
    tabstripUrl: string;
    tabstripHeight: number;
}
interface ManifestData extends AppData {
    config: ConfigData;
}

interface ConfigRule {
    caption: string;
    tab: HTMLLIElement;
    tabLink: HTMLSpanElement;
    scope: IdentityRule;
    config: Partial<ConfigData>;
}

export class WindowsUI {
    private static INITIAL_CONFIG: Partial<ConfigData> = {tabstripHeight: 60};

    private _elements: Elements;

    private _defaultConfig: Partial<ConfigData>;
    private _rules: ConfigRule[];

    private _selectedRule: ConfigRule|null;

    constructor(elements: Elements) {
        this._elements = elements;
        this._defaultConfig = {};
        this._selectedRule = null;
        this._rules = [];

        elements.createApplication.onclick = () => {
            // Reset form
            this._defaultConfig = {...WindowsUI.INITIAL_CONFIG};
            this._rules.length = 0;
            this.updateUUID();
            this.updateConfig();
        };
        elements.inputManifestTab.onclick = () => {
            elements.inputManifestTab.classList.add('active');
            elements.inputProgrammaticTab.classList.remove('active');
            elements.inputManifestOptions.classList.replace('d-none', 'd-block');
            elements.inputProgrammaticOptions.classList.replace('d-block', 'd-none');
        };
        elements.inputProgrammaticTab.onclick = () => {
            elements.inputManifestTab.classList.remove('active');
            elements.inputProgrammaticTab.classList.add('active');
            elements.inputManifestOptions.classList.replace('d-block', 'd-none');
            elements.inputProgrammaticOptions.classList.replace('d-none', 'd-block');
        };
        elements.inputEditConfig.onclick = () => {
            this.selectRule(null);
            elements.inputConfigEditor.classList.remove('d-none');
        };
        elements.inputSaveConfig.onclick = () => {
            this.updateConfig();
            elements.inputConfigEditor.classList.add('d-none');
        };
        elements.configEditorApp.onclick = () => {
            this.selectRule(null);
        };
        elements.configEditorAddRule.onclick = () => {
            this.addRule();
        };

        // Listen for requests to spawn child windows/applications
        const source = {uuid: 'Layouts-Manager'};
        fin.InterApplicationBus.subscribe(source, 'createAppFromManifest', this.createChildAppFromManifest.bind(this));
        fin.InterApplicationBus.subscribe(source, 'createAppFromOptions', this.createChildAppFromOptions.bind(this));
        fin.InterApplicationBus.subscribe(source, 'createWindow', this.createChildWindow.bind(this));

        $('#inputURL').editableSelect({filter: false});
    }

    private async createChildAppFromManifest(manifest: string): Promise<Identity> {
        return this.startApp(fin.Application.createFromManifest(manifest));
    }

    private async createChildAppFromOptions(options: fin.ApplicationOptions): Promise<Identity> {
        return this.startApp(fin.Application.create(options));
    }

    private async startApp(appPromise: Promise<Application>): Promise<Identity> {
        const app = await appPromise;
        await app.run();
        return app.identity;
    }

    private async createChildWindow(options: fin.WindowOptions): Promise<Identity> {
        const rootDir = location.href.slice(0, location.href.lastIndexOf('/'));
        const window = await fin.Window.create({
            url: options.url || `${rootDir}/testbed/index.html`,
            autoShow: true,
            defaultHeight: options.defaultHeight,
            defaultWidth: options.defaultWidth,
            defaultLeft: options.defaultLeft,
            defaultTop: options.defaultTop,
            saveWindowState: options.saveWindowState,
            frame: options.frame,
            name: options.name
        });

        return window.identity;
    }

    private updateUUID(): void {
        const input = this._elements.inputUUID;

        if (input.value.startsWith('custom-app-')) {
            input.value = `custom-app-${Math.random().toString(36).substr(2, 4)}`;
        }
    }

    private updateConfig(): void {
        const preview = this._elements.inputConfig;

        if (preview) {
            // Update active rule with form data
            const data: Partial<ConfigData> = this.getInputs<ConfigData>();
            if (this._selectedRule) {
                this._selectedRule.config = data;
            } else {
                this._defaultConfig = data;
            }

            // Update config JSON preview
            const config: ConfigWithRules<ConfigurationObject>|null = this.getConfig(this._defaultConfig);
            const activeRules: ConfigRule[] = this._rules.filter(rule => Object.keys(rule.config).length > 0);
            if (config && activeRules.length > 0) {
                config.rules = activeRules.map(rule => ({scope: {level: 'window', ...rule.scope} as Rule, config: this.getConfig(rule.config) || {}}));
            }
            preview.innerText = config ? JSON.stringify(config, null, 4) : 'No Config';
        }
    }

    private addRule(): void {
        const prevRule = this._rules[this._rules.length - 1];
        const caption = `Rule ${prevRule ? Number.parseInt(/\d+/.exec(prevRule.caption)![0], 10) + 1 : 1}`;

        const tab = document.createElement('li');
        tab.classList.add('nav-item');
        tab.innerHTML = `<span class="nav-link">
            <a href="#">${caption}</a>
            <a href="#"><i class="fa fa-times-circle text-danger"></i></a>
        </span>`;
        this._elements.configEditorRules.insertBefore(tab, this._elements.configEditorAddRule.parentElement);

        const links = tab.getElementsByTagName('a');
        const rule = {caption, scope: {uuid: '', name: ''}, config: {...WindowsUI.INITIAL_CONFIG}, tab, tabLink: tab.firstElementChild as HTMLSpanElement};
        this._rules.push(rule);

        links[0].onclick = () => {
            this.selectRule(rule);
        };
        links[1].onclick = () => {
            this.removeRule(rule);
        };

        this.selectRule(rule);
    }

    private selectRule(selectedRule: ConfigRule|null): void {
        const elements = this._elements;

        elements.configEditorApp.classList.toggle('active', !selectedRule);
        this._rules.forEach((rule: ConfigRule) => {
            rule.tabLink.classList.toggle('active', rule === selectedRule);
        });

        this.updateConfig();
        this._selectedRule = selectedRule;

        const config = selectedRule ? selectedRule.config : this._defaultConfig;
        elements.configEnabled.value = config.enabled !== undefined ? config.enabled.toString() : 'default';
        elements.configSnap.value = config.snap !== undefined ? config.snap.toString() : 'default';
        elements.configTab.value = config.tab !== undefined ? config.tab.toString() : 'default';
        elements.configTabstripUrl.value = config.tabstripUrl || '';
        elements.configTabstripHeight.value = config.tabstripHeight ? config.tabstripHeight.toString() : '0';
    }

    private removeRule(rule: ConfigRule): void {
        const index: number = this._rules.indexOf(rule);

        if (index >= 0) {
            this._rules.splice(index, 1);
            rule.tab.remove();

            if (rule === this._selectedRule) {
                this.selectRule(this._rules[index] || this._rules[index - 1] || null);
            }
        }
    }

    private getConfig(data: Partial<ConfigData>): ConfigurationObject|null {
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
                case 'tabstripUrl':
                case 'tabstripHeight':
                    config.tabstrip = config.tabstrip || {} as Tabstrip;
                    config.tabstrip[param.replace('tabstrip', '').toLowerCase() as keyof Tabstrip] = data[param] as number | string;
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

    private getInputs<T>(): Partial<T> {
        const elements = this._elements;
        const inputs: {[key: string]: HTMLInputElement|HTMLSelectElement} = {
            enabled: elements.configEnabled,
            snap: elements.configSnap,
            dock: elements.configDock,
            tab: elements.configTab,
            tabstripHeight: elements.configTabstripHeight,
            tabstripUrl: elements.configTabstripUrl,
        };

        return Object.keys(inputs).reduce((data: T, key: string) => {
            const input: HTMLInputElement|HTMLSelectElement = inputs[key];

            if (input) {
                let value = input.type === 'checkbox' ? (input as HTMLInputElement).checked : input.value;

                // Special handling of certain elements
                if (input === elements.inputURL) {
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
}
