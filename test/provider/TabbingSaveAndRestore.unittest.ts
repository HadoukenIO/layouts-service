import {tabService} from '../../src/provider/main';

beforeEach(() => {
    jest.restoreAllMocks();
});

// TODO need mock fin API (??)

describe('Tests for save and restore API methods', () => {
    describe('Tests for getting tabbing info blob', () => {
        describe('Request to get tab info with tabbing no service', () => {
            it('should return undefined', async () => {
                const tabGroup = await tabService.getTabSaveInfo();
                expect(tabGroup).toBeUndefined();
            });
        });
    });
});
