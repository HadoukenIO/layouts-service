import {deferredPromise, DeferredPromise} from '../../utils/async';

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

    private _callback: C;
    private _scope: S;
    private _args: A|undefined;

    // Multiple definitions of setTimeout/clearTimeout, and not possible to point TSC at the correct (non-Node) definition
    private _handle: number | NodeJS.Timer;

    constructor(callback: C, scope: S) {
        this._callback = callback;
        this._scope = scope;

        this._handle = -1;
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
     * @param args Arguments to hit the callback with
     */
    public async call(...args: A): Promise<void> {
        this._args = args;
        this.schedule();

        if (!this._deferredPromise) {
            this._deferredPromise = deferredPromise<void>();
        }

        return this._deferredPromise[0];
    }

    /**
     * Resets the timer (if it is currently active) without replacing the bound function arguments.
     *
     * Has no effect if the timer isn't currently active.
     */
    public postpone(): void {
        if (this._handle >= 0) {
            this.schedule();
        }
    }

    private async onTimeout(): Promise<void> {
        const args = this._args;
        delete this._args;

        this._handle = -1;
        await this._callback.apply(this._scope, args);

        const resolve = this._deferredPromise![1];
        this._deferredPromise = undefined;
        resolve();
    }

    private cancel(): void {
        if (this._handle >= 0) {
            clearTimeout(this._handle as number);
        }
    }

    private schedule(): void {
        this.cancel();
        this._handle = setTimeout(this.onTimeout, Debounced.DEBOUNCE_INTERVAL);
    }
}
