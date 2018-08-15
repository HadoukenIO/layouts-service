import 'jest';
import { Mock } from 'jest';
import { TabBlob, Group } from "../../../src/client/types";
import { createTabGroupFromMultipleWindows } from "../../../src/provider/tabbing/TabUtilities";
import { TabService, ITabService } from '../../../src/provider/tabbing/TabService';
import { TabGroup } from '../../../src/provider/tabbing/TabGroup';
import { Tab } from '../../../src/provider/tabbing/Tab';

jest.mock('../../../src/provider/tabbing/TabService', () => {
}); // TabService is now a mock constructor

beforeEach(() => {
    jest.restoreAllMocks();
});

describe("Tests for createTabGroup", () => {
    describe("Pass empty tab blob", () => {
        it("should throw an error with an expected error message", () => {
            // Arrange
            const expectedErrorMessage: string = "No tab blob supplied";
            const tabBlob: TabBlob[] | null = null;
            jest.spyOn(window.console, 'error');

            // Act
            createTabGroupFromMultipleWindows(tabBlob, null);

            // Assert
            expect(console.error).toBeCalledWith(expectedErrorMessage);
        });
    });

    //describe("Pass valid blob", () => {
    //    it("should call switch tab to the active tab", () => {
    //        // Arrange
    //        const fakeTabBlob: TabBlob[] | null = [{
    //            groupInfo: {
    //                url: "",
    //                active: { uuid: "app0", name: "app0" },
    //                dimensions: {
    //                    x: 100,
    //                    y: 100,
    //                    width: 200,
    //                    tabGroupHeight: 130,
    //                    appHeight: 260
    //                }
    //            },
    //            tabs: [
    //                { uuid: "app0", name: "app0" },
    //                { uuid: "app1", name: "app1" },
    //                { uuid: "app2", name: "app2" },
    //                { uuid: "app3", name: "app3" }
    //            ]
    //        }];

    //        const mockGroup: TabGroup = new TabGroup({ url: "", screenX: 1, screenY: 1, height: 1, width: 1 });
    //        const mockTab: Tab = new Tab({ tabID: { name: "APP1", uuid: "APP1" } }, mockGroup);

    //        const mockTabService: Mock<ITabService> = jest.fn<ITabService>(() => ({
    //            addTabGroup: jest.fn().mockReturnValue(mockGroup),
    //            getTab: jest.fn().mockReturnValue(mockTab)
    //        }));

    //        // Act
    //        createTabGroupFromMultipleWindows(fakeTabBlob, new mockTabService());

    //        // Assert
    //        expect(mockGroup.switchTab).toBeCalled();
    //    });
    //});
});