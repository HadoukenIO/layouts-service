import {Point} from '../snapanddock/utils/PointUtils';

import {DesktopSnapGroup, Snappable} from './DesktopSnapGroup';
import {WindowIdentity, WindowState} from './DesktopWindow';

/**
 * Base class for windows and tab sets. Represents any entity that should be considered as a single window for the
 * purposes of snap & dock.
 *
 * Also includes common functionality for tracking asynchronous changes to window objects.
 */
export abstract class DesktopEntity /*implements Snappable*/ {  // Will eventually implement Snappable, still WIP.
    protected readonly identity: WindowIdentity;
    protected readonly id: string;  // Created from window uuid and name
    protected group: DesktopSnapGroup;

    private pendingActions: Promise<void>[];

    constructor(snapGroup: DesktopSnapGroup, identity: WindowIdentity) {
        this.identity = identity;
        this.id = `${identity.uuid}/${identity.name!}`;
        this.group = snapGroup;
        this.pendingActions = [];
    }

    public getId(): string {
        return this.id;
    }

    public getIdentity(): WindowIdentity {
        return this.identity;
    }

    public getGroup(): DesktopSnapGroup {
        return this.group;
    }

    public async sync(): Promise<void> {
        const MAX_AWAITS = 10;
        let awaitCount = 0;

        console.log(`Sync: Started with ${this.pendingActions.length} actions`);
        while (this.pendingActions.length > 0) {
            if (++awaitCount <= MAX_AWAITS) {
                // Wait for pending operations to finish
                console.log(`Sync: Awaiting ${this.pendingActions.length} actions`);
                await Promise.all(this.pendingActions);
            } else {
                // If we've looped this many times, we're probably in some kind of deadlock scenario
                return Promise.reject(`Couldn't resolve sync after ${awaitCount} attempts`);
            }
        }
    }

    protected async addPendingActions(actions: Promise<void>[]): Promise<void> {
        actions.forEach((action: Promise<void>) => {
            this.pendingActions.push(action);
            action.then(() => {
                const index = this.pendingActions.indexOf(action);
                if (index >= 0) {
                    this.pendingActions.splice(index, 1);
                    console.log('Pending action complete. Now ' + this.pendingActions.length + ' actions');
                } else {
                    console.warn('Action completed but couldn\'t find it in pending action list');
                }
            });
        });

        if (actions.length > 1) {
            return Promise.all(actions).then(() => {});
        } else if (actions.length === 1) {
            return actions[0];
        }
    }
}
