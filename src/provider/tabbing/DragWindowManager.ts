import {DipRect, MonitorInfo} from 'hadouken-js-adapter/out/types/src/api/system/monitor';
import {Point} from 'hadouken-js-adapter/out/types/src/api/system/point';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {DesktopModel} from '../model/DesktopModel';
import {DesktopWindow} from '../model/DesktopWindow';
import {Signal2, Signal1} from '../Signal';

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
    public static readonly onDragDrop: Signal1<DesktopWindow> = new Signal1();

    // Multiple definitions of setTimeout/clearTimeout, and not possible to point TSC at the correct (non-Node) definition.
    // Usecase: failsafe for the drag window overlay should somehow it not close, the user would be "locked out" of the desktop.
    private _hideTimer: number|NodeJS.Timer;

    /**
     * Timeout for the drag window failsafe.
     * Consideration must be taken for the case of user dragging tab on top of the source tabstrip - Timer is not cleared or reset as no event from us is generated.
     */
    private readonly HIDE_TIMEOUT = 30000;

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
        this._hideTimer = -1;
        this.createDragWindow();

        fin.System.addListener('monitor-info-changed', event => {
            this.setWindowBounds(event.virtualScreen);
        });
    }

    /**
     * Shows the drag window overlay.
     */
    public showWindow(source: DesktopWindow): void {
        this._sourceWindow = source;

        this._window.show();
        this._window.focus();

        this.setHideTimer();
    }

    /**
     * Hides the drag window overlay.
     */
    public hideWindow(): void {
        // Check if we've got a timer running.  If not then we're liking being called from an invalid drag end event (Erroneous or duplicate call)
        if(this._hideTimer !== -1){
            DragWindowManager.onDragDrop.emit(this._sourceWindow!);
        }

        this.clearHideTimer();
        this._window.hide();
    }


    private setHideTimer(): void {
        this.clearHideTimer();

        this._hideTimer = setTimeout(() => {
            this._window.hide();
        }, this.HIDE_TIMEOUT);
    }

    private clearHideTimer(): void {
        clearTimeout(this._hideTimer as number);
        this._hideTimer = -1;
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
                    opacity: 0.01,
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

        this.setWindowBounds();

        const nativeWin = this._window.getNativeWindow();

        nativeWin.document.body.addEventListener('dragover', (ev: DragEvent) => {
            DragWindowManager.onDragOver.emit(this._sourceWindow!, {x: ev.screenX + this._virtualScreen.left, y: ev.screenY + this._virtualScreen.top});
            this.setHideTimer();

            ev.preventDefault();
            ev.stopPropagation();

            return true;
        });

        nativeWin.document.body.addEventListener('drop', (ev: DragEvent) => {    
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
    private async setWindowBounds(virtualScreen?: DipRect) {
        if (!virtualScreen) {
            const monitorInfo: MonitorInfo = await fin.System.getMonitorInfo();
            this._virtualScreen = monitorInfo.virtualScreen;
        } else {
            this._virtualScreen = virtualScreen;
        }

        this._window.setBounds(
            this._virtualScreen.left,
            this._virtualScreen.top,
            this._virtualScreen.right - this._virtualScreen.left,
            this._virtualScreen.bottom - this._virtualScreen.top);
        this._window.hide();
    }
}
