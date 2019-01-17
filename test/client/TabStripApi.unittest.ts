import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {stub} from './utils/FinMock';
import {ErrorMsgs} from './utils/ErrorMsgs';

import {channelPromise} from '../../src/client/connection';
import {TabAPI, EndDragPayload, AddTabPayload, UpdateTabPropertiesPayload} from '../../src/client/internal';
import {addTab, setActiveTab, closeTab, tabStrip, removeTab} from '../../src/client/main';
import {TabProperties, WindowIdentity} from '../../src/client/types';

stub();

let channel: ChannelClient;
let channelDispatch: jest.SpyInstance<typeof channel.dispatch>

beforeEach(async () => {
    jest.restoreAllMocks();
    channel = await channelPromise;
    channelDispatch = jest.spyOn(channel, 'dispatch');
});

describe('TabStrip API Actions', () => {
    describe('When calling updateTabProperties', () => {
        it('Calling with invalid uuid rejects with error message', async () => {
            const uuid: string = null!;
            const name = 'somename';
            const tabProperties: TabProperties = {title: 'sometitle', icon: 'someicon'};

            const promise = tabStrip.updateTabProperties({uuid, name}, tabProperties);
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with invalid name rejects with error message', async () => {
            const uuid = 'testuuid';
            const name: string = null!;
            const tabProperties: TabProperties = {title: 'sometitle', icon: 'someicon'};

            const promise = tabStrip.updateTabProperties({uuid, name}, tabProperties);
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with invalid properties rejects with error message', async () => {
            const uuid = 'testuuid';
            const name = 'testname';

            const promise = tabStrip.updateTabProperties({uuid, name}, null!);
            await expect(promise).rejects.toEqual(ErrorMsgs.PROPERTIES_REQUIRED);
        });

        it('Calling with valid arguments sends a UPDATETABPROPERTIES message for the specified window', async () => {
            const uuid = 'someuuid';
            const name = 'somename';
            const properties: TabProperties = {title: 'sometitle', icon: 'someicon'};
            const expectedPayload: UpdateTabPropertiesPayload = {window: {uuid, name}, properties};

            await tabStrip.updateTabProperties({uuid, name}, properties);
            await expect(channelDispatch).toBeCalledWith(TabAPI.UPDATETABPROPERTIES, expectedPayload);
        });
    });

    describe('When calling startDrag', () => {
        it('should call fin.desktop.InterApplicationBus.send', async () => {
            const expectedPayload: undefined = undefined;

            await tabStrip.startDrag();
            await expect(channelDispatch).toBeCalledWith(TabAPI.STARTDRAG, expectedPayload);
        });
    });

    describe('When calling endDrag', () => {
        it('Calling with invalid uuid rejects with error message', async () => {
            const uuid: string = null!;
            const name = 'somename';
            const dragEvent: DragEvent = new Event('dragend') as DragEvent;

            const promise = tabStrip.endDrag(dragEvent, {uuid, name});
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with invalid name rejects with error message', async () => {
            const uuid = 'someuuid';
            const name: string = null!;
            const dragEvent: DragEvent = new Event('dragend') as DragEvent;

            const promise = tabStrip.endDrag(dragEvent, {uuid, name});
            await expect(promise).rejects.toEqual(ErrorMsgs.INVALID_WINDOW);
        });

        it('Calling with invalid event rejects with error message', async () => {
            const uuid = 'someuuid';
            const name = 'somename';

            const promise = tabStrip.endDrag(null!, {uuid, name});
            await expect(promise).rejects.toEqual(ErrorMsgs.EVENT_REQUIRED);
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

            await tabStrip.endDrag(mockDragEvent, {uuid, name});
            await expect(channelDispatch).toBeCalledWith(TabAPI.ENDDRAG, expectedPayload);
        });
    });
});
