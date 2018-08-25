import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {TabAPIActions, TabAPIWindowActions} from '../../client/APITypes';
import {TabAPIDragMessage, TabAPIInteractionMessage, TabAPIMessage, TabAPIReorderMessage, TabClientConfig, TabIdentifier, TabPackage, TabProperties} from '../../client/types';

import {Tab} from './Tab';
import {TabGroup} from './TabGroup';
import {TabService} from './TabService';
import {createTabGroupsFromMultipleWindows, ejectTab} from './TabUtilities';

/**
 * Handles all calls from tab api to service
 */
export class APIHandler {
    /**
     * The tab service itself
     */
    private mTabService: TabService;

    /**
     * @constructor Constructor for the TabAPIActionProcessor
     */
    constructor(service: TabService) {
        this.mTabService = service;
    }

    // /**
    //  * Processes incoming API messages from the Tab API.
    //  * @param message The payload the tab api sent
    //  * @param uuid uuid of the sender
    //  * @param name name of the sender
    //  */
    // private process(message: TabAPIMessage, uuid: string, name: string): void {
    //     const tabGroup: TabGroup|undefined = this.mTabService.getTabGroup(name);
    //     console.log(message);
    //     if (!tabGroup) {
    //         console.error('No tab group has been found wit hthe name');
    //         return;
    //     }

    //     switch (message.action) {
    //         case TabAPIActions.ADD:
    //             this._add(message as TabAPIInteractionMessage, tabGroup);
    //             break;
    //         case TabAPIActions.EJECT:
    //             this._eject(message as TabAPIInteractionMessage, tabGroup);
    //             break;
    //         case TabAPIActions.CLOSE:
    //             this._close(message as TabAPIInteractionMessage, tabGroup);
    //             break;
    //         case TabAPIWindowActions.MAXIMIZE:
    //             tabGroup.window.maximizeGroup();
    //             break;
    //         case TabAPIWindowActions.MINIMIZE:
    //             tabGroup.window.minimizeGroup();
    //             break;
    //         case TabAPIWindowActions.CLOSE:
    //             tabGroup.window.closeGroup();
    //             break;
    //         case TabAPIWindowActions.RESTORE:
    //             tabGroup.window.restoreGroup();
    //             break;
    //         case TabAPIActions.ACTIVATE:
    //             this._activate(message as TabAPIInteractionMessage, tabGroup);
    //             break;
    //         case TabAPIActions.UPDATEPROPERTIES:
    //             this._updateTabProperties(message as TabAPIInteractionMessage, tabGroup);
    //             break;
    //         case TabAPIActions.STARTDRAG:
    //             this._startDrag({uuid, name});
    //             break;
    //         case TabAPIActions.ENDDRAG:
    //             this._endDrag(message as TabAPIDragMessage, tabGroup);
    //             break;
    //         case TabAPIActions.TABSREORDERED:
    //             this._tabsReordered(message as TabAPIReorderMessage, tabGroup);
    //             break;
    //         case TabAPIWindowActions.TOGGLEMAXIMIZE:
    //             tabGroup.window.toggleMaximize();
    //             break;
    //         default:
    //             break;
    //     }
    // }

    // /**
    //  * Starts the drag window process & shows the drag window overlay.
    //  */
    // public async startDrag(source: TabIdentifier) {
    //     //TODO assign uuid, name from provider
    //     this.mTabService.dragWindowManager.showWindow(source);
    // }

    // /**
    //  * Handles when the UI component reorders its tabs.  Needed for save and restore.
    //  * @param message The array of tabs to sort by.
    //  * @param group The TabGroup attached to this call.
    //  */
    // public tabsReordered(message: TabAPIReorderMessage, group: TabGroup) {
    //     group.reOrderTabArray(message.tabOrder);
    // }

