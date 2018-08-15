import { getTabSaveInfo } from "../../src/provider/tabbing/SaveAndRestoreAPI";

// tslint:disable:variable-name
// tslint:disable:no-any

beforeEach(() => {
    jest.restoreAllMocks();
});

//TODO need mock fin API (??)

describe("Tests for save and restore API methods", () => {
    describe("Tests for getting tabbing info blob", () => {
        describe("Request to get tab info with tabbing no service", () => {
            it("should return undefined", () => {
                const tabBlob = getTabSaveInfo();

                // Assert
                expect(tabBlob).toEqual(undefined);
            });
        });
    });

});
