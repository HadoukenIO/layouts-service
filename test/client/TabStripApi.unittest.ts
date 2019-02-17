import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {stub} from './utils/FinMock';
import {ErrorMsgs} from './utils/ErrorMsgs';

import {channelPromise} from '../../src/client/connection';
import {TabAPI, EndDragPayload, AddTabPayload, UpdateTabPropertiesPayload, StartDragPayload} from '../../src/client/internal';
import {tabbing, tabstrip} from '../../src/client/main';
import {TabProperties, WindowIdentity} from '../../src/client/types';

stub();

let channel: ChannelClient;
let channelDispatch: jest.SpyInstance<typeof channel.dispatch>

beforeEach(async () => {
    jest.restoreAllMocks();
    channel = await channelPromise;
    channelDispatch = jest.spyOn(channel, 'dispatch');
});

describe('Tabstrip API Actions', () => {
    describe('When calling updateTabProperties', () => {
        it('Calling with invalid uuid rejects with error message', async () => {
            const uuid: string = null!;
            const name = 'somename';
            const tabProperties: TabProperties = {title: 'sometitle', icon: 'someicon'};

            const promise = tabbing.updateTabProperties(tabProperties, {uuid, name});
            await expect(promise).rejects.toThrowError(ErrorMsgs.INVALID_IDENTITY);
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
        it('should call fin.desktop.InterApplicationBus.send', async () => {
            const uuid = 'someuuid';
            const name = 'somename';
            const expectedPayload: StartDragPayload = {window: {uuid, name}};

            await tabstrip.startDrag({uuid, name});
            await expect(channelDispatch).toBeCalledWith(TabAPI.STARTDRAG, expectedPayload);
        });
    });

    describe('When calling endDrag', () => {
        it('Calling with invalid uuid rejects with error message', async () => {
            const uuid: string = null!;
            const name = 'somename';
            const dragEvent: DragEvent = new Event('dragend') as DragEvent;

            const promise = tabstrip.endDrag(dragEvent, {uuid, name});
            await expect(promise).rejects.toThrowError(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with invalid name rejects with error message', async () => {
            const uuid = 'someuuid';
            const name: string = null!;
            const dragEvent: DragEvent = new Event('dragend') as DragEvent;

            const promise = tabstrip.endDrag(dragEvent, {uuid, name});
            await expect(promise).rejects.toThrowError(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with invalid event rejects with error message', async () => {
            const uuid = 'someuuid';
            const name = 'somename';

            const promise = tabstrip.endDrag(null!, {uuid, name});
            await expect(promise).rejects.toThrowError(ErrorMsgs.EVENT_REQUIRED);
        });

        it('Calling with valid arguments sends a ENDDRAG message for the specified window', async () => {
            const uuid = 'someuuid';
            const name = 'somename';
            const screenX = 100;
            const screenY = 200;
            const mockDragEvent: DragEvent = Object.assign(new Event('dragend'), {screenX, screenY}) as DragEvent;
            const expectedPayload: EndDragPayload = {
                window: {uuid, name},
                event: {screenX, screenY}
            };

            await tabstrip.endDrag(mockDragEvent, {uuid, name});
            await expect(channelDispatch).toBeCalledWith(TabAPI.ENDDRAG, expectedPayload);
        });
    });
});
