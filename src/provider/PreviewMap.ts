/**
 * Allowed preview types.
 */
export enum PreviewType {
    TAB = 'tab',
    SNAP = 'snap'
}

/**
 * Overlay valid key
 */
export enum Validity {
    VALID = 'overlayValid',
    INVALID = 'overlayInvalid'
}

const PREVIEW_TYPES: PreviewType[] = Object.keys(PreviewType).map(k => k.toLowerCase()) as PreviewType[];

/**
 * Map of each preview type and its valid states.
 */
export type PreviewMap<T> = {
    readonly [K in PreviewType]: {
        [Validity.VALID]: T;
        [Validity.INVALID]: T;
    }
}

export type EntryFunction<T> = (entry: T, previewType: PreviewType, validity: Validity) => void;

export type CreateEntryFunction<T> = (previewType: PreviewType, validity: Validity) => T;
/**
 * Generate a PreviewMap.
 */
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
 */
export async function forEachPreviewMap<T>(map: PreviewMap<T>, func: EntryFunction<T>): Promise<void> {
    for (const key in map){
        const previewType = key as PreviewType;
        await func(map[previewType][Validity.VALID], previewType, Validity.VALID);
        await func(map[previewType][Validity.INVALID], previewType, Validity.INVALID);
    }
}
