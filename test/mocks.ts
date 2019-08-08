import {WorkspaceWindow, WorkspaceApp, Workspace} from '../src/client/workspaces';

export function getMockWorkspaceWindow(): WorkspaceWindow {
    return {
        uuid: '',
        name: '',
        url: '',
        isShowing: true,
        state: 'normal',
        frame: false,
        bounds: {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: 0,
            height: 0
        },
        windowGroup: [],
        isTabbed: false
    };
}

export function getMockWorkspaceApp(): WorkspaceApp {
    return {
        uuid: '',
        mainWindow: {...getMockWorkspaceWindow()},
        childWindows: []
    };
}

export function getMockWorkspace(): Workspace {
    return {
        type: 'workspace',
        schemaVersion: '',
        monitorInfo: {
            deviceScaleFactor: 1,
            dpi: {x: 1, y: 1},
            nonPrimaryMonitors: [],
            primaryMonitor: {
                available: {
                    dipRect: {
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0
                    },
                    scaledRect: {
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0
                    }
                },
                availableRect: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                },
                deviceId: '',
                displayDeviceActive: true,
                deviceScaleFactor: 1,
                monitorRect: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                },
                name: 0,
                dpi: {x: 1, y: 1},
                monitor: {
                    dipRect: {
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0
                    },
                    scaledRect: {
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0
                    }
                }
            },
            reason: '',
            taskBar: {
                edge: '',
                rect: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                },
                dipRect: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                },
                scaledRect: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                }
            },
            virtualScreen: {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                dipRect: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                },
                scaledRect: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                }
            }
        },
        apps: [],
        tabGroups: []
    };
}
