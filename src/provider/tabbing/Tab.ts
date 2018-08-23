import {AppApiEvents, TabApiEvents} from '../../client/APITypes';
import {TabIdentifier, TabPackage, TabProperties} from '../../client/types';
import {TabGroup} from './TabGroup';
import {TabWindow} from './TabWindow';


/**
 * The Tab class handles functionality related to the tab itself.
 */
export class Tab {
    /**
     * This Tabs ID (uuid, name);
     */
    private readonly _tabID: TabIdentifier;

    /**
     * Handle to the tab group that this tab belongs to.
     */
    private readonly _tabGroup: TabGroup;

    /**
     * The properties (title, icon) for the tab.
     */
    private _tabProperties: TabProperties = {};

    /**
     * Handle to this tabs window.
     */
    private _tabWindow: TabWindow;

    /**
     * Constructor for the Tab Class.
     * @param {TabPackage} tabPackage The tab package contains the uuid, name, and any properties for the tab.
     * @param {TabGroup} tabGroup The tab group to which this tab belongs.
     */
    constructor(tabPackage: TabPackage, tabGroup: TabGroup) {
        this._tabID = tabPackage.tabID;
        this._tabGroup = tabGroup;

        if (tabPackage.tabProps) {
            this._tabProperties = tabPackage.tabProps;
        }

        this._tabWindow = new TabWindow(this, tabPackage.tabID);
    }

    /**
     * Initalizes Async methods required for the Tab Class.
     */
    public async init() {
        await this._tabWindow.init();

        this._tabProperties = this._loadTabProperties();

        fin.desktop.InterApplicationBus.send(
            fin.desktop.Application.getCurrent().uuid,
            this._tabGroup.ID,
            TabApiEvents.TABADDED,
            {tabID: this.ID, tabProps: this._tabProperties, index: this.tabGroup.getTabIndex(this._tabID)});
        fin.desktop.InterApplicationBus.send(this.ID.uuid, this.ID.name, AppApiEvents.TABBED, {tabGroupID: this._tabGroup.ID});
    }

    /**
     * Remove the Tab from the group and possibly its window.
     * @param closeApp Flag if we should close the tabs window.
     */
    public async remove(closeApp: boolean) {
        this._tabWindow.leaveGroup();

        if (closeApp) {
            await this._tabWindow.close(false);
        }

        fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, this._tabGroup.ID, TabApiEvents.TABREMOVED, this._tabID);
        fin.desktop.InterApplicationBus.send(this.ID.uuid, this.ID.name, AppApiEvents.UNTABBED, {tabGroupID: this._tabGroup.ID});
    }

    /**
     * Updates the Tab properties with the passed values.
     * @param {TabProperties} props The tab properties to update.
     */
    public updateTabProperties(props: TabProperties) {
        this._tabProperties = {...this._tabProperties, ...props};
        fin.desktop.InterApplicationBus.send(
            fin.desktop.Application.getCurrent().uuid, this._tabGroup.ID, TabApiEvents.PROPERTIESUPDATED, {tabID: this.ID, tabProps: props});

        this._saveTabProperties();
    }

    /**
     * Saves the current Tab properties to the localstorage.
     */
    private _saveTabProperties() {
        localStorage.setItem(JSON.stringify(this._tabID), JSON.stringify(this._tabProperties));
    }

    /**
     * Loads the Tab properties from the localstorage.
     * @returns {TabProperties} TabProperties
     */
    private _loadTabPropertiesFromStorage(): TabProperties {
        const props = localStorage.getItem(JSON.stringify(this._tabID));

        if (props) {
            return JSON.parse(props);
        } else {
            return {};
        }
    }

    /**
     * Returns a complete TabProperties set loaded from localstorage + default values.
     * @returns {TabProperties} TabProperties
     */
    private _loadTabProperties(): TabProperties {
        const windowOptions = this._tabWindow.windowOptions;

        const storageProps: TabProperties = this._loadTabPropertiesFromStorage();
        const windowIcon =
            windowOptions.icon && windowOptions.icon.length > 0 ? windowOptions.icon : `https://www.google.com/s2/favicons?domain=${windowOptions.url}`;

        return {
            icon: this._tabProperties.icon || storageProps.icon || windowIcon,
            title: this._tabProperties.title || storageProps.title || windowOptions.name
        };
    }

    /**
     * Returns this Tabs Tab Set.
     * @returns {TabGroup} TabGroup
     */
    public get tabGroup(): TabGroup {
        return this._tabGroup;
    }

    /**
     * Returns this Tabs window.
     * @returns {TabWindow} TabWindow
     */
    public get window(): TabWindow {
        return this._tabWindow;
    }

    /**
     * Returns this Tabs ID.
     * @returns {TabIdentifier} ID
     */
    public get ID(): TabIdentifier {
        return this._tabID;
    }
}
