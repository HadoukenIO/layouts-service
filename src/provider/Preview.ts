import {DesktopSnapGroup} from './model/DesktopSnapGroup';
import {Point, PointUtils} from './snapanddock/utils/PointUtils';
import {Target} from './WindowHandler';

const PREVIEW_SUCCESS = '#3D4059';
const PREVIEW_SUCCESS_RESIZE = PREVIEW_SUCCESS;
const PREVIEW_FAILURE = `repeating-linear-gradient(45deg, #3D4059, #3D4059 .25em, #C24629 0, #C24629 .5em)`;

interface PreviewWindow {
    window: fin.OpenFinWindow;
    nativeWindow: Window|null;
    halfSize: Point;
}

/**
 * Visual indicator of the current stap target.
 *
 * Will create colored rectangles based on the given group. Rectangle color will be set according to snap validity.
 */
export class Preview {
    private pool: {active: fin.OpenFinWindow[]; free: fin.OpenFinWindow[]};

    private activeGroup: DesktopSnapGroup|null;
    private activeWindowPreview: PreviewWindow|null;

    // Just using a single window instance right now. Will update to use the pool at a later point.
    private tempWindow: PreviewWindow;
    private tempWindowIsActive: boolean;

    constructor() {
        this.pool = {active: [], free: [/*this.createWindow()*/]};

        this.activeGroup = null;
        this.activeWindowPreview = null;

        this.tempWindow = this.createWindow();
        this.tempWindowIsActive = false;
    }

    /**
     * Creates rectangles that match the windows in the given group, but offset by the specified distance.
     *
     * The 'isValid' parameter determines the color of the rectangles. The class also caches the group
     * argument to avoid having to re-create the rectangle objects on every call if the group hasn't changed.
     */
    public show(target: Target): void {
        const activeGroup = target.activeWindow.getSnapGroup();
        const groupHalfSize = activeGroup.halfSize;  // TODO: Will need to change once 'activeGroup' can have multiple windows (SERVICE-128)

        if (!this.tempWindowIsActive || this.activeGroup !== activeGroup) {
            this.tempWindowIsActive = true;

            this.setWindowSize(this.tempWindow, groupHalfSize).then(() => {
                if (this.tempWindowIsActive) {
                    this.tempWindow.window.show();
                }
            });
        }

        this.activeWindowPreview = this.tempWindow;

        if (target.halfSize) {
            // Resize window to the size chosen in the snap target
            if (!PointUtils.isEqual(this.activeWindowPreview.halfSize, target.halfSize)) {
                this.setWindowSize(this.activeWindowPreview, target.halfSize);
            }
        } else {
            // Ensure the size of the preview matches the size of the window it represents
            const halfSize = target.activeWindow.getState().halfSize;

            if (!PointUtils.isEqual(this.activeWindowPreview.halfSize, halfSize)) {
                this.setWindowSize(this.activeWindowPreview, halfSize);
            }
        }

        this.setWindowPosition(this.tempWindow, activeGroup.center, groupHalfSize, target.offset);
        if (target.valid) {
            if (PointUtils.isEqual(this.activeWindowPreview.halfSize, groupHalfSize)) {
                this.activeWindowPreview.nativeWindow!.document.body.style.background = PREVIEW_SUCCESS;
            } else {
                this.activeWindowPreview.nativeWindow!.document.body.style.background = PREVIEW_SUCCESS_RESIZE;
            }
        } else {
            this.activeWindowPreview.nativeWindow!.document.body.style.background = PREVIEW_FAILURE;
        }

        this.activeGroup = activeGroup;
    }

    /**
     * Hides any visible preview windows. The window objects are hidden, but kept in a pool.
     */
    public hide(): void {
        if (this.tempWindowIsActive) {
            this.tempWindowIsActive = false;
            this.tempWindow.window.hide();
            this.activeGroup = null;
        }
    }

    private createWindow(): PreviewWindow {
        const defaultHalfSize = {x: 160, y: 160};
        const options: fin.WindowOptions = {
            name: 'previewWindow-',  // + Math.floor(Math.random() * 1000),
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

        const preview: PreviewWindow = {
            window: new fin.desktop.Window(
                options,
                () => {
                    preview.nativeWindow = preview.window.getNativeWindow();
                    preview.nativeWindow.document.body.style.background = PREVIEW_SUCCESS;
                }),
            nativeWindow: null,
            halfSize: defaultHalfSize
        };

        return preview;
    }

    private setWindowSize(preview: PreviewWindow, halfSize: Point): Promise<void> {
        return new Promise((resolve: () => void, reject: (reason: string) => void) => {
            // Update cached halfSize (do this immediately)
            PointUtils.assign(this.tempWindow.halfSize, halfSize);

            // Resize OpenFin window
            preview.window.resizeTo(halfSize.x * 2, halfSize.y * 2, 'top-left', resolve, reject);
        });
    }

    private setWindowPosition(preview: PreviewWindow, center: Point, halfSize: Point, snapOffset: Point): void {
        // Move OpenFin window
        preview.window.moveTo(center.x - halfSize.x + snapOffset.x, center.y - halfSize.y + snapOffset.y);

        // preview.window.animate(
        //     {position: {left: center.x - halfSize.x + snapOffset.x, top: center.y - halfSize.y + snapOffset.y, duration: 100}},
        //     {interrupt: true}
        // );
    }
}
