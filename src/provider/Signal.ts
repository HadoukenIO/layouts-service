// tslint:disable-next-line:no-any
type Context = any;

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

class SignalBase<R, R2> {
    private length: number;
    private slots: SignalSlot[];

    private aggregator: Aggregator<R, R2>|null;

    constructor(length: number, aggregator?: Aggregator<R, R2>) {
        this.length = length;
        this.slots = [];
        this.aggregator = aggregator || null;
    }

    protected addInternal<T extends Function>(callback: T, context?: Context): SignalSlot<T> {
        if (callback.length === this.length) {
            const slot = {callback, context, remove: () => this.removeSlot(slot)};
            this.slots.push(slot);
            return slot;
        } else {
            throw new Error('Callback function must accept ' + this.length + ' arguments');
        }
    }

    protected removeInternal<T extends Function>(callback: T, context?: Context): boolean {
        const index: number = this.slots.findIndex((c) => c.callback === callback && c.context === context);

        if (index >= 0) {
            this.slots.splice(index, 1);
            return true;
        } else {
            return false;
        }
    }

    protected hasInternal(callback: Function, context?: Context): boolean {
        return this.slots.findIndex((c) => c.callback === callback && c.context === context) >= 0;
    }

    // tslint:disable-next-line:no-any
    protected emitInternal(...args: any[]): R2|null {
        const callbacks = this.slots.slice();  // Clone array, in case a callback modifies this signal

        if (!this.aggregator) {
            callbacks.forEach((callback) => {
                callback.callback.apply(callback.context, args);
            });
            return null;
        } else {
            return this.aggregator(callbacks.map(c => c.callback.apply(c.context, args)));
        }
    }

    private removeSlot(slot: SignalSlot): void {
        const index: number = this.slots.indexOf(slot);

        if (index >= 0) {
            this.slots.splice(index, 1);
        }
    }
}

export type Aggregator<R, R2> = (items: R[]) => R2;

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

    public emit(): R2|null {
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

    public emit(arg1: A1): R2|null {
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

    public emit(arg1: A1, arg2: A2): R2|null {
        return super.emitInternal(arg1, arg2);
    }
}

export class Signal3<A1, A2, A3, A4, R = void, R2 = R> extends SignalBase<R, R2> {
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

    public emit(arg1: A1, arg2: A2, arg3: A3): R2|null {
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

    public emit(arg1: A1, arg2: A2, arg3: A3, arg4: A4): R2|null {
        return super.emitInternal(arg1, arg2, arg3, arg4);
    }
}
