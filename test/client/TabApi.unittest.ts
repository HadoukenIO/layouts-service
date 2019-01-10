import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {stub} from './utils/FinMock';
import {ErrorMsgs} from './utils/ErrorMsgs';

import {channelPromise} from '../../src/client/connection';
import {TabAPI, AddTabPayload} from '../../src/client/internal';
import {addTab, setActiveTab, closeTab, removeTab} from '../../src/client/main';
import {WindowIdentity} from '../../src/client/types';

stub();

let channel: ChannelClient;
let channelDispatch: jest.SpyInstance<typeof channel.dispatch>

beforeEach(async () => {
    jest.restoreAllMocks();
    channel = await channelPromise;
    channelDispatch = jest.spyOn(channel, 'dispatch');
});

describe('Tabbing API Actions', () => {
    describe('When calling addTab', () => {
        it('Calling with invalid identity rejects with error message', async () => {
            const promise = addTab(null!, null!);
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_TARGET_WINDOW);
        });

        it('Calling with invalid uuid rejects with error message', async () => {
            const promise = addTab({uuid: null!, name: 'somename'}, null!);
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_TARGET_WINDOW);
        });

        it('Calling with invalid name rejects with error message', async () => {
            const promise = addTab({uuid: 'someuuid', name: null!}, null!);
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_TARGET_WINDOW);
        });

        it('Calling with valid arguments sends a ADDTAB message', async () => {
            const targetWindow: WindowIdentity = {uuid: 'some uuid', name: 'some name'};
            const currentWindow: WindowIdentity = {uuid: 'test', name: 'test'};
            const expectedPayload: AddTabPayload = {targetWindow, windowToAdd: currentWindow};

            await addTab(targetWindow);
            await expect(channelDispatch).toBeCalledWith(TabAPI.ADDTAB, expectedPayload);
        });
    });

    describe('When calling removeTab', () => {
        it('Calling with invalid uuid rejects with error message', async () => {
            const promise = removeTab({uuid: null!, name: 'somerandomname'});
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with invalid name rejects with error message', async () => {
            const promise = removeTab({uuid: 'somerandomuuid', name: null!});
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with no identity sends a REMOVETAB message for current window', async () => {
            const expectedPayload: WindowIdentity = {uuid: 'test', name: 'test'};

            await removeTab();
            await expect(channelDispatch).toBeCalledWith(TabAPI.REMOVETAB, expectedPayload);
        });

        it('Calling with valid arguments sends a REMOVETAB message for specified window', async () => {
            const uuid = 'some random uuid';
            const name = 'some random name';
            const expectedPayload: WindowIdentity = {uuid, name};

            await removeTab({uuid, name});
            await expect(channelDispatch).toBeCalledWith(TabAPI.REMOVETAB, expectedPayload);
        });
    });

    describe('When calling setActiveTab', () => {
        it('Calling with invalid uuid rejects with error message', async () => {
            const uuid: string = null!;
            const name = 'testname';

            const promise = setActiveTab({uuid, name});
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with invalid name rejects with error message', async () => {
            const uuid = 'testuuid';
            const name: string = null!;

            const promise = setActiveTab({uuid, name});
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with no identity sends a SETACTIVETAB message for current window', async () => {
            const expectedPayload: WindowIdentity = {uuid: 'test', name: 'test'};

            await setActiveTab();
            await expect(channelDispatch).toBeCalledWith(TabAPI.SETACTIVETAB, expectedPayload);
        });

        it('Calling with valid arguments sends a SETACTIVETAB message for the specified window', async () => {
            const uuid = 'someuuid';
            const name = 'somename';
            const expectedPayload: WindowIdentity = {uuid, name};

            await setActiveTab({uuid, name});
            await expect(channelDispatch).toBeCalledWith(TabAPI.SETACTIVETAB, expectedPayload);
        });
    });

    describe('When calling closeTab', () => {
        it('Calling with invalid uuid rejects with error message', async () => {
            const uuid: string = null!;
            const name = 'somename';
            
            const promise = closeTab({uuid, name});
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with invalid name rejects with error message', async () => {
            const uuid = 'testuuid';
            const name: string = null!;
            
            const promise = closeTab({uuid, name});
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with no identity sends a CLOSETAB message for current window', async () => {
            const expectedPayload: WindowIdentity = {uuid: 'test', name: 'test'};

            await closeTab();
            await expect(channelDispatch).toBeCalledWith(TabAPI.CLOSETAB, expectedPayload);
        });

        it('Calling with valid arguments sends a CLOSETAB message for the specified window', async () => {
            const uuid = 'someuuid';
            const name = 'somename';
            const expectedPayload: WindowIdentity = {uuid, name};

            await closeTab({uuid, name});
            await expect(channelDispatch).toBeCalledWith(TabAPI.CLOSETAB, expectedPayload);
        });
    });
});
