import {PreviewConfig} from '../../gen/provider/config/layouts-config';

import {SnapTarget} from './snapanddock/Resolver';
import {Rectangle} from './snapanddock/utils/RectUtils';
import {TabTarget} from './tabbing/TabService';
import {eTargetType} from './WindowHandler';
import {ConfigStore} from './main';
import {RequiredRecursive} from './config/ConfigUtil';

export type PreviewableTarget = SnapTarget | TabTarget;

interface Overlay {
    opacity?: number | null;
    /**
     * Background CSS
     */
    background?: string;
    /**
     * Border CSS
     */
    border?: string;
}

/**
 * Visual indicator of the current snap target.
 *
 * Will create colored rectangles based on the given group. Rectangle color will be set according to snap validity.
 */
export class Preview {
    private _activeWindowPreview: fin.OpenFinWindow | null;

    private _successPreviewWindow: fin.OpenFinWindow;
    private _failurePreviewWindow: fin.OpenFinWindow;
    private _config: ConfigStore;

    constructor(config: ConfigStore) {
        this._activeWindowPreview = null;
        this._config = config;
        this._successPreviewWindow = this.createWindow('successPreview');
        this._failurePreviewWindow = this.createWindow('failurePreview');
    }

    /**
     * Shows a rectangle that matches the snap/tab group target of a dragged window.
     *
     * The 'isValid' parameter determines the color of the rectangles, indicating if releasing the window will
     * successfully join a snap/tab group
     * @param target The preview target.
     */
    public show(target: PreviewableTarget): void {
        let previewWindow: fin.OpenFinWindow;
        let config: RequiredRecursive<PreviewConfig>;
        let overlay: Required<Overlay>;
        const query = this._config.query(target.activeWindow.scope).preview;

        if (target.type === eTargetType.SNAP) {
            config = query.snap;
        } else {
            config = query.tab;
        }

        if (target.valid) {
            previewWindow = this._successPreviewWindow;
            overlay = config.overlayValid;
        } else {
            previewWindow = this._failurePreviewWindow;
            overlay = config.overlayInvalid;
        }

        this.positionPreview(previewWindow, target);

        const nativeWindow = previewWindow.getNativeWindow();

        nativeWindow.document.body.style.background = overlay.background;
        nativeWindow.document.body.style.border = overlay.border;
        previewWindow.updateOptions({opacity: overlay.opacity!});

        if (previewWindow !== this._activeWindowPreview) {
            if (this._activeWindowPreview !== null) {
                this._activeWindowPreview.hide();
            }

            previewWindow.show();
            this._activeWindowPreview = previewWindow;
        }
    }

    /**
     * Hides the currently visible preview window
     */
    public hide(): void {
        if (this._activeWindowPreview !== null) {
            this._activeWindowPreview.hide();
            this._activeWindowPreview = null;
        }
    }

    private createWindow(name: string): fin.OpenFinWindow {
        const defaultHalfSize = {x: 160, y: 160};
        const options: fin.WindowOptions = {
            name,
            url: 'about:blank',
            defaultWidth: defaultHalfSize.x * 2,
            defaultHeight: defaultHalfSize.y * 2,
            opacity: 0.8,
            minimizable: false,
            maximizable: false,
            defaultTop: -1000,
            defaultLeft: -1000,
            showTaskbarIcon: false,
            frame: false,
            state: 'normal',
            autoShow: false,
            alwaysOnTop: true
        };

        const window = new fin.desktop.Window(options, () => {
            const nativeWindow = window.getNativeWindow();
        });

        return window;
    }

    private positionPreview(previewWindow: fin.OpenFinWindow, target: PreviewableTarget) {
        const previewRect = this.generatePreviewRect(target);

        previewWindow.setBounds(
            previewRect.center.x - previewRect.halfSize.x,
            previewRect.center.y - previewRect.halfSize.y,
            previewRect.halfSize.x * 2,
            previewRect.halfSize.y * 2
        );
    }

    private generatePreviewRect(target: PreviewableTarget): Rectangle {
        if (target.type === eTargetType.SNAP) {
            const activeState = target.activeWindow.currentState;
            const prevHalfSize = activeState.halfSize;

            const halfSize = target.halfSize || prevHalfSize;

            const center = {
                x: activeState.center.x + target.offset.x + (halfSize.x - prevHalfSize.x),
                y: activeState.center.y + target.offset.y + (halfSize.y - prevHalfSize.y)
            };

            return {center, halfSize};
        } else {
            // The target type here is "TAB"
            return target.dropArea;
        }
    }
}
