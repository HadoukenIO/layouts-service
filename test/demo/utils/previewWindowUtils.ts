import {Identity} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import deepEqual from 'fast-deep-equal';

import {Overlay} from '../../../gen/provider/config/layouts-config';
import {SERVICE_IDENTITY} from '../../../src/client/internal';
import {createPreviewMap, PreviewMap, PreviewType, Validity} from '../../../src/provider/PreviewMap';

import {executeJavascriptOnService} from './serviceUtils';

export function getPreviewWindows(): PreviewMap<_Window>{
    return createPreviewMap<_Window>((previewType, validity) => {
        return fin.Window.wrapSync({...SERVICE_IDENTITY, name: `preview-${previewType}-${validity}`});
    });
}

export function getAllPreviewWindowsStyles(): PreviewMap<Promise<Overlay>> {
    return createPreviewMap<Promise<Overlay>>(async (previewType, validity) => {
        return getPreviewWindowStyle(previewType, validity);
    });
}

export async function getPreviewWindowStyle(previewKey: PreviewType, valid: Validity): Promise<Overlay> {
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
