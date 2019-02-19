import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/system/application';

import {ConfigurationObject, Rule, Tabstrip} from '../../../gen/provider/config/layouts-config';
import {RegEx} from '../../client/types';
import {ConfigWithRules, ScopedConfig, Scopes} from '../../provider/config/Store';
import {AppData, createApp, createWindow, Omit, WindowData} from '../spawn';

import {Elements} from './View';

// tslint:disable-next-line:no-any
declare const $: any;

interface ConfigData {
    enabled: boolean;
    snap: boolean;
    dock: boolean;
    tab: boolean;
    tabstripUrl: string;
    tabstripHeight: number;
}

type ConfigScopeParam = string|(RegEx&{raw: string});
interface ConfigScope {
    level: Scopes;
    uuid: ConfigScopeParam;
    name: ConfigScopeParam;
}

interface ConfigRule {
    caption: string;
    tab: HTMLLIElement;
    tabLink: HTMLSpanElement;
    scope: ConfigScope;
    config: Partial<ConfigData>;
}

type Inputs<T> = {
    // Map all keys to a HTML input control - except for 'type', which should be excluded from the type.
    [K in keyof T]?: HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
};

export class WindowsUI {
    private static INITIAL_CONFIG: Partial<ConfigData> = {tabstripHeight: 60};
    private static SCOPE_DESCRIPTIONS: {[level: string]: string} = {
        'app': '<p>No Scope</p><p>Will apply to every registered window of the application about to be created</p>',
        'desktop': '<p>Desktop Scope</p><p>Will apply to every window that is registered with the service</p>',
        'application': '<p>Application Scope</p><p>Will apply to every registered window of any application matching the UUID string/regex</p>',
        'window': '<p>Window Scope</p><p>Will apply to every registered withind that matches the UUID and Name strings/regexes</p>'
    };

    private _elements: Elements;
    private _configInputs: Inputs<ConfigData>;
    private _manifestInputs: Inputs<AppData>;
    private _programmaticInputs: Inputs<AppData>;

    private _defaultConfig: Partial<ConfigData>;
    private _rules: ConfigRule[];

    private _selectedRule: ConfigRule|null;

