import { AsyncWindow } from "./asyncWindow";
/**
 * Handles the Drag Window which appears when API drag and drop is initialized.
 */
export declare class DragWindowManager extends AsyncWindow {
    private _hideTimeout;
    constructor();
    /**
     * Initializes Async Methods required by this class.
     */
    init(): Promise<void>;
    /**
     * Shows the drag window overlay.
     */
    show(): void;
    /**
     * Hides the drag window overlay.
     */
    hide(): void;
    /**
     * Creates the drag overlay window.
     */
    private _createDragWindow;
}
