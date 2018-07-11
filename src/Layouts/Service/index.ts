/*tslint:disable:no-any*/
import {Provider} from 'hadouken-js-adapter/out/types/src/api/services/provider';
import {registerService} from './provider';

declare var window: {localStorage: any; providerChannel: Provider;};

export let providerChannel: Provider;

export function main() {
    return registerService().then(channel => {
        window.providerChannel = providerChannel = channel;
    });
}

main();