    // /**
    //  * Ends the drag window process & hides the drag window overlay.
    //  * @param {{}}message None.
    //  * @param {TabGroup} group The TabGroup attached to this Tab.
    //  */
    // public async endDrag(message: TabAPIDragMessage, group: TabGroup) {
    //     if (!message.event) {
    //         console.warn('No drag event passed. Cancelling eject');
    //         return;
    //     }

    //     if (!message.uuid || !message.name) {
    //         console.error('No valid tabID has been passed in');
    //         return;
    //     }
    //     this.mTabService.dragWindowManager.hideWindow();

    //     ejectTab(this.mTabService, {uuid: message.uuid, name: message.name, screenX: message.event.screenX, screenY: message.event.screenY}, group);
    // }

    // /**
    //  * This adds an application to a tabgroup
    //  * @param {TabAPIInteractionMessage} applicationToAttach The application to be attached
    //  * @param {TabGroup} tabGroup The tab group to attach the application to
    //  */
    // public async add(applicationToAttach: TabAPIInteractionMessage, tabGroup: TabGroup|undefined): Promise<Tab | undefined> {
    //     if (!applicationToAttach) {
    //         console.error('No application has been passed in');
    //         return;
    //     }

    //     if (!tabGroup) {
    //         console.error('No tab group has been passed in');
    //         return;
    //     }

    //     const tabPackage: TabPackage = {tabID: {uuid: applicationToAttach.uuid, name: applicationToAttach.name}, tabProps: applicationToAttach.properties};

    //     const existingTab = await this.mTabService.getTab({uuid: tabPackage.tabID.uuid, name: tabPackage.tabID.name});

    //     if (existingTab) {
    //         if (existingTab.tabGroup === tabGroup) {
    //             console.error('Error:  Tab already exists in this tab group!');
    //             return;
    //         }

    //         await existingTab.tabGroup.removeTab({uuid: tabPackage.tabID.uuid, name: tabPackage.tabID.name}, false, true);
    //     }

    //     return tabGroup.addTab(tabPackage);
    // }

    // /**
    //  * Ejects a tab from tab group
    //  * @param {TabAPIInteractionMessage} applicationToEject The application to eject from the tab group
    //  * @param {TabGroup} tabGroup The tab group to eject from
    //  */
    // public async eject(applicationToEject: TabAPIInteractionMessage, tabGroup: TabGroup|undefined): Promise<void> {
    //     if (!applicationToEject) {
    //         console.error('No application has been passed in');
    //         return;
    //     }

    //     if (!tabGroup) {
    //         console.error('No tab group has been passed in');
    //         return;
    //     }

    //     return ejectTab(this.mTabService, {name: applicationToEject.name, uuid: applicationToEject.uuid}, tabGroup);
    // }

    // /**
    //  * Closes the tab and the application itself
    //  * @param {TabAPIInteractionMessage} applicationToClose The application to close
    //  * @param {TabGroup} tabGroup The group the application is within
    //  */
    // public async close(applicationToClose: TabAPIInteractionMessage, tabGroup: TabGroup|undefined) {
    //     if (!applicationToClose) {
    //         console.error('No application has been passed in');
    //         return;
    //     }

    //     if (!tabGroup) {
    //         console.error('No tab group has been passed in');
    //         return;
    //     }

    //     return tabGroup.removeTab({uuid: applicationToClose.uuid, name: applicationToClose.name}, true, true);
    // }

    // /**
    //  * Activates the tab being selected and brings it to the front
    //  * @param {TabAPIInteractionMessage} applicationToActivate The application to be activated
    //  * @param {TabGroup} tabGroup The tab group the application is in
    //  */
    // public async activate(applicationToActivate: TabAPIInteractionMessage, tabGroup: TabGroup|undefined) {
    //     if (!applicationToActivate) {
    //         console.error('No application has been passed in');
    //         return;
    //     }

    //     if (!tabGroup) {
    //         console.error('No tab group has been passed in');
    //         return;
    //     }

    //     return tabGroup.switchTab({name: applicationToActivate.name, uuid: applicationToActivate.uuid});
    // }

