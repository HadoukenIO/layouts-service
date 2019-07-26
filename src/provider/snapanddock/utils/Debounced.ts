import {DeferredPromise} from '../../utils/DeferredPromise';

/**
 * Util for de-bouncing calls to a function. The function will be wrapped within this object, which bundles the
 * callback with a resettable timer.
 *
 * This util is intended for calling a function after a short delay, whilst also ensuring that the function is called
 * only once within that period. Any attempt to call the function within the timeout period will reset the timer.
 *
 * The callback function and scope are set at construction, with any function arguments being passed at the time the
 * timeout is (re-)started.
 */
export class Debounced<C extends Function, S, A extends any[]> {
    private static DEBOUNCE_INTERVAL = 200;

    private _deferredPromise: DeferredPromise<void> | undefined;
    private _callbackResult: any;

    private _callback: C;
    private _scope: S;
    private _args: A | undefined;

    private _handle: number | undefined;

    constructor(callback: C, scope: S) {
        this._callback = callback;
        this._scope = scope;

        this.onTimeout = this.onTimeout.bind(this);
    }

    /**
     * Schedules a call to the function in at-least DEBOUNCE_INTERVAL milliseconds.
     *
     * Any subsequent calls to call or postpone before the timeout period will reset the timer.
     *
     * In the event of multiple calls to this function with different arguments, the most recent arguments will be
     * used for the "actual" function call.
     *
     * In the event the call is async and already in progress, we wait for it to complete before scheduling a new call.
     *
     * @param args Arguments to hit the callback with
     */
    public async call(...args: A): Promise<void> {
        const entryTime = Date.now();

        // If our callback is still running, we do want to retrigger it, but we want to wait for the previous invocations to finish
        await this._callbackResult;

        this._args = args;
        if (!this._deferredPromise) {
            this._deferredPromise = new DeferredPromise();
        }

        // Since we want a consistent wait between this method being called, and our _callback being called, adjust for time
        // we may have spent waiting for the previous invocation of _callback to finish
        this.schedule(Date.now() - entryTime);

        return this._deferredPromise.promise;
    }

    /**
     * Resets the timer (if it is currently active) without replacing the bound function arguments.
     *
     * Has no effect if the timer isn't currently active.
     */
    public postpone(): void {
        if (this._handle !== undefined) {
            this.schedule();
        }
    }

    private async onTimeout(): Promise<void> {
        const args = this._args;
        delete this._args;

        this._handle = undefined;
        const resolve = this._deferredPromise!.resolve;
        this._deferredPromise = undefined;

        this._callbackResult = this._callback.apply(this._scope, args);
        await this._callbackResult;

        this._callbackResult = undefined;

        resolve();
    }

    private async schedule(elapsed: number = 0): Promise<void> {
        if (this._handle !== undefined) {
            window.clearTimeout(this._handle);
        }

        this._handle = window.setTimeout(this.onTimeout, Math.max(0, Debounced.DEBOUNCE_INTERVAL - elapsed));
    }
}
