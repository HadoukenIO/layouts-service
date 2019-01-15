export class CalculatedProperty<T> {
    private lastValue: T|undefined;
    private requiresRefresh: boolean;
    private refreshFunc: () => T;

    constructor(refreshFunc: () => T, initialValue?: T) {
        this.lastValue = initialValue;
        this.requiresRefresh = arguments.length < 2;
        this.refreshFunc = refreshFunc;
    }

    public get value(): T {
        if (this.requiresRefresh) {
            // Trigger refresh function
            const value: T = this.refreshFunc();

            // Ensure callback returned a valid value
            if (value !== undefined) {
                this.lastValue = value;
            } else {
                // Callback appears invalid - didn't return a valid value
                console.error('CalculatedProperty is stale, but it\'s refresh function didn\'t provide an updated value', this);
            }
        }

        return this.lastValue!;
    }

    public markStale(): void {
        this.requiresRefresh = true;
    }

    public updateValue(value: T): void {
        this.lastValue = value;
        this.requiresRefresh = false;
    }
}
