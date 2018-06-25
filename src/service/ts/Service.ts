
export class Service {
	constructor() {
		this._setupListeners();
	}

	private _setupListeners(): void {
		this._discoverRunningApplications();

		fin.desktop.System.addEventListener("application-started", this._onApplicationCreated.bind(this));
	}

	private _discoverRunningApplications(): void {
		fin.desktop.System.getAllApplications((applicationInfoList: fin.ApplicationInfo[]): void => {
			applicationInfoList.forEach((app: fin.ApplicationInfo): void => {
				if (app.isRunning && app.uuid !== fin.desktop.Application.getCurrent().uuid) {
					const application = fin.desktop.Application.wrap(app.uuid!);
					this._addTabsToApplication(application);
				}
			});
		});
	}

	private _addTabsToApplication(app: fin.OpenFinApplication): void {
		const appMainWindow = app.getWindow();

		// @ts-ignore TS doesnt think uuid is on the window object, but it is.
		this._createTabWindow(appMainWindow.uuid, appMainWindow.name);

		app.getChildWindows((children: fin.OpenFinWindow[]): void => {
			children.forEach((childWindow: fin.OpenFinWindow): void => {
				this._createTabWindow(app.uuid!, childWindow.name);
			});
		});

		// @ts-ignore TS complains about the event type for the following.
		app.addEventListener("window-created", (event: fin.WindowEvent) => {
			this._createTabWindow(event.uuid, event.name);
		});
	}

	private _onApplicationCreated(event: fin.SystemBaseEvent): void {
		const app = fin.desktop.Application.wrap(event.uuid);
		this._addTabsToApplication(app);
	}

	private _createTabWindow(uuid: string, name: string) {
		const tabWindow: fin.OpenFinWindow = new fin.desktop.Window({
			name: `${Math.random()*10000}`,
			url: 'http://localhost:9001/tab-ui/',
			customData: JSON.stringify({uuid, name}),
			autoShow: true,
			frame: false,
			resizable: false,
			showTaskbarIcon: false
		});
	}
}
