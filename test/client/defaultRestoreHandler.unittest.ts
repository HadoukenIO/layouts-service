import {stub} from './utils/FinMock';

stub();

// This import needs to be after fin is defined in stub contrary to eslint rules
// eslint-disable-next-line import/order
import {defaultRestoreHandler, WorkspaceApp} from '../../src/client/workspaces';

const validWorkspaceApp: WorkspaceApp = {
    childWindows: [
        {
            bounds: {
                top: 100, left: 100, bottom: 300, right: 300, width: 200, height: 200
            },
            frame: true,
            isShowing: true,
            isTabbed: false,
            name: 'child-1',
            state: 'normal',
            url: 'http://localhost:1337/unit-test-url',
            uuid: 'test-app-uuid',
            windowGroup: []
        }
    ],
    mainWindow: {
        bounds: {
            top: 100, left: 100, bottom: 300, right: 300, width: 200, height: 200
        },
        frame: true,
        isShowing: true,
        isTabbed: false,
        name: 'test-app-uuid',
        state: 'normal',
        url: 'http://localhost:1337/unit-test-url',
        uuid: 'test-app-uuid',
        windowGroup: []
    },
    uuid: 'test-app-uuid'
};

describe('When calling defaultRestoreHandler', () => {
    test('temp', async () => {
        await expect(await defaultRestoreHandler(validWorkspaceApp)).not.toThrow();
    });
});