    constructor(elements: Elements) {
        this._elements = elements;
        this._defaultConfig = {};
        this._selectedRule = null;
        this._rules = [];

        this._configInputs = {
            enabled: elements.configEnabled,
            snap: elements.configSnap,
            dock: elements.configDock,
            tab: elements.configTab,
            tabstripHeight: elements.configTabstripHeight,
            tabstripUrl: elements.configTabstripUrl
        };
        this._manifestInputs = {
            id: elements.inputID,
            url: elements.inputURL,
            queryArgs: elements.inputSection,
            frame: elements.inputFrame,
            size: elements.inputSize,
            sizeOffset: elements.inputSizeRandomize,
            useService: elements.inputUseService,
            runtime: elements.inputRuntime,
            realm: elements.inputRealmName,
            enableMesh: elements.inputEnableMesh,
            config: elements.inputConfig
        };
        this._programmaticInputs = {
            id: elements.inputID,
            url: elements.inputURL,
            queryArgs: elements.inputSection,
            frame: elements.inputFrame,
            size: elements.inputSize,
            sizeOffset: elements.inputSizeRandomize,
            parent: elements.inputParent
        };

        elements.createApplication.addEventListener('click', () => {
            elements.inputConfigEditor.classList.add('d-none');
            elements.modal.classList.replace('modal-window', 'modal-application');

            // Reset form
            this._defaultConfig = {...WindowsUI.INITIAL_CONFIG};
            this._rules.length = 0;
            this.selectRule(null, false);

            this.updateID();
            this.updateConfig();
            $('#modalCreate').modal('show');
        });
        elements.createWindow.addEventListener('click', () => {
            elements.inputConfigEditor.classList.add('d-none');
            elements.modal.classList.replace('modal-application', 'modal-window');

            this.updateID();
            this.updateConfig();
            $('#modalCreate').modal('show');
        });
        elements.inputManifestTab.onclick = () => {
            elements.inputManifestTab.classList.add('active');
            elements.inputProgrammaticTab.classList.remove('active');
            elements.inputManifestOptions.classList.replace('d-none', 'd-block');
            elements.inputProgrammaticOptions.classList.replace('d-block', 'd-none');
            this.updateID();
        };
        elements.inputProgrammaticTab.onclick = () => {
            elements.inputManifestTab.classList.remove('active');
            elements.inputProgrammaticTab.classList.add('active');
            elements.inputManifestOptions.classList.replace('d-block', 'd-none');
            elements.inputProgrammaticOptions.classList.replace('d-none', 'd-block');
            this.updateID();
        };
        elements.inputEditConfig.onclick = () => {
            this.selectRule(null);
            elements.inputConfigEditor.classList.remove('d-none');
        };
        elements.inputSaveConfig.onclick = () => {
            this.updateConfig();
            elements.inputConfigEditor.classList.add('d-none');
        };
        elements.inputUseService.onchange = () => {
            const serviceEnabled = (this._elements.inputUseService.value === 'true');
            elements.inputEditConfig.disabled = !serviceEnabled;
            elements.inputConfig.disabled = !serviceEnabled;
            this.updateConfig();
        };
        elements.inputParent.onchange = () => {
            this.updateID();
        };
        elements.configEditorApp.onclick = () => {
            this.selectRule(null);
        };
        elements.configEditorAddRule.onclick = () => {
            this.addRule();
        };
        elements.configUUID.oninput = () => {
            this.updateScope();
        };
        elements.configName.oninput = () => {
            this.updateScope();
        };
        elements.inputCreate.onclick = () => {
            this.create();
        };
        elements.inputCreateAndClose.onclick = async () => {
            await this.create();
            $('#modalCreate').modal('hide');
        };

        // Keep 'parent' dropdown in programmatic app modal populated with list of active apps
        function addToDropdown(uuid: string): void {
            if (uuid !== 'layouts-service') {
                const item = document.createElement('option');
                item.innerText = uuid;
                item.selected = (uuid === fin.Application.me.uuid);
                elements.inputParent.appendChild(item);

                fin.Application.wrapSync({uuid}).once('closed', () => {
                    item.remove();
                });
            }
        }
        fin.System.addListener('application-created', (event) => {
            addToDropdown(event.uuid);
        });
        fin.System.getAllApplications().then((info: ApplicationInfo[]) => {
            const uuids = info.filter(i => i.isRunning).map(i => i.uuid).sort();
            uuids.forEach(addToDropdown);
        });

        $('#inputURL').editableSelect({filter: false}).on('select.editable-select', () => {
            const isTestbed = ($('#inputURL').val().endsWith('/demo/testbed/index.html'));
            elements.inputSection.disabled = !isTestbed;
        });
        $('[data-toggle="tooltip"]').tooltip();
    }

    private get isManifest(): boolean {
        return this._elements.inputManifestTab.classList.contains('active');
    }

    private get isApplication(): boolean {
        return this._elements.modal.classList.contains('modal-application');
    }

    private async create(): Promise<void> {
        if (this.isApplication) {
            // If config form is currently open, apply any changes before creating application
            this.updateConfig();

            // Create new application
            const isManifest: boolean = this.isManifest;
            const data: AppData = this.getInputs<AppData>(isManifest ? this._manifestInputs : this._programmaticInputs);
            await createApp({type: isManifest ? 'manifest' : 'programmatic', ...data});
        } else {
            const data: WindowData = this.getInputs<WindowData>(this._programmaticInputs);
            await createWindow(data);
        }

        this.updateID();
    }

    private updateID(): void {
        const input = this._elements.inputID;
        const parent = this._elements.inputParent;
        const value = input.value;
        const isDefault =
            !value || value.startsWith('app-') || value.startsWith('win-') || Array.from(parent.options).find(o => value.startsWith(`${o.value}-`));

        if (isDefault) {
            if (this.isApplication) {
                const isManifest: boolean = this.isManifest;
                const prefix = isManifest ? 'app-' : `${parent.value}-`;

                input.value = `${prefix}${Math.random().toString(36).substr(2, 4)}`;
            } else {
                input.value = `win-${Math.random().toString(36).substr(2, 4)}`;
            }
        }
    }

