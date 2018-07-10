// tslint:disable-next-line:no-any
type Context = any;

class SignalBase<R, R2> {
    private length: number;
    private slots: Array<{callback: Function, context: Context}>;

    private aggregator: Aggregator<R, R2>|null;

    constructor(length: number, aggregator?: Aggregator<R, R2>) {
        this.length = length;
        this.slots = [];
        this.aggregator = aggregator || null;
    }

    protected addInternal(callback: Function, context?: Context): void {
        if (callback.length === this.length) {
            this.slots.push({callback, context});
        } else {
            throw new Error('Callback function must accept ' + this.length + ' arguments');
        }
    }

    protected removeInternal(callback: Function, context?: Context): void {
        const index: number = this.slots.findIndex((c) => c.callback === callback && c.context === context);

        if (index >= 0) {
            this.slots.splice(index, 1);
        }
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
}

export type Aggregator<R, R2> = (items: R[]) => R2;

export class Signal0<R = void, R2 = R> extends SignalBase<R, R2> {
    constructor(aggregator?: Aggregator<R, R2>) {
        super(0, aggregator);
    }

    add(listener: () => R, context?: Context): void {
        super.addInternal(listener, context);
    }

    remove(listener: () => R, context?: Context): void {
        super.removeInternal(listener, context);
    }

    emit(): R2|null {
        return super.emitInternal();
    }
}

export class Signal1<A1, R = void, R2 = R> extends SignalBase<R, R2> {
    constructor(aggregator?: Aggregator<R, R2>) {
        super(1, aggregator);
    }

    add(listener: (arg1: A1) => R, context?: Context): void {
        super.addInternal(listener, context);
    }

    remove(listener: (arg1: A1) => R, context?: Context): void {
        super.removeInternal(listener, context);
    }

    emit(arg1: A1): R2|null {
        return super.emitInternal(arg1);
    }
}

export class Signal2<A1, A2, R = void, R2 = R> extends SignalBase<R, R2> {
    constructor(aggregator?: Aggregator<R, R2>) {
        super(2, aggregator);
    }

    add(listener: (arg1: A1, arg2: A2) => R, context?: Context): void {
        super.addInternal(listener, context);
    }

    remove(listener: (arg1: A1, arg2: A2) => R, context?: Context): void {
        super.removeInternal(listener, context);
    }

    emit(arg1: A1, arg2: A2): R2|null {
        return super.emitInternal(arg1, arg2);
    }
}

export class Signal3<A1, A2, A3, A4, R = void, R2 = R> extends SignalBase<R, R2> {
    constructor(aggregator?: Aggregator<R, R2>) {
        super(3, aggregator);
    }

    add(listener: (arg1: A1, arg2: A2, arg3: A3) => R, context?: Context): void {
        super.addInternal(listener, context);
    }

    remove(listener: (arg1: A1, arg2: A2, arg3: A3) => R, context?: Context): void {
        super.removeInternal(listener, context);
    }

    emit(arg1: A1, arg2: A2, arg3: A3): R2|null {
        return super.emitInternal(arg1, arg2, arg3);
    }
}

export class Signal4<A1, A2, A3, A4, R = void, R2 = R> extends SignalBase<R, R2> {
    constructor(aggregator?: Aggregator<R, R2>) {
        super(4, aggregator);
    }

    add(listener: (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => R, context?: Context): void {
        super.addInternal(listener, context);
    }

    remove(listener: (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => R, context?: Context): void {
        super.removeInternal(listener, context);
    }

    emit(arg1: A1, arg2: A2, arg3: A3, arg4: A4): R2|null {
        return super.emitInternal(arg1, arg2, arg3, arg4);
    }
}
