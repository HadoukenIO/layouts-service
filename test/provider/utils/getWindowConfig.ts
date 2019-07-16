import {Identity} from 'openfin/_v2/main';

import {ConfigurationObject, Scope} from '../../../gen/provider/config/layouts-config';
import {executeJavascriptOnService} from '../../demo/utils/serviceUtils';

export async function getWindowConfig(identity: Identity): Promise<ConfigurationObject> {
    return executeJavascriptOnService(function (this: ProviderWindow, identity: Identity): ConfigurationObject {
        const scope: Scope = {level: 'window', uuid: identity.uuid, name: identity.name || identity.uuid};
        return this.config.query(scope);
    }, identity);
}
