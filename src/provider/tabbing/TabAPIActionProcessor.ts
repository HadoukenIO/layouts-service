import {TabAPIActions, TabAPIWindowActions} from '../../client/APITypes';
import {TabAPIDragMessage, TabAPIInteractionMessage, TabAPIMessage, TabIdentifier, TabPackage} from '../../client/types';

import {Tab} from './Tab';
import {TabGroup} from './TabGroup';
import {TabService} from './TabService';
import {ejectTab} from './TabUtilities';

/**
 * Handles all calls from tab api to service
 */
export class TabAPIActionProcessor {
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

    /**
     * Initialises the TabAPIActionProcessor
     */
    public init(): void {
        fin.desktop.InterApplicationBus.subscribe('*', 'tab-api', this.process.bind(this));
    }

    /**
     * Processes incoming API messages from the Tab API.
     * @param message The payload the tab api sent
     * @param uuid uuid of the sender
     * @param name name of the sender
     */
    private process(message: TabAPIMessage, uuid: string, name: string): void {
        const tabGroup: TabGroup|undefined = this.mTabService.getTabGroup(name);
        console.log(message);
        if (!tabGroup) {
            console.error('No tab group has been found wit hthe name');
            return;
        }

        switch (message.action) {
            case TabAPIActions.ADD:
                this._add(message as TabAPIInteractionMessage, tabGroup);
                break;
            case TabAPIActions.EJECT:
                this._eject(message as TabAPIInteractionMessage, tabGroup);
                break;
            case TabAPIActions.CLOSE:
                this._close(message as TabAPIInteractionMessage, tabGroup);
                break;
            case TabAPIWindowActions.MAXIMIZE:
                tabGroup.window.maximizeGroup();
                break;
            case TabAPIWindowActions.MINIMIZE:
                tabGroup.window.minimizeGroup();
                break;
            case TabAPIWindowActions.CLOSE:
                tabGroup.window.closeGroup();
                break;
            case TabAPIWindowActions.RESTORE:
                tabGroup.window.restoreGroup();
                break;
            case TabAPIActions.ACTIVATE:
                this._activate(message as TabAPIInteractionMessage, tabGroup);
                break;
            case TabAPIActions.UPDATEPROPERTIES:
                this._updateTabProperties(message as TabAPIInteractionMessage, tabGroup);
                break;
            case TabAPIActions.STARTDRAG:
                this._startDrag({uuid, name});
                break;
            case TabAPIActions.ENDDRAG:
                this._endDrag(message as TabAPIDragMessage, tabGroup);
                break;
            case TabAPIWindowActions.TOGGLEMAXIMIZE:
                tabGroup.window.toggleMaximize();
                break;
            default:
                break;
        }
    }

    /**
     * Starts the drag window process & shows the drag window overlay.
     */
    private async _startDrag(source: TabIdentifier) {
        this.mTabService.dragWindowManager.show(source);
    }

    /**
     * Ends the drag window process & hides the drag window overlay.
     * @param {{}}message None.
     * @param {TabGroup} group The TabGroup attached to this Tab.
     */
    private async _endDrag(message: TabAPIDragMessage, group: TabGroup) {
        if (!message.event) {
            console.warn('No drag event passed. Cancelling eject');
            return;
        }

        if (!message.uuid || !message.name) {
            console.error('No valid tabID has been passed in');
            return;
        }
        this.mTabService.dragWindowManager.hide();

        ejectTab(this.mTabService, {uuid: message.uuid, name: message.name, screenX: message.event.screenX, screenY: message.event.screenY}, group);
    }

    /**
     * This adds an application to a tabgroup
     * @param {TabAPIInteractionMessage} applicationToAttach The application to be attached
     * @param {TabGroup} tabGroup The tab group to attach the application to
     */
    private async _add(applicationToAttach: TabAPIInteractionMessage, tabGroup: TabGroup|undefined): Promise<void> {
        if (!applicationToAttach) {
            console.error('No application has been passed in');
            return;
        }

        if (!tabGroup) {
            console.error('No tab group has been passed in');
            return;
        }

        const tabPackage: TabPackage = {tabID: {uuid: applicationToAttach.uuid, name: applicationToAttach.name}, tabProps: applicationToAttach.properties};

        const existingTab = await this.mTabService.getTab({uuid: tabPackage.tabID.uuid, name: tabPackage.tabID.name});

        if (existingTab) {
            if (existingTab.tabGroup === tabGroup) {
                console.error('Error:  Tab already exists in this tab group!');
                return;
            }

            await existingTab.tabGroup.removeTab({uuid: tabPackage.tabID.uuid, name: tabPackage.tabID.name}, false, true);
        }

        const addedTab: Tab = await tabGroup.addTab(tabPackage);

        const align = addedTab.window.alignPositionToTabGroup();

        const switchTab = tabGroup.switchTab({uuid: tabPackage.tabID.uuid, name: tabPackage.tabID.name});

        Promise.all([align, switchTab]);
    }

    /**
     * Ejects a tab from tab group
     * @param {TabAPIInteractionMessage} applicationToEject The application to eject from the tab group
     * @param {TabGroup} tabGroup The tab group to eject from
     */
    private async _eject(applicationToEject: TabAPIInteractionMessage, tabGroup: TabGroup|undefined): Promise<void> {
        if (!applicationToEject) {
            console.error('No application has been passed in');
            return;
        }

        if (!tabGroup) {
            console.error('No tab group has been passed in');
            return;
        }

        ejectTab(this.mTabService, {name: applicationToEject.name, uuid: applicationToEject.uuid}, tabGroup);
    }

    /**
     * Closes the tab and the application itself
     * @param {TabAPIInteractionMessage} applicationToClose The application to close
     * @param {TabGroup} tabGroup The group the application is within
     */
    private async _close(applicationToClose: TabAPIInteractionMessage, tabGroup: TabGroup|undefined) {
        if (!applicationToClose) {
            console.error('No application has been passed in');
            return;
        }

        if (!tabGroup) {
            console.error('No tab group has been passed in');
            return;
        }

        tabGroup.removeTab({uuid: applicationToClose.uuid, name: applicationToClose.name}, true, true);
    }

    /**
     * Activates the tab being selected and brings it to the front
     * @param {TabAPIInteractionMessage} applicationToActivate The application to be activated
     * @param {TabGroup} tabGroup The tab group the application is in
     */
    private async _activate(applicationToActivate: TabAPIInteractionMessage, tabGroup: TabGroup|undefined) {
        if (!applicationToActivate) {
            console.error('No application has been passed in');
            return;
        }

        if (!tabGroup) {
            console.error('No tab group has been passed in');
            return;
        }

        tabGroup.switchTab({name: applicationToActivate.name, uuid: applicationToActivate.uuid});
    }

    /**
     * Updates the properties of the tab
     * @param {TabAPIInteractionMessage} tabToUpdate Holds information about the tab to update and its new properties
     * @param {TabGroup} tabGroup The group the tab is in
     */
    private async _updateTabProperties(tabToUpdate: TabAPIInteractionMessage, tabGroup: TabGroup|undefined) {
        if (!tabToUpdate) {
            console.error('No tab to update has beed passed in');
            return;
        }

        if (!tabGroup) {
            console.error('No tab group has been passed in');
            return;
        }

        if (!tabToUpdate.properties) {
            console.error('No tab properties to update');
            return;
        }

        const tab: Tab|undefined = tabGroup.getTab({uuid: tabToUpdate.uuid, name: tabToUpdate.name});

        if (!tab) {
            console.error('No tab has been found');
            return;
        }

        tab.updateTabProperties(tabToUpdate.properties);
    }
}