    private updateConfig(): void {
        const preview = this._elements.inputConfig;

        if (this.getInputs<AppData>(this._manifestInputs).useService) {
            // Update active rule with form data
            const data: Partial<ConfigData> = this.getInputs<ConfigData>(this._configInputs);
            if (this._selectedRule) {
                this._selectedRule.config = data;
            } else {
                this._defaultConfig = data;
            }

            // Update config JSON preview
            const config: ConfigWithRules<ConfigurationObject>|null = this.getConfig();
            preview.innerText = config ? JSON.stringify(config, null, 4) : 'No Config';
        } else {
            preview.innerText = 'No service declaration, cannot specify config';
        }
    }

    private parseScope(scope: ConfigScope): Rule {
        const level = scope.level;

        switch (level) {
            case 'application':
                return {level, uuid: this.parseConfigParam(scope.uuid)};
            case 'window':
                return {level, uuid: this.parseConfigParam(scope.uuid), name: this.parseConfigParam(scope.name)};
            default:
                return {level};
        }
    }

    private parseConfigParam(param: ConfigScopeParam): string|RegEx {
        if (typeof param === 'string') {
            return param;
        } else {
            const {raw, ...rest} = param;
            return rest;
        }
    }

    private updateScope(): void {
        const rule = this._selectedRule;

        if (rule) {
            const inputs = [this._elements.configUUID, this._elements.configName];
            const regexMatcher = /^\/(.+)\/([igm!]*)$/;
            const keys: (keyof ConfigScope)[] = ['uuid', 'name'];
            const scope = rule.scope;

            // Highlight if input is a regex
            inputs.forEach((input: HTMLInputElement, index: number) => {
                const match = regexMatcher.exec(input.value);

                if (match) {
                    const [raw, expression, flags] = match;
                    const pattern: ConfigScopeParam = {expression, raw};

                    if (flags.includes('!')) {
                        pattern.invert = true;
                    }
                    if (flags.length > 0 && flags !== '!') {
                        pattern.flags = flags.replace('!', '');
                    }
                    scope[keys[index]] = pattern;
                } else {
                    scope[keys[index]] = input.value;
                }
            });

            // Determine level
            if (scope.uuid && scope.name) {
                scope.level = 'window';
            } else if (scope.uuid) {
                scope.level = 'application';
            } else {
                scope.level = 'desktop';
            }
        }

        this.updateScopeUI();
    }

    private updateScopeUI(): void {
        const inputs = [this._elements.configUUID, this._elements.configName];
        const keys: (keyof ConfigScope)[] = ['uuid', 'name'];
        const rule = this._selectedRule;
        const hasRule = !!rule;
        const level: Scopes = rule ? rule.scope.level : 'application';

        // Determine level
        inputs.forEach((input, index) => {
            input.classList.toggle('pattern', rule ? (typeof rule.scope[keys[index]] !== 'string') : false);
        });

        // Update badge
        const scopeShort: string = level.charAt(0).toUpperCase();
        const description: string = WindowsUI.SCOPE_DESCRIPTIONS[rule ? rule.scope.level : 'app'] || '';
        this._elements.configScope.innerText = scopeShort;
        this._elements.configScope.classList.toggle('badge-primary', hasRule);
        this._elements.configScope.classList.toggle('badge-secondary', !hasRule);
        this._elements.configScope.setAttribute('data-original-title', description);
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
        const rule: ConfigRule = {
            caption,
            scope: {level: 'desktop', uuid: '', name: ''},
            config: {...WindowsUI.INITIAL_CONFIG},
            tab,
            tabLink: tab.firstElementChild as HTMLSpanElement
        };
        this._rules.push(rule);

        links[0].onclick = () => {
            this.selectRule(rule);
        };
        links[1].onclick = () => {
            this.removeRule(rule);
        };

        this.selectRule(rule);
    }

