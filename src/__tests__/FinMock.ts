/**
 * @function createFinMock Attaches a fin mock to the window
 */

// tslint:disable:no-any Anys exist in the openfin type def

export function createFinMock(): void {
	(window as Window & { fin: any }).fin = {
		desktop: {
			InterApplicationBus: {
				send: (uuid: string, topic: string, message: any): void => {},
				subscribe: (uuid: string, topic: string, callback: Function, ack: Function, nack: Function): void => {}
			}
		}
	};
}
