import {Fin} from 'hadouken-js-adapter';

declare const global: NodeJS.Global&{__FIN__: Fin};
export const fin = global.__FIN__;
