import {TabService} from "../../src/provider/tabbing/TabService";

// tslint:disable:variable-name
// tslint:disable:no-any

beforeEach(() => {
    jest.restoreAllMocks();
});

//TODO need mock fin API (??)

describe("Tests for save and restore API methods", () => {
    describe("Tests for getting tabbing info blob", () => {
        describe("Request to get tab info with tabbing no service", () => {
            it("should return undefined", async () => {
                const tabBlob = await TabService.INSTANCE.getTabSaveInfo();
                expect(tabBlob).toBeUndefined();
            });
        });
    });

});
