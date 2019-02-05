import {SnapTarget} from './snapanddock/Resolver';
import {Rectangle} from './snapanddock/utils/RectUtils';
import {TabTarget} from './tabbing/TabService';
import {eTargetType, Target} from './WindowHandler';

const SUCCESS_PREVIEW_BACKGROUND_CSS = '#3D4059';
const FAILURE_PREVIEW_BACKGROUND_CSS = `repeating-linear-gradient(45deg, #3D4059, #3D4059 .25em, #C24629 0, #C24629 .5em)`;

export type PreviewableTarget = SnapTarget|TabTarget;

/**
 * Visual indicator of the current stap target.
 *
 * Will create colored rectangles based on the given group. Rectangle color will be set according to snap validity.
 */
export class Preview {
    private _activeWindowPreview: fin.OpenFinWindow|null;

    private _successPreviewWindow: fin.OpenFinWindow;
    private _failurePreviewWindow: fin.OpenFinWindow;

    constructor() {
        this._activeWindowPreview = null;

        this._successPreviewWindow = this.createWindow('successPreview', SUCCESS_PREVIEW_BACKGROUND_CSS);
        this._failurePreviewWindow = this.createWindow('failurePreview', FAILURE_PREVIEW_BACKGROUND_CSS);
    }

    /**
     * Shows a rectangle that matches the snap/tab group target of a dragged window.
     *
     * The 'isValid' parameter determines the color of the rectangles, indicating if releasing the window will
     * successfully join a snap/tab group
     */
    public show(target: PreviewableTarget): void {
        const previewWindow = target.valid ? this._successPreviewWindow : this._failurePreviewWindow;

        this.positionPreview(previewWindow, target);

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

    private createWindow(name: string, backgroundCssString: string): fin.OpenFinWindow {
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
            nativeWindow.document.body.style.background = backgroundCssString;
        });

        return window;
    }

    private positionPreview(previewWindow: fin.OpenFinWindow, target: PreviewableTarget) {
        const previewRect = this.generatePreviewRect(target);

        previewWindow!.setBounds(
            previewRect.center.x - previewRect.halfSize.x,
            previewRect.center.y - previewRect.halfSize.y,
            previewRect.halfSize.x * 2,
            previewRect.halfSize.y * 2);
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
