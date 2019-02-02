import {ConfigurationObject} from '../../../gen/provider/config/layouts-config';
import {Scope} from '../../../gen/provider/config/scope';
import {WindowIdentity} from '../../../src/provider/model/DesktopWindow';
import {executeJavascriptOnService} from '../../demo/utils/serviceUtils';

export async function getConfig(scope: Scope): Promise<ConfigurationObject> {
    return await executeJavascriptOnService(function(this: ProviderWindow, scope: Scope): ConfigurationObject {
        return this.config.query(scope);
    }, scope);
}

export async function getAppConfig(uuid: string): Promise<ConfigurationObject> {
    return getConfig({level: 'application', uuid});
}

export async function getWindowConfig(identity: WindowIdentity): Promise<ConfigurationObject> {
    return getConfig({level: 'window', ...identity});
}

export async function addRuleToProvider(scope: Scope, config: ConfigurationObject): Promise<void> {
    return executeJavascriptOnService(function(this: ProviderWindow, data) {
        this.config.add(data.scope, data.config);
    }, {scope, config});
}
