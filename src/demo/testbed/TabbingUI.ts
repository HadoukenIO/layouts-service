import {WindowInfo} from 'hadouken-js-adapter/out/types/src/api/system/window';

import {tabbing} from '../../client/main';
import {TabAddedEvent, TabRemovedEvent} from '../../client/tabbing';
import {WindowIdentity} from '../../client/types';

import {Messages} from '.';
import {EventsUI} from './EventsUI';
import {Elements} from './View';

class Dropdown {
    private _button: HTMLButtonElement;
    private _list: HTMLDivElement;

    public header?: string;
    public placeholder?: string;

    public dataProvider?: (() => Promise<WindowIdentity[]>);
    public onSelect?: ((item: WindowIdentity) => void);

    constructor(button: HTMLButtonElement, list: HTMLDivElement) {
        this._button = button;
        this._list = list;

        this._button.onclick = this.openDropdown.bind(this);
    }

    public set active(value: boolean) {
        this._button.classList.toggle('btn-primary', value);
        this._button.classList.toggle('btn-secondary', !value);
    }

    private async openDropdown(): Promise<void> {
        if (this.dataProvider) {
            // Clear dropdown
            if (this.header) {
                this._list.innerHTML = `<h6 class="dropdown-header border-bottom">${this.header}</h6>`;
            } else {
                this._list.innerHTML = '';
            }

            // Populate dropdown
            const data = await this.dataProvider();
            data.forEach((identity: WindowIdentity) => {
                const element = document.createElement('a');
                element.classList.add('dropdown-item');
                element.href = '#';
                element.onclick = () => {
                    if (this.onSelect) {
                        this.onSelect(identity);
                    }
                };
                element.innerText = `${identity.uuid} / ${identity.name}`;

                this._list.appendChild(element);
            });

            // Show placeholder if list is empty
            if (data.length === 0 && this.placeholder) {
                const element = document.createElement('a');
                element.classList.add('dropdown-item', 'disabled');
                element.href = '#';
                element.innerHTML = this.placeholder;

                this._list.appendChild(element);
            }
        }
    }
}

export class TabbingUI {
    private _addToGroup!: Dropdown;
    private _createGroup!: Dropdown;

    private _log: EventsUI;

    constructor(elements: Elements, log: EventsUI) {
        elements.removeTab.addEventListener('click', () => {
            const promise: Promise<void> = tabbing.removeTab();
            log.addApiCall(promise, tabbing.removeTab);
        });
        elements.closeTab.addEventListener('click', () => {
            const promise: Promise<void> = tabbing.closeTab();
            log.addApiCall(promise, tabbing.closeTab);
        });
        elements.minimizeTabGroup.addEventListener('click', () => {
            const promise: Promise<void> = tabbing.minimizeTabGroup();
            log.addApiCall(promise, tabbing.minimizeTabGroup);
        });
        elements.maximizeTabGroup.addEventListener('click', () => {
            const promise: Promise<void> = tabbing.maximizeTabGroup();
            log.addApiCall(promise, tabbing.maximizeTabGroup);
        });
        elements.restoreTabGroup.addEventListener('click', () => {
            const promise: Promise<void> = tabbing.restoreTabGroup();
            log.addApiCall(promise, tabbing.restoreTabGroup);
        });
        elements.closeTabGroup.addEventListener('click', () => {
            const promise: Promise<void> = tabbing.removeTab();
            log.addApiCall(promise, tabbing.removeTab);
        });

        this._addToGroup = new Dropdown(elements.addTab, elements.addTabDropdown);
        this._addToGroup.header = 'Tabbed Windows';
        this._addToGroup.placeholder = 'No tabbed windows<br />(Use \'Create Tab Group\')';
        this._addToGroup.dataProvider = this.getTabbedWindows.bind(this);
        this._addToGroup.onSelect = (identity: WindowIdentity) => {
            const promise: Promise<void> = tabbing.addTab(identity);

            this._log.addApiCall(promise, tabbing.addTab, identity);
        };

        this._createGroup = new Dropdown(elements.createTabGroup, elements.createTabGroupDropdown);
        this._createGroup.header = 'Untabbed Windows';
        this._createGroup.placeholder = 'No Untabbed Windows<br />(Use \'Add to Tab Group\' or create another window)';
        this._createGroup.dataProvider = this.getUntabbedWindows.bind(this);
        this._createGroup.onSelect = (identity: WindowIdentity) => {
            const promise: Promise<void> = tabbing.createTabGroup([fin.Window.me, identity]);

            this._log.addApiCall(promise, tabbing.createTabGroup, [fin.Window.me, identity]);
        };

        this._log = log;

        this.onTabEvent = this.onTabEvent.bind(this);
        tabbing.addEventListener('tab-added', this.onTabEvent);
        tabbing.addEventListener('tab-removed', this.onTabEvent);
    }

    private async onTabEvent(event: TabAddedEvent|TabRemovedEvent): Promise<void> {
        const isTabbed: boolean = (event.type === 'tab-added');
        const message: string = isTabbed ? Messages.STATUS_TABBED : Messages.STATUS_UNTABBED;

        document.body.classList.toggle('tabbed', isTabbed);
        document.getElementById('tab-status')!.innerText = message;

        this._log.addEvent(event);
    }

    private async getWindowsMatching(filter: (identity: WindowIdentity) => Promise<boolean>): Promise<WindowIdentity[]> {
        const windowInfo: WindowInfo[] = await fin.System.getAllWindows();
        const identities = windowInfo.reduce((identities: WindowIdentity[], window: WindowInfo) => {
            if (window.uuid !== 'layouts-service') {
                // Add main window
                identities.push({uuid: window.uuid, name: window.mainWindow.name});

                // Add child windows
                window.childWindows.forEach(child => {
                    identities.push({uuid: window.uuid, name: child.name});
                });
            }

            return identities;
        }, []);
        const filters: boolean[] = await Promise.all(identities.map(filter));

        return identities.filter((identity, index) => filters[index]).sort((a, b) => {
            if (a.uuid !== b.uuid) {
                return a.uuid < b.uuid ? -1 : 1;
            } else if (a.name !== b.name) {
                return a.name < b.name ? -1 : 1;
            } else {
                return 0;
            }
        });
    }

    private async getTabbedWindows(): Promise<WindowIdentity[]> {
        return this.getWindowsMatching(async (identity: WindowIdentity) => {
            const tabs: WindowIdentity[]|null = await tabbing.getTabs(identity);
            return tabs !== null;
        });
    }

    private async getUntabbedWindows(): Promise<WindowIdentity[]> {
        return this.getWindowsMatching(async (identity: WindowIdentity) => {
            const tabs: WindowIdentity[]|null = await tabbing.getTabs(identity);
            return tabs === null;
        });
    }
}
