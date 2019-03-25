import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {stub} from './utils/FinMock';
import {ErrorMsgs} from '../../src/client/internal';

import {channelPromise} from '../../src/client/connection';
import {TabAPI, UpdateTabPropertiesPayload} from '../../src/client/internal';
import {tabbing, tabstrip, WindowIdentity} from '../../src/client/main';
import {TabProperties} from "../../src/client/tabbing";


stub();

let channel: ChannelClient;
let channelDispatch: jest.SpyInstance<Promise<any>, [string, any?]>;

beforeEach(async () => {
    jest.restoreAllMocks();
    channel = await channelPromise;
    channelDispatch = jest.spyOn(channel, 'dispatch');
});

describe('When calling updateTabProperties', () => {
    it('Calling with invalid uuid rejects with error message', async () => {
        const uuid: string = null!;
        const name = 'somename';
        const tabProperties: TabProperties = {title: 'sometitle', icon: 'someicon'};

        const promise = tabbing.updateTabProperties(tabProperties, {uuid, name});
        await expect(promise).rejects.toThrowError(ErrorMsgs.INVALID_IDENTITY_UUID);
    });

    it('Calling with invalid name assumes main application window', async () => {
        const uuid = 'testuuid';
        const name: string = null!;
        const properties: TabProperties = {title: 'sometitle', icon: 'someicon'};
        const expectedPayload: UpdateTabPropertiesPayload = {window: {uuid, name: uuid}, properties};

        await tabbing.updateTabProperties(properties, {uuid, name});
        await expect(channelDispatch).toBeCalledWith(TabAPI.UPDATETABPROPERTIES, expectedPayload);
    });

    it('Calling with invalid properties rejects with error message', async () => {
        const uuid = 'testuuid';
        const name = 'testname';

        const promise = tabbing.updateTabProperties(null!, {uuid, name});
        await expect(promise).rejects.toThrowError(ErrorMsgs.PROPERTIES_REQUIRED);
    });

    it('Calling with valid arguments sends a UPDATETABPROPERTIES message for the specified window', async () => {
        const uuid = 'someuuid';
        const name = 'somename';
        const properties: TabProperties = {title: 'sometitle', icon: 'someicon'};
        const expectedPayload: UpdateTabPropertiesPayload = {window: {uuid, name}, properties};

        await tabbing.updateTabProperties(properties, {uuid, name});
        await expect(channelDispatch).toBeCalledWith(TabAPI.UPDATETABPROPERTIES, expectedPayload);
    });
});

describe('When calling startDrag', () => {
    it('Calls fin.desktop.InterApplicationBus.send', async () => {
        const uuid = 'someuuid';
        const name = 'somename';
        const expectedPayload: WindowIdentity = {uuid, name};

        await tabstrip.startDrag({uuid, name});
        await expect(channelDispatch).toBeCalledWith(TabAPI.STARTDRAG, expectedPayload);
    });
});