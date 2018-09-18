import {ApplicationUIConfig, Bounds, TabBlob, TabIdentifier, TabWindowOptions} from '../../client/types';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopTabGroup} from '../model/DesktopTabGroup';
import {DesktopWindow, WindowIdentity, WindowState} from '../model/DesktopWindow';
import {Rectangle} from '../snapanddock/utils/RectUtils';

import {APIHandler} from './APIHandler';
import {ApplicationConfigManager} from './components/ApplicationConfigManager';
import {DragWindowManager} from './DragWindowManager';


/**
 * The overarching class for the Tab Service.
 */
export class TabService {
    /**
     * Handle of this Tab Service Instance.
     */
    public static INSTANCE: TabService;

    private _model: DesktopModel;

    /**
     * Handle to the Tabbing API Handler
     */
    private _apiHandler: APIHandler;

    /**
     * Handle to the DragWindowManager
     */
    private _dragWindowManager: DragWindowManager;

    /**
     * Handles the application ui configs
     */
    private mApplicationConfigManager: ApplicationConfigManager;


    /**
     * Constructor of the TabService Class.
     */
    constructor(model: DesktopModel) {
        this._model = model;
        this._dragWindowManager = new DragWindowManager();
        this._dragWindowManager.init();
        this._apiHandler = new APIHandler(model, this);

        this.mApplicationConfigManager = new ApplicationConfigManager();

        TabService.INSTANCE = this;
    }

    /**
     * Returns the handler that connects the client and this service
     */
    public get apiHandler(): APIHandler {
        return this._apiHandler;
    }

    /**
     * Returns the DragWindowManager instance.
     */
    public get dragWindowManager(): DragWindowManager {
        return this._dragWindowManager;
    }

    /**
     * Returns the application config manager that holds any configuration data that has been set for each application
     */
    public get applicationConfigManager(): ApplicationConfigManager {
        return this.mApplicationConfigManager;
    }

    /**
     * Creates a new tab group with provided tabs.  Will use the UI and position of the first Identity provided for positioning.
     * @param tabIdentities An array of Identities to add to a group.
     */
    public async createTabGroupWithTabs(tabIdentities: TabIdentifier[]) {
        if (tabIdentities.length < 2) {
            console.error('createTabGroup called fewer than 2 tab identifiers');
            throw new Error('Must provide at least 2 Tab Identifiers');
        }

        const firstWindow: DesktopWindow|null = this._model.getWindow(tabIdentities[0]);
        const firstWindowBounds: Rectangle = firstWindow ? firstWindow.getState() : {center: {x: 300, y: 300}, halfSize: {x: 300, y: 200}};
        const config: ApplicationUIConfig = this.mApplicationConfigManager.getApplicationUIConfig(tabIdentities[0].uuid);
        const options: TabWindowOptions = {
            ...config,
            x: firstWindowBounds.center.x - firstWindowBounds.halfSize.x,
            y: firstWindowBounds.center.y - firstWindowBounds.halfSize.y,
            width: firstWindowBounds.halfSize.x * 2
        };

        const snapGroup: DesktopSnapGroup = new DesktopSnapGroup();
        const group: DesktopTabGroup = new DesktopTabGroup(this._model, snapGroup, options);
        const tabs: DesktopWindow[] = tabIdentities.map((identity: WindowIdentity) => this._model.getWindow(identity))
                                          .filter((tab: DesktopWindow|null): tab is DesktopWindow => tab !== null);

        if (tabs.length !== tabIdentities.length) {
            if (tabs.length < 2) {
                throw new Error(
                    'Must have at least two valid tab identities to create a tab group: ' +
                    tabIdentities.map(identity => `${identity.uuid}/${identity.name}`).join('\n'));
            } else {
                console.warn(
                    'Tab list contained ' + (tabIdentities.length - tabs.length) + ' invalid identities', tabIdentities, tabs.map(tab => tab.getIdentity()));
            }
        }

        // const [bounds, state] = await Promise.all([firstTab.window.getWindowBounds(), firstTab.window.getState()]);
        // tabs.forEach(tab => tab.getWindow().setBounds(bounds.left, bounds.top, bounds.width, bounds.height));
        const firstTab: DesktopWindow = tabs.shift()!;
        const state: WindowState = firstTab.getState();
        const bounds: Partial<WindowState> = {center: state.center, halfSize: state.halfSize};
        // tabs.forEach((tab: DesktopWindow) => {
        //     tab.applyProperties(bounds);
        // });
        // tabs[tabs.length - 1].getWindow().bringToFront();
        await group.addTab(firstTab, false);

        await Promise.all(tabs.map(tab => group.addTab(tab, false)));
        // await group.switchTab(tabs[tabs.length - 1].getIdentity());
        // await group.hideAllTabsMinusActiveTab();

        if (state.state === 'maximized') {
            group.maximize();
        }
    }

