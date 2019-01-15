export class CalculatedProperty<T> {
    private lastValue: T|undefined;
    private requiresRefresh: boolean;
    private refreshFunc: () => void;

    constructor(refreshFunc: () => void, initialValue?: T) {
        this.lastValue = initialValue;
        this.requiresRefresh = arguments.length < 2;
        this.refreshFunc = refreshFunc;
    }

    public get value(): T {
        if (this.requiresRefresh) {
            // Trigger refresh function
            this.refreshFunc();

            // Ensure refresh function called `updateValue`
            if (this.requiresRefresh) {
                // Callback appears invalid - didn't return a valid value, and also didn't call `updateValue`.
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
