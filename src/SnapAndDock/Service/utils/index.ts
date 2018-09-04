import {WindowIdentity} from './window';


export interface AppIdentity { uuid: string; }


export function fail(message: string): never {
  throw new Error(message);
}

export function getWindowIdentity(payload: WindowIdentity): WindowIdentity {
  return {uuid: payload.uuid, name: payload.name};
}

export const identityMatch = (id1: WindowIdentity, id2: WindowIdentity) => {
  return id1.uuid === id2.uuid && id1.name === id2.name;
};

export function between(v1: number, v2: number, test: number) {
  const min = Math.min(v1, v2);
  const max = Math.max(v1, v2);
  return min < test && test < max;
}