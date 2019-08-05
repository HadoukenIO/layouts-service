import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';

import {Workspace, WorkspaceWindow, TabGroup, TabGroupInfo, TabGroupDimensions} from '../../client/workspaces';
import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';
import {WindowIdentity} from '../../client/main';
import {DesktopTabstripFactory} from '../model/DesktopTabstripFactory';
import {MonitorAssignmentCalculator, EntityResult, SnapGroupResult} from '../model/MonitorAssignmentCalculator';
import {model} from '../main';
import {Point} from '../snapanddock/utils/PointUtils';
import {MonitorAssignmentValidator} from '../model/MonitorAssignmentValidator';

import {getId} from './placeholder';

type WindowPartialEntity = {type: 'window', window: WorkspaceWindow};
type TabGroupPartialEntity = {type: 'tabGroup', tabGroup: TabGroup, windows: WorkspaceWindow[], activeTab: WorkspaceWindow};
type Entity = (WindowPartialEntity | TabGroupPartialEntity) & {normalBounds: Rectangle};
type SnapGroup = Rectangle & {entities: Entity[]};

export function retargetForMonitors(workspace: Workspace): {workspace: Workspace, monitors: ReadonlyArray<Rectangle>} {
    const workspaceMonitors = [workspace.monitorInfo.primaryMonitor, ...workspace.monitorInfo.nonPrimaryMonitors];

    const oldMonitors = workspaceMonitors.map(monitor => RectUtils.convertToCenterHalfSize(monitor.availableRect));
    const newMonitors = model.monitors;

    if (MonitorAssignmentValidator.haveMonitorsBeenDetached(oldMonitors, model.monitors)) {
        new WorkspaceMonitorRetargeter(workspace).retarget();
    }

    return {workspace, monitors: newMonitors};
}

class WorkspaceMonitorRetargeter {
    private readonly workspace: Workspace;

    private readonly windowsById: Map<String, WorkspaceWindow>;
    private readonly entities: Entity[];
    private readonly snapGroups: SnapGroup[];

    private readonly detachedEntities: Entity[];

    public constructor(workspace: Workspace) {
        this.workspace = workspace;

        this.windowsById = new Map<string, WorkspaceWindow>();
        this.entities = [];
        this.snapGroups = [];

        this.detachedEntities = [];

        // Create windows lookup
        for (const app of this.workspace.apps) {
            this.windowsById.set(getId(app.mainWindow), app.mainWindow);

            for (const childWindow of app.childWindows) {
                this.windowsById.set(getId(childWindow), childWindow);
            }
        }

        // Create tab groups lookup
        const tabGroupsById = new Map<string, TabGroup>();
        for (const tabGroup of this.workspace.tabGroups) {
            for (const tab of tabGroup.tabs) {
                tabGroupsById.set(getId(tab), tabGroup);
            }
        }

        // Create entities lookup, with window identity, or active tab identity as key
        const entitiesById = new Map<string, Entity>();
        for (const window of this.windowsById.values()) {
            const windowId = getId(window);

            const tabGroup = tabGroupsById.get(windowId);

            if (tabGroup) {
                if (getId(tabGroup.groupInfo.active) === windowId) {
                    const tabGroupEntity: Entity = {
                        type: 'tabGroup', tabGroup,
                        normalBounds: this.getRectangleFromTabGroup(tabGroup),
                        activeTab: window,
                        windows: tabGroup.tabs.map(tab => this.windowsById.get(getId(tab))!)
                    };

                    entitiesById.set(windowId, tabGroupEntity);
                }
            } else {
                const windowEntity: Entity = {
                    type: 'window', window,
                    normalBounds: this.getRectangleFromWindow(window)
                };

                entitiesById.set(windowId, windowEntity);
            }
        }

        // Create groups
        const groups: Entity[][] = [];
        for (const entity of entitiesById.values()) {
            const groupedEntities: Entity[] = [];

            for (const groupedEntityIdentity of entity.type === 'window' ? entity.window.windowGroup : entity.activeTab.windowGroup) {
                const groupedEntity = entitiesById.get(getId(groupedEntityIdentity as WindowIdentity));

                if (groupedEntity) {
                    groupedEntities.push(groupedEntity);
                }
            }
            groupedEntities.push(entity);

            groupedEntities.sort((entity1, entity2) => {
                const id1 = entity1.type === 'window' ? getId(entity1.window) : getId(entity1.activeTab);
                const id2 = entity2.type === 'window' ? getId(entity2.window) : getId(entity2.activeTab);

                return id1.localeCompare(id2, 'en');
            });

            if (entity === groupedEntities[0]) {
                groups.push(groupedEntities);
            }
        }

        // Create lists of single entities, and non-trivial snap groups
        for (const group of groups) {
            let targetEntities: Entity[];

            if (group.length !== 1) {
                targetEntities = [];
            } else {
                targetEntities = this.entities;
            }

            for (const entity of group.values()) {
                targetEntities.push(entity);
            }

            if (group.length !== 1) {
                this.snapGroups.push({entities: targetEntities, ...this.getRectangleFromEntities(targetEntities)});
            }
        }
    }

