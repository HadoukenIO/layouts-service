import deepEqual from 'fast-deep-equal';

import {Scope, Overlay} from '../../gen/provider/config/layouts-config';

import {SnapTarget} from './snapanddock/Resolver';
import {Rectangle} from './snapanddock/utils/RectUtils';
import {TabTarget} from './tabbing/TabService';
import {eTargetType} from './WindowHandler';
import {ConfigStore} from './main';
import {Mask} from './config/ConfigUtil';
import {DesktopSnapGroup} from './model/DesktopSnapGroup';
import {eTransformType} from './model/DesktopWindow';
import {PreviewMap, createPreviewMap, Validity, PreviewType, forEachPreviewMap} from './preview/PreviewMap';

export type PreviewableTarget = SnapTarget | TabTarget;


type PreviewWindowData = {previewWindow: fin.OpenFinWindow, opacity: number};
/**
 * Visual indicator of the current snap target.
 *
 * Will create customizable preview rectangles based on the layout action type (snap|tab).
 * Rectangle styling will be set according to action validity (valid|invalid).
 */
export class Preview {
    private _activeWindowPreview: fin.OpenFinWindow | null;
    private readonly _previewWindows!: PreviewMap<PreviewWindowData>;
    private readonly _config: ConfigStore;
    private _lastScope!: Scope;

    constructor(config: ConfigStore) {
        this._activeWindowPreview = null;
        this._config = config;
        this._previewWindows = createPreviewMap<PreviewWindowData>((previewType, validity) => {
            return {
                previewWindow: this.createWindow(`preview-${previewType}-${validity}`),
                opacity: 0
            };
        });

        DesktopSnapGroup.onCreated.add(this.onCreated, this);
        DesktopSnapGroup.onDestroyed.remove(this.onCreated, this);
    }

    /**
     * Shows a rectangle that matches the snap/tab group target of a dragged window.
     *
     * The 'isValid' parameter determines the color of the rectangles, indicating if releasing the window will
     * successfully join a snap/tab group
     * @param target The preview target.
     */
    public show(target: PreviewableTarget): void {
        const valid: Validity = target.valid ? Validity.VALID : Validity.INVALID;
        const previewType = target.type.toLowerCase() as PreviewType;
        const {previewWindow, opacity} = this._previewWindows[previewType][valid];

        // Incase the window was not transformed and preloading didn't occur
        this.preload(target.activeWindow.scope);
        this.positionPreview(previewWindow, target);
        previewWindow.updateOptions({opacity});

        if (previewWindow !== this._activeWindowPreview) {
            this.hide();
            this._activeWindowPreview = previewWindow;
        }
    }

    /**
     * Hides the currently visible preview window
     */
    public hide(): void {
        // Opacity is used to hide the window instead of window.hide()
        // as it allows the window to be repainted.
        if (this._activeWindowPreview !== null) {
            this._activeWindowPreview.updateOptions({opacity: 0});
            this._activeWindowPreview = null;
        }
    }

    private onCreated(group: DesktopSnapGroup): void {
        group.onTransform.add(this.onTransform, this);
    }

    private onTransform(activeGroup: DesktopSnapGroup, type: Mask<eTransformType>): void {
        const target = activeGroup.windows[0];
        const scope: Scope = target.tabGroup ? target.tabGroup.activeTab.scope : target.scope;
        this.preload(scope);
    }

    /**
     * Load the CSS styles onto the preview windows and cache the opacity.
     * @param scope Window scope to get the overlay styles.
     */
    private preload(scope: Scope): void {
        if (deepEqual(this._lastScope, scope)) {
            return;
        }
        const query = this._config.query(scope).preview;
        forEachPreviewMap(this._previewWindows, (winData: PreviewWindowData, previewKey, validity) =>{
            const {previewWindow} = winData;
            const overlay = query[previewKey][validity];

            this._previewWindows[previewKey][validity].opacity = overlay.opacity;
            this.applyStyle(previewWindow, overlay);
        });

        this._lastScope = scope;
    }

    /**
     * Apply Overlay style to the given window.
     * @param window Window to apply style to.
     * @param style Overlay style.
     */
    private applyStyle(window: fin.OpenFinWindow, style: Required<Overlay>): void {
        const {document} = window.getNativeWindow();
        document.body.style.background = style.background;
        document.body.style.border = style.border;
    }

    private createWindow(name: string): fin.OpenFinWindow {
        const defaultHalfSize = {x: 160, y: 160};
        const options: fin.WindowOptions = {
            name,
            url: 'about:blank',
            defaultWidth: defaultHalfSize.x * 2,
            defaultHeight: defaultHalfSize.y * 2,
            opacity: 0,
            minimizable: false,
            maximizable: false,
            defaultTop: -10000,
            defaultLeft: -10000,
            showTaskbarIcon: false,
            frame: false,
            state: 'normal',
            autoShow: true,
            alwaysOnTop: true
        };

        const window = new fin.desktop.Window(options, () => {
            window.show();
        });

        return window;
    }

    private positionPreview(previewWindow: fin.OpenFinWindow, target: PreviewableTarget): void {
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
