// tslint:disable-next-line:no-any
type Context = any;

/**
 * A 'library' of common aggregators.
 *
 * Pass one of these functions to a `Signal[n]` constructor to add the described behaviour to that signal.
 */
export class Aggregators {
    /**
     * Basic "pass-through" aggregator. Will pass an array of values back to the signal emitter, one per callback.
     *
     * Note that this means the size of the returned array depends on the number of listeners attached.
     */
    public static ARRAY<T>(items: T[]): T[] {
        return items;
    }

    /**
     * If a signal allows listeners to return a promise, this aggregator will await all the received promises and then
     * return an array of the resolved values.
     *
     * This aggregator is intended for use with non-void promises, where the value returned by the promise is
     * meaningful. If the return value of the promise is not significant, consider {@link AwaitVoid}.
     */
    public static AWAIT<T>(items: Promise<T>[]): Promise<T[]> {
        return Promise.all(items);
    }

    /**
     * An aggregator for use with Promise<void> signals. Will await all promises that are returned by callback
     * functions, but discard the (void) return values.
     */
    public static async AWAIT_VOID(items: Promise<void>[]): Promise<void> {
        await Promise.all(items);
    }
}

/**
 * Signature for an aggregator function.
 *
 * On signals that allow callbacks to return a value (i.e. where `R != void`), an aggregator can be used to determine
 * how the values returned by the signal callbacks are returned back to the code that emitted the signal.
 *
 * If no aggregator is provided, the `emit()` function on a signal has a `void` return type.
 */
export type Aggregator<R, R2> = (items: R[]) => R2;

/**
 * Represents a slot that exists on a signal.
 */
export interface SignalSlot<T extends Function = Function> {
    callback: T;
    context: Context;

    /**
     * Removes 'callback' from the signal to which this slot is registered.
     *
     * Will have no effect if callback has already been removed (regardless of how the slot was removed).
     */
    remove(): void;
}

/**
 * Signal implementation, a messaging paradigm similar to standard JavaScript events, only more object-based.
 *
 * Create a signal for each event type, specifying the types of any callback parameters. Listeners (known as "slots")
 * can then be added to (and removed from) the signal.
 *
 * Unlike events, callbacks are also able to return a value. To make use of these return values, pass an aggregator
 * function when defining the signal. The static functions within {@link Aggregators} are a set of aggregators that
 * cover typical use-cases.
 */
class SignalBase<R, R2> {
    private _length: number;
    private _slots: SignalSlot[];

    private aggregator: Aggregator<R, R2>|null;

    constructor(length: number, aggregator?: Aggregator<R, R2>) {
        this._length = length;
        this._slots = [];
        this.aggregator = aggregator || null;
    }

    /**
     * Returns the length of the signal, this is the number of arguments that are passed to each callback when this
     * signal is emitted.
     *
     * Do not confuse with {@link slots.length}, which is the current number of listeners attached to the signal.
     */
    public get length(): number {
        return this._length;
    }

    /**
     * Provides read-only access to the current set of slots.
     *
     * This is an array of all callbacks that are currently attached to this signal.
     */
    public get slots(): ReadonlyArray<SignalSlot> {
        return this._slots;
    }

    protected addInternal<T extends Function>(callback: T, context?: Context): SignalSlot<T> {
        if (callback.length === this._length) {
            const slot = {callback, context, remove: () => this.removeSlot(slot)};
            this._slots.push(slot);
            return slot;
        } else {
            throw new Error('Callback function must accept ' + this._length + ' arguments');
        }
    }

    protected removeInternal<T extends Function>(callback: T, context?: Context): boolean {
        const index: number = this._slots.findIndex((c) => c.callback === callback && c.context === context);

        if (index >= 0) {
            this._slots.splice(index, 1);
            return true;
        } else {
            return false;
        }
    }

    protected hasInternal(callback: Function, context?: Context): boolean {
        return this._slots.findIndex((c) => c.callback === callback && c.context === context) >= 0;
    }