    public retarget(): void {
        const calculator = new MonitorAssignmentCalculator(model.monitors);

        // Calculate the new desired positions of our workspace entities
        const snapGroupResults = this.snapGroups.map(snapGroup => calculator.getMovedSnapGroupRectangles<Entity, SnapGroup>(snapGroup));
        const entityResults = this.entities.map(entity => calculator.getMovedEntityRectangle<Entity>(entity));

        // Mutate the workspace to fit the new monitor arrangement
        this.applySnapGroupResults(snapGroupResults);
        this.applyEntityResults(entityResults);

        this.ungroupDetachedEntities();
    }

    private applySnapGroupResults(snapGroupResults: SnapGroupResult<Entity, SnapGroup>[]): void {
        for (const snapGroupResult of snapGroupResults) {
            this.applySnapGroupResult(snapGroupResult.target, snapGroupResult.groupRectangle);

            for (const entityResult of snapGroupResult.entityResults) {
                this.applyEntityResult(entityResult.target, entityResult.rectangle, true);
            }
        }
    }

    private applyEntityResults(entityResults: EntityResult<Entity>[]): void {
        for (const entityResult of entityResults) {
            this.applyEntityResult(entityResult.target, entityResult.rectangle, false);
        }
    }

    private ungroupDetachedEntities(): void {
        for (const entity of this.detachedEntities) {
            let remainingWindowIdentities: WindowIdentity[];

            if (entity.type === 'window') {
                remainingWindowIdentities = entity.window.windowGroup as WindowIdentity[];
                entity.window.windowGroup = [];
            } else {
                remainingWindowIdentities = entity.activeTab.windowGroup.filter(identity => {
                    const id = getId(identity as WindowIdentity);
                    return !entity.windows.some(tab => getId(tab) === id);
                }) as WindowIdentity[];

                for (const tab of entity.windows) {
                    tab.windowGroup = entity.windows.filter(window => window !== tab).map(window => ({uuid: window.uuid, name: window.name}));
                }
            }

            for (const remainingWindowIdentity of remainingWindowIdentities) {
                const remainingWindowId = getId(remainingWindowIdentity);
                this.windowsById.get(remainingWindowId)!.windowGroup = remainingWindowIdentities.filter(identity => getId(identity) !== remainingWindowId);
            }
        }
    }

    private applySnapGroupResult(snapGroup: SnapGroup, rectangle: Rectangle): void {
        const offset = {x: rectangle.center.x - snapGroup.center.x, y: rectangle.center.y - snapGroup.center.y};

        for (const entity of snapGroup.entities) {
            this.applyEntityOffset(entity, offset);
        }
    }

    private applyEntityResult(entity: Entity, rectangle: Rectangle, grouped: boolean): void {
        if (entity.type === 'window') {
            // Move the window to its new position
            const oldBounds = entity.window.bounds;
            const newBounds = this.getWindowBoundsFromRectangle(rectangle);

            entity.window.bounds = newBounds;

            if (grouped && !this.areBoundsEqual(oldBounds, newBounds)) {
                this.detachedEntities.push(entity);
            }
        } else {
            // Move the tabGroup and all its tabs to the new position
            const groupInfo = entity.tabGroup.groupInfo;

            groupInfo.dimensions = this.getTabGroupDimensionsFromRectangle(groupInfo, rectangle);

            const oldBounds = entity.windows[0].bounds;
            const newBounds = this.getTabWindowBoundsFromRectangle(groupInfo, rectangle);

            for (const window of entity.windows) {
                window.bounds = newBounds;
            }

            if (grouped && !this.areBoundsEqual(oldBounds, newBounds)) {
                this.detachedEntities.push(entity);
            }
        }
    }