    // /**
    //  * Updates the properties of the tab
    //  * @param {TabAPIInteractionMessage} tabToUpdate Holds information about the tab to update and its new properties
    //  * @param {TabGroup} tabGroup The group the tab is in
    //  */
    // public async updateTabProperties(tabToUpdate: TabAPIInteractionMessage, tabGroup: TabGroup|undefined) {
    //     if (!tabToUpdate) {
    //         console.error('No tab to update has beed passed in');
    //         return;
    //     }

    //     if (!tabGroup) {
    //         console.error('No tab group has been passed in');
    //         return;
    //     }

    //     if (!tabToUpdate.properties) {
    //         console.error('No tab properties to update');
    //         return;
    //     }

    //     const tab: Tab|undefined = tabGroup.getTab({uuid: tabToUpdate.uuid, name: tabToUpdate.name});

    //     if (!tab) {
    //         console.error('No tab has been found');
    //         return;
    //     }

    //     return tab.updateTabProperties(tabToUpdate.properties);
    // }

    public setTabClient(payload: {url: string, config: TabClientConfig}) {
        // TODO: SETTABCLIENT
    }

    public getTabs(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);

        if (!group) {
            return null;
        }

        return group.tabs.map(tab => tab.ID);
    }

    public async createTabGroup(windows: TabIdentifier[]) {
        const group = await this.mTabService.getTabGroupByApp(windows[0]);
        return Promise.all(windows.map(async (window) => {
            group!.addTab({tabID: window});
        }));
    }

    public addTab(payload: {targetWindow: TabIdentifier, windowToAdd: TabIdentifier}) {
        const group = this.mTabService.getTabGroupByApp(payload.targetWindow);

        if (group!.getTab(payload.targetWindow)) {
            return Promise.reject('Tab already exists in group');
        }

        return group!.addTab({tabID: payload.windowToAdd});
    }

    public removeTab(window: TabIdentifier): Promise<void> {
        return ejectTab(this.mTabService, {name: window.name, uuid: window.uuid});
    }

    public setActiveTab(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);

        if (!group) {
            return Promise.reject('No group found');
        }

        return group.switchTab(window);
    }

    public closeTab(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);

        if (!group) {
            return Promise.reject('No group found');
        }

        return group.removeTab(window, true);
    }

    public minimizeTabGroup(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);
        if (!group) {
            return Promise.reject('No group found');
        }

        return group.window.minimizeGroup();
    }

    public maximizeTabGroup(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);
        if (!group) {
            return Promise.reject('No group found');
        }

        return group.window.maximizeGroup();
    }

    public closeTabGroup(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);
        if (!group) {
            return Promise.reject('No group found');
        }

        return group.removeAllTabs(true);
    }

    public restoreTabGroup(window: TabIdentifier) {
        const group = this.mTabService.getTabGroupByApp(window);
        if (!group) {
            return Promise.reject('No group found');
        }

        return group.window.restoreGroup();
    }

    public reorderTabs(payload: {newOrdering: TabIdentifier[], id: TabIdentifier}) {
        const group = this.mTabService.getTabGroupByApp(payload.id);
        if (!group) {
            return Promise.reject('No group found');
        }

        return group.reOrderTabArray(payload.newOrdering);
    }

    public updateTabProperties(payload: {window: TabIdentifier, properties: TabProperties}) {
        const tab = this.mTabService.getTab(payload.window);

        if (!tab) {
            return Promise.reject('No Tab Found');
        }

        return tab.updateTabProperties(payload.properties);
    }

    public startDrag({}, id: TabIdentifier) {
        // TODO assign uuid, name from provider
        this.mTabService.dragWindowManager.showWindow(id);
    }

    public async endDrag(payload: {event: DragEvent, window: TabIdentifier}) {
        this.mTabService.dragWindowManager.hideWindow();

        ejectTab(this.mTabService, {uuid: payload.window.uuid, name: payload.window.name, screenX: payload.event.screenX, screenY: payload.event.screenY});
    }
}
