import { providerChannel } from "./index";
import { Layout, LayoutName } from "../types";
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

export const getLayout = (layoutName: LayoutName): string/* Layout */ => {
    return layouts.get(layoutName);
};

export const saveLayout = (layout: Layout) => {
    providerChannel.publish('layout-saved', layout);
    layouts.set(layout.name, layout);
};

export const flexibleGetLayout = async (input: Layout | LayoutName): Promise<Layout> => {
    if (typeof input === 'string') {
        const layout = getLayout(input);
        if (layout && typeof layout === 'object') {
            return layout;
        }
    } else if (typeof input === 'object') {
        return input;
    }
    throw new Error('layout not found');
};

export const layouts = new Storage();
