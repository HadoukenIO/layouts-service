import {SnapService} from './SnapService';
import {win10Check} from './utils/platform';

fin.desktop.main(main);

async function init() {
    await win10Check;
    return await registerService();
}

async function registerService() {
    const providerChannel = await fin.desktop.Service.register();
    providerChannel.register('undock', (identity) => {
        // tslint:disable-next-line:no-any
        (window as any).service.undock(identity);
    });
    providerChannel.register('deregister', (identity) => {
        // tslint:disable-next-line:no-any
        (window as any).service.deregister(identity);
    });

    return providerChannel;
}

export function main() {
    // tslint:disable-next-line:no-any
    (window as any).service = new SnapService();
    //@ts-ignore
    return init();
}
