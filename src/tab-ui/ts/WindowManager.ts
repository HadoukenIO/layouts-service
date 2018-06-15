export class WindowManager {
	private static INSTANCE: WindowManager;

	private selfWindow!: fin.OpenFinWindow;

	constructor() {
		if (WindowManager.INSTANCE) {
			return WindowManager.INSTANCE;
		}

		this.selfWindow = fin.desktop.Window.getCurrent();

		WindowManager.INSTANCE = this;
	}

	public exit(): void {
		this.selfWindow.close();
	}

	public minimize(): void {
		this.selfWindow.minimize();
	}

	public maximize(): void {
		// this.selfWindow.maximize();
	}

	public popout(): void {
		// popout all windows
	}

	public static get instance(): WindowManager {
		if (WindowManager.INSTANCE) {
			return WindowManager.INSTANCE;
		} else {
			return new WindowManager();
		}
	}
}
