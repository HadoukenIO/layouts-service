import {WindowState} from '../../../client/workspaces';

import {Rectangle, RectUtils} from './RectUtils';

export type EntityResult = Rectangle;
export type SnapGroupResult = {entityResults: EntityResult[], groupRectangle: Rectangle};

type EntityAndMonitorRectangles = {entityRectangle: Rectangle, monitorRectangle: Rectangle}

type DesktopEntity = {currentState: Rectangle & {state: WindowState}};
type DesktopSnapGroup = {entities: {currentState: Rectangle}[]} & Rectangle;

export class MonitorAssignmentCalculator {
    private _monitorRectangles: ReadonlyArray<Rectangle>;

    public constructor(monitorRectangles: ReadonlyArray<Rectangle>) {
        this._monitorRectangles = monitorRectangles;
    }

    public getMovedSnapGroupRectangles(snapGroup: DesktopSnapGroup): SnapGroupResult {
        const groupResult = this.getMovedEntityAndMonitorRectangle(snapGroup);

        const monitorRectangle = groupResult.monitorRectangle;
        const groupRectangle = groupResult.entityRectangle;

        const offset = {
            x: groupRectangle.center.x - snapGroup.center.x,
            y: groupRectangle.center.y - snapGroup.center.y
        };

        const entityRectangles = snapGroup.entities.map(entity => ({
            center: {x: entity.currentState.center.x + offset.x, y: entity.currentState.center.y + offset.y},
            halfSize: {...entity.currentState.halfSize}}));

        return {
            entityResults: entityRectangles.map(rectangle => {
                const rectangleWithinMonitor = this.attemptGetEntityRectangleWithinMonitorRectangle(rectangle, monitorRectangle);

                return rectangleWithinMonitor ? rectangleWithinMonitor : this.getEntityRectangleOverMonitor(rectangle, monitorRectangle);
            }),
            groupRectangle
        };
    }

    public getMovedEntityRectangle(entity: DesktopEntity): EntityResult {
        return this.getMovedEntityAndMonitorRectangle(entity.currentState).entityRectangle;
    }

    /**
     * For a given entity rectangle, returns it's new rectangle, and that of the monitor it is now assigned to
     */
    private getMovedEntityAndMonitorRectangle(stateEntityRectangle: Rectangle): EntityAndMonitorRectangles {
        const candidateMonitorRectangles = this.getMonitorRectanglesSortedByDistance(stateEntityRectangle);

        // Try to find a monitor this entity will fit in
        for (const candidateMonitorRectangle of candidateMonitorRectangles) {
            const resultRectangle = this.attemptGetEntityRectangleWithinMonitorRectangle(stateEntityRectangle, candidateMonitorRectangle);

            if (resultRectangle) {
                return {entityRectangle: resultRectangle, monitorRectangle: candidateMonitorRectangle};
            }
        }

        // If we can't find a monitor the entity will fit in, move to the primary monitor
        const primaryMonitor = this._monitorRectangles[0];

        return {
            entityRectangle: this.getEntityRectangleOverMonitor(stateEntityRectangle, primaryMonitor),
            monitorRectangle: primaryMonitor
        };
    }

    /**
     * For a given entity rectangle and monitor rectangle, returns if possible, a new rectangle for the entity that fits entirely within the monitor
     */
    private attemptGetEntityRectangleWithinMonitorRectangle(entityRectangle: Rectangle, monitorRectangle: Rectangle): Rectangle | undefined {
        const resultRectangle = {center: {...entityRectangle.center}, halfSize: {...entityRectangle.halfSize}};

        for (const axis of ['x', 'y'] as ('x' | 'y')[]) {
            const buffer = monitorRectangle.halfSize[axis] - entityRectangle.halfSize[axis];

            const highBuffer = buffer - (monitorRectangle.center[axis] - entityRectangle.center[axis]);
            const lowBuffer = buffer + (monitorRectangle.center[axis] - entityRectangle.center[axis]);

            if (buffer < 0) { // In the maximized case, we're looking for an exact fit
                return undefined;
            } else if (highBuffer < 0 || lowBuffer < 0) {
                if (lowBuffer < 0) {
                    resultRectangle.center[axis] -= lowBuffer;
                } else {
                    resultRectangle.center[axis] += highBuffer;
                }
            }
        }

        return resultRectangle;
    }

    /**
     * For a given entity rectangle and monitor rectangle (the entity assumed to not fit the monitor),
     * return a new rectangle for the entity that makes a best effort to usefully display it
     */
    private getEntityRectangleOverMonitor(entityRectangle: Rectangle, monitorRectangle: Rectangle): Rectangle {
        // Position the window so it's in the center of the monitor, with the title bar at the top
        return {
            center: {x: monitorRectangle.center.x, y: entityRectangle.halfSize.y + monitorRectangle.center.y - monitorRectangle.halfSize.y},
            halfSize: {...entityRectangle.halfSize}
        };
    }

    /**
     * For a given entity rectangle, return our monitor rectangles sorted by ascending distance from the entity rectangle
     */
    private getMonitorRectanglesSortedByDistance(entityRectangle: Rectangle): Rectangle[] {
        const result = this._monitorRectangles.slice().sort((a: Rectangle, b: Rectangle) => {
            const aDistance = RectUtils.distance(a, entityRectangle);
            const bDistance = RectUtils.distance(b, entityRectangle);

            return (aDistance.x + aDistance.y) - (bDistance.x + bDistance.y);
        });

        return result;
    }
}
