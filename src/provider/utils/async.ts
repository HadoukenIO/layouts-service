/**
 * Creates a deferred promise and returns it along with handlers to resolve/reject it imperatively
 * @returns a tuple with the promise and its resolve/reject handlers
 */
export function deferredPromise<T = void>(): [Promise<T>, (value?: T) => void, (reason?: any) => void] {
    let res: (value?: T) => void;
    let rej: (reason?: any) => void;
    const p = new Promise<T>((r, rj) => {
        res = r;
        rej = rj;
    });
    return [p, res!, rej!];
}
