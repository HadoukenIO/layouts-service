import {MonitorInfo} from 'hadouken-js-adapter/out/types/src/api/system/monitor';

import {WorkspaceAPI} from '../../../src/client/internal';
import {Workspace} from '../../../src/client/workspaces';
import {teardown} from '../../teardown';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {sendServiceMessage} from '../utils/serviceUtils';

import * as assert from 'power-assert';
import { assertRejects, assertDoesNotReject } from '../../provider/utils/assertions';

interface SchemaVersionTestOptions {
    versionString: string|undefined;
    shouldError: boolean;
}

afterEach(teardown);

testParameterized(
    (testOptions: SchemaVersionTestOptions) =>
        `Layout schemaVersion tests - versionString: "${testOptions.versionString}" - expected ${testOptions.shouldError ? '' : 'not '}to error`,
    [
        {versionString: '1.0.0', shouldError: false},
        {versionString: '1.3.2', shouldError: false},
        {versionString: '2.0.0', shouldError: true},
        {versionString: '9.61.37.37', shouldError: true},
        {versionString: 'invalid string', shouldError: true},
        {versionString: undefined, shouldError: true},
    ],
    async (testOptions: SchemaVersionTestOptions) => {
        const layoutToRestore = {...layoutBase, schemaVersion: testOptions.versionString};

        // This should be replaced with a proper client call once SERVICE-200 is merged (it has the import logic)
        const restorePromise = sendServiceMessage<Workspace, Workspace>(WorkspaceAPI.RESTORE_LAYOUT, layoutToRestore as Workspace);
        if (testOptions.shouldError) {
            await assertRejects(restorePromise);
        } else {
            await assertDoesNotReject(restorePromise);
        }
    });

const layoutBase: Workspace = {
    'apps': [],
    'monitorInfo': {} as MonitorInfo,
    'schemaVersion': '',
    'tabGroups': [],
    'type': 'workspace'
};