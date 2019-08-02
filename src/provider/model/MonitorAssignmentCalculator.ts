import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';

export type EntityResult<T> = {rectangle: Rectangle, target: T};
export type SnapGroupResult<T, U> = {entityResults: EntityResult<T>[], groupRectangle: Rectangle, target: U};

type EntityAndMonitorRectangles = {entityRectangle: Rectangle, monitorRectangle: Rectangle}

// Limit ourselves to just the bits of DesktopEntity and SnapGroups we want
type DesktopEntity<T> = {normalBounds: Rectangle} & T;
type DesktopSnapGroup<T, U> = {entities: DesktopEntity<T>[]} & Rectangle & U;

export class MonitorAssignmentCalculator {
    private _monitorRectangles: ReadonlyArray<Rectangle>;

    public constructor(monitorRectangles: ReadonlyArray<Rectangle>) {
        this._monitorRectangles = monitorRectangles;
    }

    public getMovedSnapGroupRectangles<T, U>(snapGroup: DesktopSnapGroup<T, U>): SnapGroupResult<T, U> {
        const groupResult = this.getMovedEntityAndMonitorRectangle(snapGroup);

        const monitorRectangle = groupResult.monitorRectangle;
        const groupRectangle = groupResult.entityRectangle;

        const offset = {
            x: groupRectangle.center.x - snapGroup.center.x,
            y: groupRectangle.center.y - snapGroup.center.y
        };

        const entityRectangles = snapGroup.entities.map(entity => ({
            center: {x: entity.normalBounds.center.x + offset.x, y: entity.normalBounds.center.y + offset.y},
            halfSize: {...entity.normalBounds.halfSize}}));

        return {
            entityResults: entityRectangles.map((rectangle, index) => ({
                rectangle: this.getEntityRectangleForMonitor(rectangle, monitorRectangle).rectangle,
                target: snapGroup.entities[index]
            })),
            groupRectangle,
            target: snapGroup
        };
    }

    public getMovedEntityRectangle<T>(entity: DesktopEntity<T>): EntityResult<T> {
        return {rectangle: this.getMovedEntityAndMonitorRectangle(entity.normalBounds).entityRectangle, target: entity};
    }

    /**
     * For a given entity rectangle, returns it's new rectangle, and that of the monitor it is now assigned to
     */
    private getMovedEntityAndMonitorRectangle(stateEntityRectangle: Rectangle): EntityAndMonitorRectangles {
        const candidateMonitorRectangles = this.getMonitorRectanglesSortedByDistance(stateEntityRectangle);

        // Try to find a monitor this entity will fit in
        for (const candidateMonitorRectangle of candidateMonitorRectangles) {
            const result = this.getEntityRectangleForMonitor(stateEntityRectangle, candidateMonitorRectangle);

            if (result.inside) {
                return {entityRectangle: result.rectangle, monitorRectangle: candidateMonitorRectangle};
            }
        }

        // If we can't find a monitor the entity will fit in, move to the primary monitor
        const primaryMonitor = this._monitorRectangles[0];

        return {
            entityRectangle: this.getEntityRectangleForMonitor(stateEntityRectangle, primaryMonitor).rectangle,
            monitorRectangle: primaryMonitor
        };
    }

    /**
     * For a given entity rectangle and monitor rectangle, returns if possible, a new rectangle for the entity that fits entirely within the monitor
     */
    private getEntityRectangleForMonitor(entityRectangle: Rectangle, monitorRectangle: Rectangle): {rectangle: Rectangle, inside: boolean} {
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
                const offset = entityRectangle.center[axis] - monitorRectangle.center[axis];

                if (Math.abs(offset) > buffer) {
                    // Window is at least partially off-screen. Move inward to so fully within the monitor, touching its edge
                    resultRectangle.center[axis] = monitorRectangle.center[axis] + (buffer * Math.sign(offset));
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