    // tslint:disable-next-line:no-any
    protected emitInternal(...args: any[]): R2 {
        const callbacks = this._slots.slice();  // Clone array, in case a callback modifies this signal

        if (!this.aggregator) {
            callbacks.forEach(c => c.callback.apply(c.context, args));

            // If not using an aggregator, return type should be void.
            // No way to enforce this through TypeScript without creating a whole new set of signal classes, so relying on convention here.
            return (undefined as unknown) as R2;
        } else {
            return this.aggregator(callbacks.map(c => c.callback.apply(c.context, args)));
        }
    }

    private removeSlot(slot: SignalSlot): void {
        const index: number = this._slots.indexOf(slot);

        if (index >= 0) {
            this._slots.splice(index, 1);
        }
    }
}

export class Signal0<R = void, R2 = R> extends SignalBase<R, R2> {
    constructor(aggregator?: Aggregator<R, R2>) {
        super(0, aggregator);
    }

    public add(listener: () => R, context?: Context): SignalSlot<() => R> {
        return super.addInternal(listener, context);
    }

    public remove(listener: () => R, context?: Context): boolean {
        return super.removeInternal(listener, context);
    }

    public has(listener: () => R, context?: Context): boolean {
        return super.hasInternal(listener, context);
    }

    public emit(): R2|void {
        return super.emitInternal();
    }
}

export class Signal1<A1, R = void, R2 = R> extends SignalBase<R, R2> {
    constructor(aggregator?: Aggregator<R, R2>) {
        super(1, aggregator);
    }

    public add(listener: (arg1: A1) => R, context?: Context): SignalSlot<(arg1: A1) => R> {
        return super.addInternal(listener, context);
    }

    public remove(listener: (arg1: A1) => R, context?: Context): boolean {
        return super.removeInternal(listener, context);
    }

    public has(listener: (arg1: A1) => R, context?: Context): boolean {
        return super.hasInternal(listener, context);
    }

    public emit(arg1: A1): R2 {
        return super.emitInternal(arg1);
    }
}

export class Signal2<A1, A2, R = void, R2 = R> extends SignalBase<R, R2> {
    constructor(aggregator?: Aggregator<R, R2>) {
        super(2, aggregator);
    }

    public add(listener: (arg1: A1, arg2: A2) => R, context?: Context): SignalSlot<(arg1: A1, arg2: A2) => R> {
        return super.addInternal(listener, context);
    }

    public remove(listener: (arg1: A1, arg2: A2) => R, context?: Context): boolean {
        return super.removeInternal(listener, context);
    }

    public has(listener: (arg1: A1, arg2: A2) => R, context?: Context): boolean {
        return super.hasInternal(listener, context);
    }

    public emit(arg1: A1, arg2: A2): R2 {
        return super.emitInternal(arg1, arg2);
    }
}

export class Signal3<A1, A2, A3, R = void, R2 = R> extends SignalBase<R, R2> {
    constructor(aggregator?: Aggregator<R, R2>) {
        super(3, aggregator);
    }

    public add(listener: (arg1: A1, arg2: A2, arg3: A3) => R, context?: Context): SignalSlot<(arg1: A1, arg2: A2, arg3: A3) => R> {
        return super.addInternal(listener, context);
    }

    public remove(listener: (arg1: A1, arg2: A2, arg3: A3) => R, context?: Context): boolean {
        return super.removeInternal(listener, context);
    }

    public has(listener: (arg1: A1, arg2: A2, arg3: A3) => R, context?: Context): boolean {
        return super.hasInternal(listener, context);
    }

    public emit(arg1: A1, arg2: A2, arg3: A3): R2 {
        return super.emitInternal(arg1, arg2, arg3);
    }
}

export class Signal4<A1, A2, A3, A4, R = void, R2 = R> extends SignalBase<R, R2> {
    constructor(aggregator?: Aggregator<R, R2>) {
        super(4, aggregator);
    }

    public add(listener: (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => R, context?: Context): SignalSlot<(arg1: A1, arg2: A2, arg3: A3, arg4: A4) => R> {
        return super.addInternal(listener, context);
    }

    public remove(listener: (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => R, context?: Context): boolean {
        return super.removeInternal(listener, context);
    }

    public has(listener: (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => R, context?: Context): boolean {
        return super.hasInternal(listener, context);
    }

    public emit(arg1: A1, arg2: A2, arg3: A3, arg4: A4): R2 {
        return super.emitInternal(arg1, arg2, arg3, arg4);
    }
}
