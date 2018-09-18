import {DesktopModel} from './DesktopModel';
import {WindowIdentity} from './DesktopWindow';

/**
 * Base class for windows and tab sets. Represents any entity that should be considered as a single window for the
 * purposes of snap & dock.
 *
 * Also includes common functionality for tracking asynchronous changes to window objects.
 */
export abstract class DesktopEntity /*implements Snappable*/ {  // Will eventually implement Snappable, still WIP.
    protected readonly model: DesktopModel;
    protected readonly identity: WindowIdentity;
    protected readonly id: string;  // Created from window uuid and name

    private pendingActions: Promise<void>[];

    constructor(model: DesktopModel, identity: WindowIdentity) {
        this.model = model;
        this.identity = identity;
        this.id = `${identity.uuid}/${identity.name!}`;
        this.pendingActions = [];
    }

    public getId(): string {
        return this.id;
    }

    public getIdentity(): WindowIdentity {
        return this.identity;
    }

    public async sync(): Promise<void> {
        const MAX_AWAITS = 10;
        let awaitCount = 0;

        while (this.pendingActions.length > 0) {
            if (++awaitCount <= MAX_AWAITS) {
                // Wait for pending operations to finish
                console.log(`Sync ${this.id} ${awaitCount}/${MAX_AWAITS}: Awaiting ${this.pendingActions.length} actions`);
                await Promise.all(this.pendingActions);
            } else {
                // If we've looped this many times, we're probably in some kind of deadlock scenario
                return Promise.reject(`Couldn't sync ${this.id} after ${awaitCount} attempts`);
            }
        }
    }

    protected async addPendingActions(actions: Promise<void>|Promise<void>[]): Promise<void> {
        if (actions instanceof Array) {
            this.pendingActions.push.apply(this.pendingActions, actions);
            actions.forEach((action: Promise<void>) => {
                action.then(this.onActionComplete.bind(this, action));
            });

            if (actions.length > 1) {
                return Promise.all(actions).then(() => {});
            } else if (actions.length === 1) {
                return actions[0];
            }
        } else {
            this.pendingActions.push(actions);
            actions.then(this.onActionComplete.bind(this, actions));
            return actions;
        }
    }

    private onActionComplete(action: Promise<void>): void {
        const index = this.pendingActions.indexOf(action);
        if (index >= 0) {
            this.pendingActions.splice(index, 1);
        } else {
            console.warn('Action completed but couldn\'t find it in pending action list');
        }
    }
}
