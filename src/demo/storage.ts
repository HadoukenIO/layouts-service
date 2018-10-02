import {Layout, LayoutName} from '../client/types';
import {Workspace} from './LayoutsUI';

/*tslint:disable:no-any*/

// STORAGE - TODO: use indexedDB?
class Storage {
    protected storage: any;
    constructor(externalStorage?: any) {
        if (externalStorage) {
            this.storage = externalStorage;
        } else if (window.localStorage) {
            this.storage = window.localStorage;
        }
    }

    public get(key: string) {
        return JSON.parse(this.storage.getItem(key));
    }

    public set(key: string, value: any) {
        this.storage.setItem(key, JSON.stringify(value));
    }
}

export const getLayout = (layoutName: LayoutName): Workspace /* Layout */ => {
    return layouts.get(layoutName);
};

export const saveLayout = (layout: Workspace) => {
    layouts.set(layout.id, layout);
};

export const flexibleGetLayout = async(input: LayoutName): Promise<Workspace> => {
    if (typeof input === 'string') {
        const workspace = getLayout(input);
        if (workspace && typeof workspace === 'object') {
            return workspace;
        }
    } else if (typeof input === 'object') {
        // some validation here?
        return input;
    }
    throw new Error('layout not found');
};

export const getAllLayoutIDs = (): string[] => {
    return Object.keys(localStorage);
};

export const layouts = new Storage();
