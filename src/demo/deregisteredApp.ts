import * as Layouts from '../client/main';

export {createChild, onAppRes} from './normalApp';

// Do not snap to other windows
Layouts.deregister();