    /**
     * Removes a tab from a tab group.
     *
     * If given ID is invalid or doesn't belong to a tab set, method call has no effect.
     *
     * @param {TabIdentifier} tabID The identity of the tab to remove.
     */
    public async removeTab(tabID: TabIdentifier): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabID);
        const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        if (group) {
            await group.removeTab(tab!);
        }
    }

    public async swapTab(toRemove: TabIdentifier, toAdd: TabIdentifier): Promise<void> {
        const tabToAdd: DesktopWindow|null = this._model.getWindow(toAdd);
        const tabToRemove: DesktopWindow|null = this._model.getWindow(toRemove);
        const group: DesktopTabGroup|null = tabToRemove && tabToRemove.getTabGroup();

        if (!tabToRemove || !group) {
            throw new Error(`No tab group found for ${toRemove}`);
        } else if (!tabToAdd) {
            throw new Error(`No window found for ${toAdd}`);
        }

        return group.swapTab(tabToRemove, tabToAdd);
    }

    /**
     * Gathers information from tab sets and their tabs, and returns as a JSON object back to the requesting application/window.
     */
    public async getTabSaveInfo(): Promise<TabBlob[]> {
        const tabGroups: ReadonlyArray<DesktopTabGroup> = this._model.getTabGroups();

        return Promise.all(tabGroups.map(async (group: DesktopTabGroup) => {
            const tabs: TabIdentifier[] = group.tabs.map((tab: DesktopWindow) => {
                return tab.getIdentity();
            });

            const appRect: Rectangle = group.activeTab.getState();
            const groupRect: Rectangle = group.window.getState();
            const groupInfo = {
                url: group.config.url,
                active: group.activeTab.getIdentity(),
                dimensions: {
                    x: groupRect.center.x - groupRect.halfSize.x,
                    y: groupRect.center.y - groupRect.halfSize.y,
                    width: groupRect.halfSize.x * 2,
                    tabGroupHeight: groupRect.halfSize.y * 2,
                    appHeight: appRect.halfSize.y * 2
                }
            };

            return {tabs, groupInfo};
        }));
    }


    /**
     * Takes a tabblob and restores windows based on the blob
     * @function createTabGroupsFromMultipleWindows
     * @param tabBlob[] Restoration data
     */
    public async createTabGroupsFromTabBlob(tabBlob: TabBlob[]): Promise<void> {
        if (!tabBlob) {
            console.error('Unable to create tabgroup - no blob supplied');
            throw new Error('Unable to create tabgroup - no blob supplied');
        }

        for (const blob of tabBlob) {
            const newTabWindowOptions: TabWindowOptions = {
                url: blob.groupInfo.url,
                x: blob.groupInfo.dimensions.x,
                y: blob.groupInfo.dimensions.y,
                height: blob.groupInfo.dimensions.tabGroupHeight,
                width: blob.groupInfo.dimensions.width,
            };

            // Each tab set will be a stand-alone snap group
            const snapGroup: DesktopSnapGroup = new DesktopSnapGroup();

            // Create new tabgroup
            const group: DesktopTabGroup = new DesktopTabGroup(this._model, snapGroup, newTabWindowOptions);

            group.isRestored = true;

            await new Promise((res, rej) => {
                const win = fin.desktop.Window.wrap(blob.tabs[0].uuid, blob.tabs[0].name);
                win.resizeTo(blob.groupInfo.dimensions.width!, blob.groupInfo.dimensions.appHeight, 'top-left', res, rej);
            });

            for (const tab of blob.tabs) {
                const newTab: DesktopWindow = this._model.getWindow(tab)!;

                if (newTab) {
                    await group.addTab(newTab, false, true);
                } else {
                    console.error('No tab was added');
                    continue;
                }
            }

            await group.switchTab(this._model.getWindow({uuid: blob.groupInfo.active.uuid, name: blob.groupInfo.active.name})!);
        }
    }

    /**
     * Ejects or moves a tab/tab group based criteria passed in.
     *
     * 1. If we receive a screenX & screenY position, we check if a tab group + tab app is under that point.  If there is a window under that point we check if
     * their URLs match and if they do, we allow tabbing to occur.  If not, we cancel out.
     *
     *
     * 2. If we receive a screenX & screenY position, we check if a tab group + tab app is under that point.  If there is not a window under that point we
     * create a new tab group + tab at the screenX & screenY provided if there are more than 1 tabs in the original group. If there is only one tab we move the
     * window.
     *
     *
     * 3. If we dont receive a screenX & screenY position, we create a new tabgroup + tab at the app windows existing position.
     *
     * @param tab The tab/application to be ejected from it's current tab group
     * @param options Details about the eject target. Determines what happens to the tab once it is ejected.
     */
    public async ejectTab(tab: TabIdentifier, options: Partial<TabWindowOptions>): Promise<void> {
        // Get the tab that was ejected.
        const ejectedTab: DesktopWindow|null = this._model.getWindow(tab);
        const tabGroup: DesktopTabGroup|null = ejectedTab && ejectedTab.getTabGroup();

        // if the tab is not valid then return out of here!
        if (!ejectedTab || !tabGroup) {
            console.error('Attempted to eject tab which is not in a tabgroup');
            throw new Error('Specified window is not in a tabGroup.');
        }

        // If we have a screen position we check if there is a tab group + tab window underneath
        const isOverTabWindow: DesktopWindow|null = (options.x && options.y) ? this._model.getWindowAt(options.x, options.y, tab) : null;
        const isOverTabGroup: DesktopTabGroup|null = isOverTabWindow && isOverTabWindow.getTabGroup();

        // If there is a window underneath our point
        if (isOverTabWindow && isOverTabGroup === tabGroup) {
            // If the window under our point is in the same group as the one being dragged, we do nothing
            return;
        } else if (isOverTabWindow) {
            if (this.applicationConfigManager.compareConfigBetweenApplications(isOverTabWindow.getIdentity().uuid, ejectedTab.getIdentity().uuid)) {
                if (isOverTabGroup) {
                    await tabGroup.removeTab(ejectedTab);
                    await isOverTabGroup.addTab(ejectedTab);
                } else {
                    await tabGroup.removeTab(ejectedTab);
                    await this.createTabGroupWithTabs([isOverTabWindow.getIdentity(), ejectedTab.getIdentity()]);
                }
            }
        } else {
            await tabGroup.removeTab(ejectedTab);

            if (options.x && options.y) {
                const halfSize = ejectedTab.getState().halfSize;
                ejectedTab.applyProperties({center: {x: options.x + halfSize.x, y: options.y + halfSize.y}, hidden: false});
            } else {
                ejectedTab.applyProperties({hidden: false});
            }
        }
    }
}
