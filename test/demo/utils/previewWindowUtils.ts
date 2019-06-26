import {Identity} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import deepEqual from 'fast-deep-equal';

import {Preview, Overlay} from '../../../gen/provider/config/layouts-config';
import {SERVICE_IDENTITY} from '../../../src/client/internal';

import {executeJavascriptOnService} from './serviceUtils';

export enum OverlayValidKey {
    VALID = 'overlayValid',
    INVALID = 'overlayInvalid'
}

export type PreviewType = keyof Preview;

/* Map preview types (snap|tab) with their valid|invalid values */
export type PreviewMap<T> = {
    readonly [K in PreviewType]: ValidRecords<T>;
}

export type ValidRecords<T> = {
    [V in OverlayValidKey]: T;
};

type TestMapFunction<T> = (win: T, previewType: PreviewType, valid: OverlayValidKey, ...params: any[]) => void;

export async function testPreviewMap<T>(
    map: PreviewMap<T>,
    test: TestMapFunction<T>,
    ...args: any[]
): Promise<void> {
    for (const key in map) {
        const previewType = key as PreviewType;
        const record = map[previewType];
        await test(record.overlayValid, previewType, OverlayValidKey.VALID, ...args);
        await test(record.overlayInvalid, previewType, OverlayValidKey.INVALID, ...args);
    }
}

export function getPreviewWindows(): PreviewMap<_Window> {
    return {
        snap: {
            overlayValid: fin.Window.wrapSync({...SERVICE_IDENTITY, name: `preview-snap-${OverlayValidKey.VALID}`}),
            overlayInvalid: fin.Window.wrapSync({...SERVICE_IDENTITY, name: `preview-snap-${OverlayValidKey.INVALID}`})
        },
        tab: {
            overlayValid: fin.Window.wrapSync({...SERVICE_IDENTITY, name: `preview-tab-${OverlayValidKey.VALID}`}),
            overlayInvalid: fin.Window.wrapSync({...SERVICE_IDENTITY, name: `preview-tab-${OverlayValidKey.INVALID}`})
        }
    };
}

export async function getAllPreviewWindowsStyles(): Promise<PreviewMap<Overlay>> {
    return {
        tab: {
            overlayValid: await getPreviewWindowStyle('tab', OverlayValidKey.VALID),
            overlayInvalid: await getPreviewWindowStyle('tab', OverlayValidKey.INVALID)
        },
        snap: {
            overlayValid: await getPreviewWindowStyle('snap', OverlayValidKey.VALID),
            overlayInvalid: await getPreviewWindowStyle('snap', OverlayValidKey.INVALID)
        }
    };
}

export async function getPreviewWindowStyle(previewKey: PreviewType, valid: OverlayValidKey): Promise<Overlay> {
    const windowIdentity: Identity = {uuid: SERVICE_IDENTITY.uuid, name: `preview-${previewKey}-${valid}`};
    const {opacity} = await fin.Window.wrapSync(windowIdentity).getOptions();

    function getStyle(this: ProviderWindow, identity: Identity): Overlay {
        const win = fin.desktop.Window.wrap(identity.uuid, identity.name!);
        const {document} = win.getNativeWindow();
        const overlay: Overlay = {
            background: document.body.style.background || '',
            border: document.body.style.border || ''
        };
        return overlay;
    }

    const css = await executeJavascriptOnService<Identity, Overlay>(getStyle, windowIdentity);
    return {...css, opacity};
}

export function compareOverlays(a: Overlay, b: Overlay, ignoreOpacity: boolean = false): boolean {
    if (ignoreOpacity) {
        return deepEqual({...a, opacity: null}, {...b, opacity: null});
    }
    return deepEqual(a, b);
}

/**
 * Determines if a window is showing.
 * Currently opacity is used hide/show windows. `0 > = true`.
 * @param win Window to check visibility.
 */
export async function isPreviewShowing(win: _Window): Promise<boolean> {
    const {opacity} = await win.getOptions();
    if (opacity > 0) {
        return true;
    }
    return false;
}


/**
 * Convert a CSS string to how Chrome represents it.
 * @param rule
 */
export async function convertCSS(rule: CSSRule): Promise<string | null> {
    type CSSRule = [keyof CSSStyleDeclaration, string];

    function getString(this: ProviderWindow, declaration: CSSRule): string | null {
        const win = fin.desktop.Window.getCurrent();
        const {document} = win.getNativeWindow();
        const [attr, rule = ''] = declaration;
        // @ts-ignore read-only keys
        document.head.style[attr] = rule;
        const result = document.head.style[attr];
        // @ts-ignore read-only keys
        document.head.style[attr] = '';
        return result;
    }

    return executeJavascriptOnService(getString, rule);
}
