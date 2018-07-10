<<<<<<< HEAD
/*tslint:disable:no-any*/
import { Provider } from 'hadouken-js-adapter/out/types/src/api/services/provider';
import { registerService } from './provider';

declare var fin: any;
declare var window: {
  localStorage: any;
  providerChannel: Provider;
};

export let providerChannel: Provider;

export function main() {
  return registerService().then(channel => {
    window.providerChannel = providerChannel = channel;
  });
}

main();


=======
// import * as snapAndDock from '../../SnapAndDock/Service/index';

console.log('hello from the layout service');
(async () => {
     // const providerChannel = await snapAndDock.main();
     // providerChannel.register('foo', (asdf: string) => 'thanks for ' + asdf);
 })();
>>>>>>> c9c4953d855f917d5598a8cdd985e0b740f2e781
