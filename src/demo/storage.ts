import {Workspace} from './LayoutsUI';

// STORAGE - TODO: use indexedDB?
class LayoutStore {
    protected storage!: Storage;

    constructor(externalStorage?: Storage) {
        if (externalStorage) {
            this.storage = externalStorage;
        } else if (window.localStorage) {
            this.storage = window.localStorage;
        }
    }

    public get(key: string): Workspace {
        return JSON.parse(this.storage.getItem(key) || '');
    }

    public set(key: string, value: Workspace) {
        this.storage.setItem(key, JSON.stringify(value));
    }
}

export const getLayout = (layoutName: string): Workspace => {
    return layouts.get(layoutName);
};

export const saveLayout = (layout: Workspace) => {
    layouts.set(layout.id, layout);
};

export const getAllLayoutIDs = (): string[] => {
    return Object.keys(localStorage);
};

export const layouts = new LayoutStore();
