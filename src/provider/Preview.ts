import deepEqual from 'fast-deep-equal';

import {PreviewConfig, Preview as PreviewProps, Scope} from '../../gen/provider/config/layouts-config';

import {SnapTarget} from './snapanddock/Resolver';
import {Rectangle} from './snapanddock/utils/RectUtils';
import {TabTarget} from './tabbing/TabService';
import {eTargetType} from './WindowHandler';
import {ConfigStore} from './main';
import {Mask} from './config/ConfigUtil';
import {DesktopSnapGroup} from './model/DesktopSnapGroup';
import {eTransformType} from './model/DesktopWindow';

export type PreviewableTarget = SnapTarget | TabTarget;

export interface Overlay {
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

export type PreviewType = keyof PreviewProps;

export enum Validity {
    VALID = 'valid',
    INVALID = 'invalid'
}

export type PreviewWindows = {
    readonly [K in PreviewType]: PreviewValidityWindows;
}

export type PreviewValidityWindows = {
    readonly [V in Validity]: fin.OpenFinWindow;
};

const defaultScope: Scope = {level: 'window', uuid: '', name: ''};

/**
 * Visual indicator of the current snap target.
 *
 * Will create colored rectangles based on the given group. Rectangle color will be set according to snap validity.
 */
export class Preview {
    private _activeWindowPreview: fin.OpenFinWindow | null;
    private _previewWindows!: PreviewWindows;

    private _config: ConfigStore;
    private _lastScope!: Scope;

    constructor(config: ConfigStore) {
        this._activeWindowPreview = null;
        this._config = config;
        const query = this._config.query(defaultScope).preview;

        const previewTypes = Object.keys(query)
            .filter(key => eTargetType[key.toUpperCase() as eTargetType]) as PreviewType[];

        this._previewWindows = previewTypes.reduce((acc, previewKey) => {
            return {
                ...acc,
                [previewKey]: {
                    [Validity.VALID]: this.createWindow(`preview-${previewKey}-${Validity.VALID}`),
                    [Validity.INVALID]: this.createWindow(`preview-${previewKey}-${Validity.INVALID}`)
                }
            };
        }, {}) as PreviewWindows;

        DesktopSnapGroup.onCreated.add(this.onCreated, this);
    }

    private onCreated(group: DesktopSnapGroup): void {
        group.onTransform.add(this.onTransform, this);
    }

    private onTransform(activeGroup: DesktopSnapGroup, type: Mask<eTransformType>): void {
        const activeWindow = activeGroup.windows[0];
        const scope: Scope = activeWindow.tabGroup ? activeWindow.tabGroup.activeTab.scope : activeWindow.scope;
        this.preload(scope);
    }

    private preload(scope: Scope): void {
        if (deepEqual(this._lastScope, scope)) {
            return;
        }
        this.loadStyles(scope);
        this._lastScope = scope;
    }

    private loadStyles(scope: Scope): void {
        const query = this._config.query(scope).preview;

        for (const key in query) {
            const value = query[key as PreviewType];
            const {valid, invalid} = this._previewWindows[key as PreviewType];
            this.applyStyles(valid, value.overlayValid);
            this.applyStyles(invalid, value.overlayInvalid);
        }
    }

    private applyStyles(window: fin.OpenFinWindow, style: Required<Overlay>): void {
        const {document} = window.getNativeWindow();
        document.body.style.background = style.background;
        document.body.style.border = style.border;
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
        const previewWindow: fin.OpenFinWindow = this._previewWindows[previewType][valid];
        const scope: Scope = target.activeWindow.tabGroup ? target.activeWindow.tabGroup.activeTab.scope : target.activeWindow.scope;

        const overlayKey = target.valid ? 'overlayValid' : 'overlayInvalid';
        const query = this._config.query(scope).preview;
        const opacity = query[previewType][overlayKey].opacity!;

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
            const nativeWindow = window.getNativeWindow();
            window.show();
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
