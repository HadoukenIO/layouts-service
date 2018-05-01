export type FinCb<T> = (v: T) => void;
export type FinErrCb = (err: Error) => void;

export function p<T>(fn: (s: FinCb<T>, f: FinErrCb) => void): () => Promise<T>;
export function p<A0, T>(fn: (a: A0, s: FinCb<T>, f: FinErrCb) => void):
    (a: A0) => Promise<T>;
export function p<A0, A1, T>(
    fn: (a: A0, a1: A1, s: FinCb<T>, f: FinErrCb) => void): (a: A0, a1: A1) =>
    Promise<T>;
export function p<A0, A1, A2, T>(
    fn: (a: A0, a1: A1, a2: A2, s: FinCb<T>, f: FinErrCb) =>
        void): (a: A0, a1: A1, a2: A2) => Promise<T>;
export function p<A0, A1, A2, A3, T>(
    fn: (a: A0, a1: A1, a2: A2, a3: A3, s: FinCb<T>, f: FinErrCb) =>
        void): (a: A0, a1: A1, a2: A2, a3: A3) => Promise<T>;
// tslint:disable-next-line:no-any
export function p<T>(fn: (...args: any[]) => any) {
  // tslint:disable-next-line:no-any
  return (...args: any[]): Promise<T> =>
             new Promise((resolve, reject) => fn(...args, resolve, reject));
}

export async function promiseMap<T, U>(
    arr: T[], asyncF: (x: T, i: number, r: T[]) => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(
    arr: T[], asyncF: (x: T, i: number) => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(
    arr: T[], asyncF: (x: T) => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(
    arr: T[], asyncF: () => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(
    // tslint:disable-next-line:no-any
    arr: T[], asyncF: (...args: any[]) => any): Promise<U[]> {
  return Promise.all<U>(arr.map(asyncF));
}
