import 'jest';

import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {getServicePromise} from '../../src/client/connection';
import {TabAPI} from '../../src/client/internal';
import {tabbing} from '../../src/client/main';
import {WindowIdentity} from '../../src/client/main';

import {stub} from './utils/FinMock';

stub();

let channel: ChannelClient;
let channelDispatch: jest.SpyInstance<Promise<any>, [string, any?]>;

beforeEach(async () => {
    jest.restoreAllMocks();
    channel = await getServicePromise();
    channelDispatch = jest.spyOn(channel, 'dispatch');
});

const identity: WindowIdentity = {uuid: 'test', name: 'test'};

describe('When maximizing the window', () => {
    it('A MAXIMIZETABGROUP message is sent to the provider', async () => {
        await tabbing.maximizeTabGroup();
        expect(channelDispatch).toBeCalledWith(TabAPI.MAXIMIZETABGROUP, identity);
    });
});

describe('When minimizing a window', () => {
    it('A MINIMIZETABGROUP message is sent to the provider', async () => {
        await tabbing.minimizeTabGroup();
        expect(channelDispatch).toBeCalledWith(TabAPI.MINIMIZETABGROUP, identity);
    });
});

describe('When restoring a window', () => {
    it('A RESTORETABGROUP message is sent to the provider', async () => {
        await tabbing.restoreTabGroup();
        expect(channelDispatch).toBeCalledWith(TabAPI.RESTORETABGROUP, identity);
    });
});

describe('When closing a window', () => {
    it('A CLOSETABGROUP message is sent to the provider', async () => {
        await tabbing.closeTabGroup();
        expect(channelDispatch).toBeCalledWith(TabAPI.CLOSETABGROUP, identity);
    });
});
