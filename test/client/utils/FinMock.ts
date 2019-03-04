import {HostSpecs} from "hadouken-js-adapter/out/types/src/api/system/host-specs";
import {ApplicationInfo} from "hadouken-js-adapter/out/types/src/api/system/application";
import {WindowInfo} from "hadouken-js-adapter/out/types/src/api/system/window";
import {_Window} from "hadouken-js-adapter/out/types/src/api/window/window";
import {WindowIdentity} from "../../../src/client/main";
import {Application, Identity} from "hadouken-js-adapter";
import {ChannelProvider} from "hadouken-js-adapter/out/types/src/api/interappbus/channel/provider";
import {ConnectOptions} from "hadouken-js-adapter/out/types/src/api/interappbus/channel";
import {ChannelClient} from "hadouken-js-adapter/out/types/src/api/interappbus/channel/client";

// All applications/windows created through this stub can be identified from the following uuid/name:
const uuid = 'test', name = 'test';

class StubBase<I, O> {
	public identity: I;

	private options: O;

	constructor(identity: I, options?: O) {
		this.identity = identity;
		this.options = options || {} as O;
	}

	public getOptions(): Promise<O> {
		return Promise.resolve(this.options);
	}

	public addListener(type: string, listener: Function) {
	}

	public removeListener(type: string, listener: Function) {
	}
}

// @ts-ignore StubWindow doesn't actually extend the corresponding 'fin' type, but we will pretend it does
class StubWindow extends StubBase<WindowIdentity, fin.WindowOptions> implements _Window {
	constructor() {
		super({uuid, name});
	}
}

// @ts-ignore StubWindow doesn't actually extend the corresponding 'fin' type, but we will pretend it does
class StubApplication extends StubBase<{uuid: string}, fin.ApplicationOptions> implements Application {
	constructor() {
		super({uuid});
	}
}

class StubChannelClient {
	constructor(channelName: string) {
	}

	public get connections(): Identity[] {
		return [];
	}

	public register(topic: string, listener: Function): boolean {
		return true;
	}

	public dispatch(action: string, payload?: any): Promise<any> {
		return Promise.resolve();
	}

	// tslint:disable-next-line:no-any
	public setDefaultAction(func: (action?: string, payload?: any, senderIdentity?: WindowIdentity) => any): void {
	}
}

class StubChannelProvider {
	constructor(channelName: string) {
	}

	public get connections(): Identity[] {
		return [];
	}

	public onConnection(listener: Function): void {
	}

	public register(topic: string, listener: Function): boolean {
		return true;
	}

	// tslint:disable-next-line:no-any
	public dispatch(to: Identity, action: string, payload: any): Promise<any> {
		return Promise.resolve();
	}
}

// We still use a little of the V1 API in places...
class StubWindowV1 {
	public uuid: string;
	public name: string;

	constructor() {
		this.uuid = uuid;
		this.name = name;
	}
}

// tslint:disable-next-line:no-any
function cast<T>(value: any): T {
	return value as T;
}

// tslint:disable-next-line:no-any
export const fin: any = {
	desktop: {
		main: async (f: () => Promise<void>) => {
			try {
				const result = await f();
				return result;
			} catch(e) {
				console.error("Error in main", e.message, e.stack);
				throw e;
			}
		},
		getUuid: (): string => "7f44f2d9-bcc2-4ad4-b4a2-" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
		Window: StubWindowV1
	},
	Application: {
		me: {uuid: 'test'},
		getCurrent: (): Promise<Application> => Promise.resolve(cast<Application>(new StubApplication())),
		getCurrentSync: (): Application => cast<Application>(new StubApplication())
	},
	GlobalHotkey: {
		register: (hotkey: string, listener: Function): Promise<void> => Promise.resolve()
	},
	InterApplicationBus: {
		// tslint:disable-next-line:no-any
		send: (uuid: string, topic: string, message: any): Promise<void> => Promise.resolve(),
		subscribe: (uuid: string, topic: string, callback: Function, ack: Function, nack: Function): Promise<void> =>  Promise.resolve(),
		Channel: {
			create: (channelName: string): Promise<ChannelProvider> => Promise.resolve(cast<ChannelProvider>(new StubChannelProvider(channelName))),
			connect: (channelName: string, options?: ConnectOptions): Promise<ChannelClient> => Promise.resolve(cast<ChannelClient>(new StubChannelClient(channelName)))
		}
	},
	Window: {
		me: {uuid: 'test', name: 'test'},
		create: (options: fin.WindowOptions): Promise<_Window> => Promise.resolve(cast<_Window>(new StubWindow())),
		getCurrent: (): Promise<_Window> => Promise.resolve(cast<_Window>(new StubWindow())),
		getCurrentSync: (): _Window => cast<_Window>(new StubWindow())
	},
	System: {
		addListener: (eventType: string, listener: Function) => {},
		getAllApplications: (): Promise<ApplicationInfo[]> => Promise.resolve([]),
		getAllWindows: (): Promise<WindowInfo[]> => Promise.resolve([]),
		getHostSpecs: async (): Promise<HostSpecs> => Promise.resolve(cast<HostSpecs>({"name": "Windows 10 Professional"}))
	}
};

/**
 * Export a function that does nothing. Call this function from any test file that needs `fin` to exist before the 
 * start of the test.
 * 
 * To ensure that `fin` exists early enough, it must be attached to the window at the time this file is imported. 
 * However, if no exported symbols from this file are referenced within the test class, then the import will be 
 * ignored. Calling this "no-op" function is a way to ensure the file definitely gets imported.
 */
export function stub(): void {
}

// Add global 'fin' object to window
Object.assign(window, {
	fin,
	PACKAGE_VERSION: '0.0.0'
});
