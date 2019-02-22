import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {stub} from './utils/FinMock';
import {ErrorMsgs} from './utils/ErrorMsgs';

import {channelPromise} from '../../src/client/connection';
import {TabAPI} from '../../src/client/internal';
import {tabbing, WindowIdentity} from '../../src/client/main';

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
            const promise = tabbing.addTab(null!, null!);
            await expect(promise).rejects.toThrowError(ErrorMsgs.INVALID_IDENTITY);
        });

        it('Calling with invalid uuid rejects with error message', async () => {
            const promise = tabbing.addTab({uuid: null!, name: 'somename'}, null!);
            await expect(promise).rejects.toThrowError(ErrorMsgs.INVALID_IDENTITY);
        });

        it('Calling with invalid name rejects with error message', async () => {
            const promise = tabbing.addTab({uuid: 'someuuid', name: null!}, null!);
            await expect(promise).rejects.toThrowError(ErrorMsgs.INVALID_IDENTITY);
        });

        it('Calling with valid arguments sends a ADDTAB message', async () => {
            const targetWindow: WindowIdentity = {uuid: 'some uuid', name: 'some name'};
            const currentWindow: WindowIdentity = {uuid: 'test', name: 'test'};
            const expectedPayload = {targetWindow, windowToAdd: currentWindow};

            await tabbing.addTab(targetWindow);
            await expect(channelDispatch).toBeCalledWith(TabAPI.ADDTAB, expectedPayload);
        });
    });

    describe('When calling removeTab', () => {
        it('Calling with invalid uuid rejects with error message', async () => {
            const promise = tabbing.removeTab({uuid: null!, name: 'somerandomname'});
            await expect(promise).rejects.toThrowError(ErrorMsgs.INVALID_IDENTITY);
        });

        it('Calling with invalid name assumes main application window', async () => {
            const uuid = 'some random uuid';
            const expectedPayload: WindowIdentity = {uuid, name: uuid};

            await tabbing.removeTab({uuid, name: null!});
            await expect(channelDispatch).toBeCalledWith(TabAPI.REMOVETAB, expectedPayload);
        });

        it('Calling with no identity sends a REMOVETAB message for current window', async () => {
            const expectedPayload: WindowIdentity = {uuid: 'test', name: 'test'};

            await tabbing.removeTab();
            await expect(channelDispatch).toBeCalledWith(TabAPI.REMOVETAB, expectedPayload);
        });

        it('Calling with valid arguments sends a REMOVETAB message for specified window', async () => {
            const uuid = 'some random uuid';
            const name = 'some random name';
            const expectedPayload: WindowIdentity = {uuid, name};

            await tabbing.removeTab({uuid, name});
            await expect(channelDispatch).toBeCalledWith(TabAPI.REMOVETAB, expectedPayload);
        });
    });

    describe('When calling setActiveTab', () => {
        it('Calling with invalid uuid rejects with error message', async () => {
            const uuid: string = null!;
            const name = 'testname';

            const promise = tabbing.setActiveTab({uuid, name});
            await expect(promise).rejects.toThrowError(ErrorMsgs.INVALID_IDENTITY);
        });

        it('Calling with invalid name assumes main application window', async () => {
            const uuid = 'testuuid';
            const name: string = null!;
            const expectedPayload: WindowIdentity = {uuid, name: uuid};

            await tabbing.setActiveTab({uuid, name});
            await expect(channelDispatch).toBeCalledWith(TabAPI.SETACTIVETAB, expectedPayload);
        });

        it('Calling with no identity sends a SETACTIVETAB message for current window', async () => {
            const expectedPayload: WindowIdentity = {uuid: 'test', name: 'test'};

            await tabbing.setActiveTab();
            await expect(channelDispatch).toBeCalledWith(TabAPI.SETACTIVETAB, expectedPayload);
        });

        it('Calling with valid arguments sends a SETACTIVETAB message for the specified window', async () => {
            const uuid = 'someuuid';
            const name = 'somename';
            const expectedPayload: WindowIdentity = {uuid, name};

            await tabbing.setActiveTab({uuid, name});
            await expect(channelDispatch).toBeCalledWith(TabAPI.SETACTIVETAB, expectedPayload);
        });
    });

    describe('When calling closeTab', () => {
        it('Calling with invalid uuid rejects with error message', async () => {
            const uuid: string = null!;
            const name = 'somename';
            
            const promise = tabbing.closeTab({uuid, name});
            await expect(promise).rejects.toThrowError(ErrorMsgs.INVALID_IDENTITY);
        });

        it('Calling with invalid name assumes main application window', async () => {
            const uuid = 'testuuid';
            const name: string = null!;
            const expectedPayload: WindowIdentity = {uuid, name: uuid};
            
            await tabbing.closeTab({uuid, name});
            await expect(channelDispatch).toBeCalledWith(TabAPI.CLOSETAB, expectedPayload);
        });

        it('Calling with no identity sends a CLOSETAB message for current window', async () => {
            const expectedPayload: WindowIdentity = {uuid: 'test', name: 'test'};

            await tabbing.closeTab();
            await expect(channelDispatch).toBeCalledWith(TabAPI.CLOSETAB, expectedPayload);
        });

        it('Calling with valid arguments sends a CLOSETAB message for the specified window', async () => {
            const uuid = 'someuuid';
            const name = 'somename';
            const expectedPayload: WindowIdentity = {uuid, name};

            await tabbing.closeTab({uuid, name});
            await expect(channelDispatch).toBeCalledWith(TabAPI.CLOSETAB, expectedPayload);
        });
    });
});
