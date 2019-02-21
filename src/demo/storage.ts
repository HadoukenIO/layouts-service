import {SavedWorkspace} from './LayoutsUI';

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

    public get(key: string): SavedWorkspace {
        return JSON.parse(this.storage.getItem(key) || '');
    }

    public set(key: string, value: SavedWorkspace) {
        this.storage.setItem(key, JSON.stringify(value));
    }
}

export const getLayout = (layoutName: string): SavedWorkspace => {
    return layouts.get(layoutName);
};

export const saveLayout = (layout: SavedWorkspace) => {
    layouts.set(layout.id, layout);
};

export const getAllLayoutIDs = (): string[] => {
    return Object.keys(localStorage);
};

export const layouts = new LayoutStore();