    private selectRule(selectedRule: ConfigRule|null, savePrevious = true): void {
        const elements = this._elements;

        elements.configEditorApp.classList.toggle('active', !selectedRule);
        this._rules.forEach((rule: ConfigRule) => {
            rule.tabLink.classList.toggle('active', rule === selectedRule);
        });

        // Update selection (save previous rule, if necessary)
        const prevSelection: ConfigRule|null = this._selectedRule;
        if (savePrevious && (!prevSelection || this._rules.includes(prevSelection))) {
            this.updateConfig();
        }
        this._selectedRule = selectedRule;

        const config = selectedRule ? selectedRule.config : this._defaultConfig;
        elements.configEnabled.value = config.enabled !== undefined ? config.enabled.toString() : 'default';
        elements.configSnap.value = config.snap !== undefined ? config.snap.toString() : 'default';
        elements.configDock.value = config.dock !== undefined ? config.dock.toString() : 'default';
        elements.configTab.value = config.tab !== undefined ? config.tab.toString() : 'default';
        elements.configTabstripUrl.value = config.tabstripUrl || '';
        elements.configTabstripHeight.value = config.tabstripHeight ? config.tabstripHeight.toString() : '0';
        elements.configUUID.disabled = elements.configName.disabled = !selectedRule;
        if (selectedRule) {
            const {uuid, name} = selectedRule.scope;
            elements.configUUID.value = (typeof uuid === 'string') ? uuid : uuid.raw;
            elements.configName.value = (typeof name === 'string') ? name : name.raw;
        } else {
            elements.configUUID.value = elements.configName.value = '';
        }

        this.updateScopeUI();
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

    private getRuleConfig(data: Partial<ConfigData>): ConfigurationObject {
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

        return config;
    }

    private getConfig(): ConfigWithRules<ConfigurationObject>|null {
        const config: ConfigWithRules<ConfigurationObject> = this.getRuleConfig(this._defaultConfig);
        const rules: ScopedConfig<ConfigurationObject>[] =
            this._rules.map(rule => ({scope: this.parseScope(rule.scope), config: this.getRuleConfig(rule.config)}))
                .filter(rule => Object.keys(rule.config).length > 0);
        if (rules.length > 0) {
            config.rules = rules;
        }

        return (config.rules || Object.keys(config).length > 0) ? config : null;
    }

    private getInputs<T>(inputs: Inputs<T>): T {
        const elements = this._elements;
        const keys = Object.keys(inputs) as (keyof T)[];

        return keys.reduce((data: T, key: keyof T) => {
            const input: HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|undefined = inputs[key];

            if (input && !input.disabled) {
                let value: string|boolean|{} = input.type === 'checkbox' ? (input as HTMLInputElement).checked : input.value;

                // Special handling of certain elements
                if (input === elements.inputURL || input === elements.configTabstripUrl) {
                    if (value && !value.toString().includes('://')) {
                        // Assume this is a relative URL
                        value = `${location.origin}${value.toString().startsWith('/') ? '' : '/'}${value}`;
                    }
                } else if (input === elements.inputSize) {
                    // Convert `${width}x${height}` into Point
                    const dimensions = value.toString().split('x');
                    value = {x: Number.parseInt(dimensions[0], 10), y: Number.parseInt(dimensions[1], 10)};
                } else if (input === elements.inputParent) {
                    // Convert app UUID into Identity
                    value = {uuid: value};
                } else if (input === elements.inputSection) {
                    // Convert section string into query args object
                    value = {section: value};
                } else if (input === elements.inputConfig) {
                    // Replace formatted config preview with the actual config object
                    value = this.getConfig() || '';
                }

                // Parse value
                if (value !== undefined && value !== 'default') {
                    if (typeof value === 'boolean' || typeof value === 'object') {
                        (data[key] as unknown) = value;
                    } else if (value === 'true' || value === 'false') {
                        (data[key] as unknown) = (value === 'true');
                    } else if (typeof value === 'string' && Number.parseFloat(value).toString() === value) {
                        (data[key] as unknown) = Number.parseFloat(value);
                    } else {
                        (data[key] as unknown) = value;
                    }
                }
            }

            return data;
        }, {} as T);
    }
}
