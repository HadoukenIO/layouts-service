export class DeferredPromise<T = void>{
    private readonly _promise: Promise<T>;
    private _resolve!: (value?: T) => void;
    private _reject!: (reason?: any) => void;

    public get promise() {
        return this._promise;
    }

    public get resolve() {
        return this._resolve;
    }

    public get reject() {
        return this._reject;
    }

    constructor() {
        const promise = new Promise<T>((res, rej) => {
            this._resolve = res;
            this._reject = rej;
        });
        this._promise = promise;
    }
}
