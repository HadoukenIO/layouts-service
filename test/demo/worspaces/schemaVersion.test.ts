import {MonitorInfo} from 'hadouken-js-adapter/out/types/src/api/system/monitor';

import {Layout} from '../../../src/client/types';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {sendServiceMessage} from '../utils/serviceUtils';

interface SchemaVersionTestOptions {
    versionString: string|undefined;
    shouldError: boolean;
}

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
    async (t, testOptions: SchemaVersionTestOptions) => {
        const layoutToRestore = {...layoutBase, schemaVersion: testOptions.versionString};

        const restorePromise = sendServiceMessage<Layout, Layout>('restoreLayout', layoutToRestore as Layout);
        if (testOptions.shouldError) {
            await t.throws(restorePromise);
        } else {
            await t.notThrows(restorePromise);
        }
    });

const layoutBase: Layout = {
    'apps': [],
    'monitorInfo': {} as MonitorInfo,
    'schemaVersion': '',
    'tabGroups': [],
    'type': 'layout'
};