    private applyEntityOffset(entity: Entity, offset: Point<number>): void {
        if (entity.type === 'window') {
            // Offset the window
            entity.window.bounds.left += offset.x;
            entity.window.bounds.right += offset.x;
            entity.window.bounds.top += offset.y;
            entity.window.bounds.bottom += offset.y;
        } else {
            // Offset the tabGroup and all its tabs
            entity.tabGroup.groupInfo.dimensions.x += offset.x;
            entity.tabGroup.groupInfo.dimensions.y += offset.y;

            for (const window of entity.windows) {
                window.bounds.left += offset.x;
                window.bounds.right += offset.x;
                window.bounds.top += offset.y;
                window.bounds.bottom += offset.y;
            }
        }
    }

    private getRectangleFromWindow(window: WorkspaceWindow): Rectangle {
        return {
            center: {x: window.bounds.left + window.bounds.width / 2, y: window.bounds.top + window.bounds.height / 2},
            halfSize: {x: window.bounds.width / 2, y: window.bounds.height / 2}
        };
    }

    private getRectangleFromTabGroup(tabGroup: TabGroup): Rectangle {
        const tabstripConfig = tabGroup.groupInfo.config;
        const tabstripHeight = tabstripConfig === 'default' ? DesktopTabstripFactory.DEFAULT_CONFIG.height : tabstripConfig.height;

        const height = tabGroup.groupInfo.dimensions.appHeight + tabstripHeight;
        const dimensions = tabGroup.groupInfo.dimensions;

        return {
            center: {x: dimensions.x + dimensions.width / 2, y: dimensions.y + height / 2},
            halfSize: {x: dimensions.width / 2, y: height / 2}
        };
    }

    private getRectangleFromEntities(entities: Entity[]): Rectangle {
        return entities.reduce((bounds: Rectangle, entity: Entity) => {
            const entityBounds = entity.normalBounds;

            const left = Math.min(bounds.center.x - bounds.halfSize.x, entityBounds.center.x - entityBounds.halfSize.x);
            const right = Math.max(bounds.center.x + bounds.halfSize.x, entityBounds.center.x + entityBounds.halfSize.x);

            const top = Math.min(bounds.center.y - bounds.halfSize.y, entityBounds.center.y - entityBounds.halfSize.y);
            const bottom = Math.max(bounds.center.y + bounds.halfSize.y, entityBounds.center.y + entityBounds.halfSize.y);

            return {
                center: {x: (left + right) / 2, y: (top + bottom) / 2},
                halfSize: {x: (right - left) / 2, y: (bottom - top) / 2}
            };
        }, entities[0].normalBounds);
    }

    private getWindowBoundsFromRectangle(rectangle: Rectangle): Required<Bounds> {
        return {
            left: rectangle.center.x - rectangle.halfSize.x,
            right: rectangle.center.x + rectangle.halfSize.x,
            top: rectangle.center.y - rectangle.halfSize.y,
            bottom: rectangle.center.y + rectangle.halfSize.y,
            width: rectangle.halfSize.x * 2,
            height: rectangle.halfSize.y * 2
        };
    }

    private getTabGroupDimensionsFromRectangle(groupInfo: TabGroupInfo, rectangle: Rectangle): TabGroupDimensions {
        const tabstripConfig = groupInfo.config;
        const tabstripHeight = tabstripConfig === 'default' ? DesktopTabstripFactory.DEFAULT_CONFIG.height : tabstripConfig.height;

        return {
            x: rectangle.center.x - rectangle.halfSize.x,
            y: rectangle.center.y - rectangle.halfSize.y,
            width: rectangle.halfSize.x * 2,
            appHeight: (rectangle.halfSize.y * 2) - tabstripHeight
        };
    }

    private getTabWindowBoundsFromRectangle(groupInfo: TabGroupInfo, rectangle: Rectangle): Required<Bounds> {
        const tabstripConfig = groupInfo.config;
        const tabstripHeight = tabstripConfig === 'default' ? DesktopTabstripFactory.DEFAULT_CONFIG.height : tabstripConfig.height;

        const groupBounds = this.getWindowBoundsFromRectangle(rectangle);

        groupBounds.height -= tabstripHeight;
        groupBounds.top += tabstripHeight;

        return groupBounds;
    }

    private areBoundsEqual(bounds1: Bounds, bounds2: Bounds): boolean {
        return (
            bounds1.left === bounds2.left && bounds1.top === bounds2.top &&
            bounds1.width === bounds2.width && bounds1.height === bounds2.height);
    }
}
