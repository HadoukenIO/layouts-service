/*tslint:disable:no-any*/

declare var fin: any;

export interface ServiceClient {
  dispatch: (name: string, payload?: any) => Promise<any>;
  register: (name: string, action: (payload: any) => any) => void;
}
export interface ServiceIdentity {
  uuid: string;
  name: string;
}

export function exportClientFunction<T>(
    clientP: Promise<ServiceClient>,
    fn: (client: ServiceClient) => () => Promise<T>): () => Promise<T>;
export function exportClientFunction<T, A0>(
    clientP: Promise<ServiceClient>,
    fn: (client: ServiceClient) => (a: A0) => Promise<T>): (a: A0) =>
    Promise<T>;
export function exportClientFunction<T, A0, A1>(
    clientP: Promise<ServiceClient>,
    fn: (client: ServiceClient) => (a: A0, a1: A1) =>
        Promise<T>): (a: A0, a1: A1) => Promise<T>;
export function exportClientFunction<T, A0, A1, A2>(
    clientP: Promise<ServiceClient>,
    fn: (client: ServiceClient) => (a: A0, a1: A1, a2: A2) =>
        Promise<T>): (a: A0, a1: A1, a2: A2) => Promise<T>;
export function exportClientFunction<T, A0, A1, A2, A3>(
    clientP: Promise<ServiceClient>,
    fn: (client: ServiceClient) => (a: A0, a1: A1, a2: A2, a3: A3) =>
        Promise<T>): (a: A0, a1: A1, a2: A2, a3: A3) => Promise<T>;
export function exportClientFunction(
    clientP: Promise<ServiceClient>,
    func: (client: ServiceClient) => (...args: any[]) => Promise<any>) {
  return async (...args: any[]) => {
    const client = await clientP;
    return func(client)(...args);
  };
}

export async function createClientPromise(
    serviceIdentity: ServiceIdentity, version: string, payload = {}) {
  await new Promise((resolve, reject) => {
    if (typeof fin === 'undefined') {
      reject(
          'fin is not defined, This module is only intended for use in an OpenFin application.');
    }
    fin.desktop.main(() => resolve());
  });
  const client = await fin.desktop.Service.connect(
                     {...serviceIdentity, payload: {...payload, version}}) as
      ServiceClient;
  client.register('WARN', (payload: any) => console.warn(payload));
  return client;
}
