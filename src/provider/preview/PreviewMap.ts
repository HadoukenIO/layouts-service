/**
 * Allowed preview types.
 */
export enum PreviewType {
    TAB = 'tab',
    SNAP = 'snap'
}

export enum Validity {
    VALID = 'overlayValid',
    INVALID = 'overlayInvalid'
}

const PREVIEW_TYPES: PreviewType[] = Object.keys(PreviewType).map(k => k.toLowerCase()) as PreviewType[];
const VALIDITY: Validity[] = [Validity.VALID, Validity.INVALID];

export type PreviewMap<T> = {
    readonly [K in PreviewType]: ValidRecords<T>;
}

type ValidRecords<T> = {
    [V in Validity]: T;
};

export type EntryFunction<T> = (entry: T, previewType: PreviewType, validity: Validity, ...args: any[]) => void;

export type CreateEntryFunction<T> = (previewType: PreviewType, validity: Validity, ...args: any[]) => T;

export function createPreviewMap<T>(genFunction: CreateEntryFunction<T>): PreviewMap<T> {
    return PREVIEW_TYPES.reduce((previousAcc: PreviewMap<T>, previewType: PreviewType) => {
        return {
            ...previousAcc,
            [previewType]: {
                [Validity.VALID]: genFunction(previewType, Validity.VALID),
                [Validity.INVALID]: genFunction(previewType, Validity.INVALID)
            }
        };
    }, {} as PreviewMap<T>);
}

/**
 * Invoke a function on each entry in the given map.
 * @param map
 * @param func
 * @param args
 */
export async function forEachPreviewMap<T, A extends unknown[]>(map: PreviewMap<T>, func: EntryFunction<T>, ...args: A): Promise<void> {
    await PREVIEW_TYPES.forEach(async previewType => {
        await VALIDITY.forEach(async validity => {
            const entry = map[previewType][validity];
            await func(entry, previewType, validity, ...args);
        });
    });
}
