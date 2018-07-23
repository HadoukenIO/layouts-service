/*tslint:disable:no-any*/
import Application from "../node_modules/hadouken-js-adapter/out/types/src/api/application/application.d";
import { MonitorInfo } from "../node_modules/hadouken-js-adapter/out/types/src/api/system/monitor";
import System from "../node_modules/hadouken-js-adapter/out/types/src/api/system/system.d";
import Window from "../node_modules/hadouken-js-adapter/out/types/src/api/window/window.d";
import IAB from "../node_modules/hadouken-js-adapter/out/types/src/api/interappbus/interappbus.d";
export type FinCb<T> = (v: T) => void;
export type FinErrCb = (err: string | Error) => void;

// import { Bounds, WindowIdentity, WindowStats } from './Service/utils/window';

export type MonitorState = MonitorInfo;

export type Fin = {
	desktop: {
		main: (fn: Function) => void;
		System: {
			getHostSpecs: (s: FinCb<{ name: string }>, f: FinErrCb) => void;
			getAllWindows: (s: FinCb<any[]>, f: FinErrCb) => void;
			getMonitorInfo: (s: FinCb<MonitorInfo>, f: FinErrCb) => void;
			getAllApplications: (s: FinCb<any[]>) => void;
			addEventListener: (event: string, listener: (payload: any) => void) => any;
		};
		// Window: {
		//     wrap: (uuid: string, name: string) => OfWindow
		//     getCurrent: () => OfWindow
		// },
		Application: {
			wrap: (uuid: string) => any;
			getCurrent: () => any;
		};
		Service: {
			register: () => any;
			connect: (connectionObj: { uuid: string; name: string; payload?: any }) => ServiceClient;
		};
	};

	InterApplicationBus: IAB;
	System: System;
	Application: Application;
	Window: Window;
};

// export interface OfWindow extends WindowIdentity {
//     leaveGroup: (s: FinCb<void>, f: FinErrCb) => void;
//     animate: (animation: {}, options: {}, s: FinCb<void>, f: FinErrCb) => void;
//     joinGroup: (a: WindowIdentity, s: FinCb<void>, f: FinErrCb) => void;
//     updateOptions: (a: any) => void;
//     bringToFront: () => void;
//     getOptions: (s: FinCb<any>) => void;
//     isShowing: (s: FinCb<any>) => void;
//     hide: (s: FinCb<any>) => void;
//     show: (s: FinCb<any>) => void;
//     getBounds: (cb: (win: Bounds) => void) => void;
//     moveTo: (x: number, y: number, s: FinCb<void>, f: FinErrCb) => void;
//     addEventListener: (event: string, cb: (win: WindowStats) => void) => void;
//     removeEventListener: (event: string, cb: (win: WindowStats) => void) => void;
//     getCurrent: () => OfWindow;
// }
export interface ServiceClient {
	dispatch: (name: string, payload?: any) => Promise<any>;
	register: (name: string, action: (payload: any) => any) => void;
}
