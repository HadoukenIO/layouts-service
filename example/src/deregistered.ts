import {deregister} from 'openfin-layouts';

deregister().then(() => console.log('deregistered')).catch(console.error);