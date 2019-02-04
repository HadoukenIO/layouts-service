import {Window} from 'hadouken-js-adapter';
import {Point} from 'hadouken-js-adapter/out/types/src/api/system/point';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {WindowIdentity} from '../../client/types';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopWindow} from '../model/DesktopWindow';
import {Signal0, Signal2} from '../Signal';
import { MonitorInfo, DipRect } from 'hadouken-js-adapter/out/types/src/api/system/monitor';

/**
 * Handles the Drag Window which appears when API drag and drop is initialized.
 */
export class DragWindowManager {
    /**
     * Fires when a tab is in process of being dragged around over the dragWindow.  This will let us know which window + X/Y its position.
     *
     * Arguments: (window: DesktopWindow, position: Point)
     */
    public static readonly onDragOver: Signal2<DesktopWindow, Point> = new Signal2();

    /**
     * Fires when a tab has been dropped on the drag window, indicating an end to the drag/drop operation.
     *
     * Arguments: None.
     */
    public static readonly onDragDrop: Signal0 = new Signal0();

    // Multiple definitions of setTimeout/clearTimeout, and not possible to point TSC at the correct (non-Node) definition.
    // Usecase: failsafe for the drag window overlay should somehow it not close, the user would be "locked out" of the desktop.
    private _hideTimeout: number|NodeJS.Timer;

    /**
     * The drag overlay window
     */
    private _window!: fin.OpenFinWindow;

    /**
     * The active window (tab) which triggered the overlay to show.
     */
    private _sourceWindow: DesktopWindow|null;

    /**
     * The virtual screen bounds which covers all monitors of the desktop.
     */
    private _virtualScreen!: DipRect;

    private _model: DesktopModel;

    constructor(model: DesktopModel) {
        this._model = model;
        this._sourceWindow = null;
        this._hideTimeout = -1;
        this.createDragWindow();

        fin.System.addListener('monitor-info-changed', () => {
            this.setWindowBounds();
        });
    }

    /**
     * Shows the drag window overlay.
     */
    public showWindow(source: WindowIdentity): void {
        this._sourceWindow = this._model.getWindow(source);

        this._window.show();
        this._window.focus();

        this.resetHideTimer();
    }

    /**
     * Hides the drag window overlay.
     */
    public hideWindow(): void {
        DragWindowManager.onDragDrop.emit();
        this._window.hide();

        clearTimeout(this._hideTimeout as number);
        this._hideTimeout = -1;
    }

    private resetHideTimer(): void {
        clearTimeout(this._hideTimeout as number);
        this._hideTimeout = -1;

        this._hideTimeout = setTimeout(() => {
            this._window.hide();
        }, 30000);
    }

    /**
     * Creates the drag overlay window.
     */
    private async createDragWindow(): Promise<void> {
        await new Promise(resolve => {
            this._window = new fin.desktop.Window(
                {
                    name: 'TabbingDragWindow',
                    url: 'about:blank',
                    defaultHeight: 1,
                    defaultWidth: 1,
                    defaultLeft: 0,
                    defaultTop: 0,
                    saveWindowState: false,
                    autoShow: true,
                    opacity: 0.6,
                    frame: false,
                    waitForPageLoad: false,
                    alwaysOnTop: true,
                    showTaskbarIcon: false,
                    smallWindow: true
                },
                () => {
                    resolve();
                });
        });

        await this.setWindowBounds();

        const nativeWin = this._window.getNativeWindow();

        nativeWin.document.body.addEventListener('dragover', (ev: DragEvent) => {
            DragWindowManager.onDragOver.emit(this._sourceWindow!, {x: ev.screenX + this._virtualScreen.left, y: ev.screenY + this._virtualScreen.top});
            this.resetHideTimer();

            ev.preventDefault();
            ev.stopPropagation();

            return true;
        });

        nativeWin.document.body.addEventListener('drop', (ev: DragEvent) => {
            DragWindowManager.onDragDrop.emit();
            this.hideWindow();

            ev.preventDefault();
            ev.stopPropagation();
            return true;
        });

        
    }

    /**
     * Updates the in memory virtual screen bounds and positions the drag window accordingly.
     * 
     * This should only be called on initalization and on 'monitor info changed' events.
     */
    private async setWindowBounds() {
        const monitorInfo: MonitorInfo = await fin.System.getMonitorInfo();
        this._virtualScreen = monitorInfo.virtualScreen;

        this._window.setBounds(this._virtualScreen.left, this._virtualScreen.top, Math.abs(this._virtualScreen.left - this._virtualScreen.right),Math.abs(this._virtualScreen.top - this._virtualScreen.bottom));
        this._window.hide();
    }
}
