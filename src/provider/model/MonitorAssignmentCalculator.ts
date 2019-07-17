import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';

export type EntityResult = Rectangle;
export type SnapGroupResult = {entityResults: EntityResult[], groupRectangle: Rectangle};

type EntityAndMonitorRectangles = {entityRectangle: Rectangle, monitorRectangle: Rectangle}

// Limit ourselves to just the bits of DesktopEntity and SnapGroups we want
type DesktopEntity = {beforeMaximizeBounds: Rectangle};
type DesktopSnapGroup = {entities: DesktopEntity[]} & Rectangle;

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
            center: {x: entity.beforeMaximizeBounds.center.x + offset.x, y: entity.beforeMaximizeBounds.center.y + offset.y},
            halfSize: {...entity.beforeMaximizeBounds.halfSize}}));

        return {
            entityResults: entityRectangles.map(rectangle => this.attemptGetEntityRectangleInsideMonitorRectangle(rectangle, monitorRectangle).rectangle),
            groupRectangle
        };
    }

    public getMovedEntityRectangle(entity: DesktopEntity): EntityResult {
        return this.getMovedEntityAndMonitorRectangle(entity.beforeMaximizeBounds).entityRectangle;
    }

    /**
     * For a given entity rectangle, returns it's new rectangle, and that of the monitor it is now assigned to
     */
    private getMovedEntityAndMonitorRectangle(stateEntityRectangle: Rectangle): EntityAndMonitorRectangles {
        const candidateMonitorRectangles = this.getMonitorRectanglesSortedByDistance(stateEntityRectangle);

        // Try to find a monitor this entity will fit in
        for (const candidateMonitorRectangle of candidateMonitorRectangles) {
            const result = this.attemptGetEntityRectangleInsideMonitorRectangle(stateEntityRectangle, candidateMonitorRectangle);

            if (result.inside) {
                return {entityRectangle: result.rectangle, monitorRectangle: candidateMonitorRectangle};
            }
        }

        // If we can't find a monitor the entity will fit in, move to the primary monitor
        const primaryMonitor = this._monitorRectangles[0];

        return {
            entityRectangle: this.attemptGetEntityRectangleInsideMonitorRectangle(stateEntityRectangle, primaryMonitor).rectangle,
            monitorRectangle: primaryMonitor
        };
    }

    /**
     * For a given entity rectangle and monitor rectangle, returns if possible, a new rectangle for the entity that fits entirely within the monitor
     */
    private attemptGetEntityRectangleInsideMonitorRectangle(entityRectangle: Rectangle, monitorRectangle: Rectangle): {rectangle: Rectangle, inside: boolean} {
        const resultRectangle = {center: {...entityRectangle.center}, halfSize: {...entityRectangle.halfSize}};

        let inside: boolean = true;

        for (const axis of ['x', 'y'] as ('x' | 'y')[]) {
            const buffer = monitorRectangle.halfSize[axis] - entityRectangle.halfSize[axis];

            if (buffer < 0) {
                // If the window doesn't fit, make a best-effort to display it sensibly
                inside = false;

                if (axis === 'y') {
                    // In the y axis case, position window so title bar is at top of monitor
                    resultRectangle.center[axis] = entityRectangle.halfSize.y + monitorRectangle.center.y - monitorRectangle.halfSize.y;
                } else {
                    resultRectangle.center[axis] = monitorRectangle.center[axis];
                }
            } else {
                const offset = (entityRectangle.center[axis] - monitorRectangle.center[axis]);

                const highBuffer = buffer - offset;
                const lowBuffer = buffer + offset;

                if (lowBuffer < 0) {
                    resultRectangle.center[axis] -= lowBuffer;
                } else if (highBuffer < 0) {
                    resultRectangle.center[axis] += highBuffer;
                }
            }
        }

        return {rectangle: resultRectangle, inside};
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
