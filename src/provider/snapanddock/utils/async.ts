export async function promiseMap<T, U>(arr: T[], asyncF: (x: T, i: number, r: T[]) => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(arr: T[], asyncF: (x: T, i: number) => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(arr: T[], asyncF: (x: T) => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(arr: T[], asyncF: () => Promise<U>): Promise<U[]>;
export async function promiseMap<T, U>(arr: T[], asyncF: (...args: any[]) => any): Promise<U[]> {
    return Promise.all<U>(arr.map(asyncF));
}

export async function promiseFilter<T>(arr: T[], asyncF: (x: T) => Promise<boolean>): Promise<T[]> {
    const result: T[] = [];

    for (let i = 0; i < arr.length; i++) {
        if (await asyncF(arr[i])) {
            result.push(arr[i]);
        }
    }

    return result;
}

export async function promiseForEach<T>(arr: T[], asyncF: (x: T) => Promise<void>): Promise<void> {
    for (let i = 0; i < arr.length; i++) {
        await asyncF(arr[i]);
    }
}
