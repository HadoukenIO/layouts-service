// import { TabbingApi } from "../../src/client/TabbingApi";
// import { TabAPIActions } from "../../src/client/APITypes";
// import { TabAPIDragMessage, TabAPIInteractionMessage, TabAPIMessage, TabProperties } from "../../src/client/types";
import { createFinMock } from "./utils/FinMock";

// tslint:disable:variable-name
// tslint:disable:no-any

// Need to re-declare any definitions that exist outside of the 'test' directory into test class.
// This is a temporary work-around, a solution will be found as part of SERVICE-182
enum TabAPIActions {
	STARTDRAG = "STARTDRAG",
	ENDDRAG = "ENDDRAG",
	ADD = "ADD",
	EJECT = "EJECT",
	CLOSE = "CLOSE",
	ACTIVATE = "ACTIVATE",
	UPDATEPROPERTIES = "UPDATEPROPERTIES",
	INIT = "TABINIT"
}
interface TabProperties {
	title?: string;
	icon?: string;
}
declare class TabbingApiWindowActions {
	constructor();
	public addEventListener<U>(event: string, callback: (message: U) => void): void;
	public removeEventListener<U>(event: string, callback: (message: U) => void): void;
	public maximize(): void;
	public minimize(): void;
	public restore(): void;
	public close(): void;
	public toggleMaximize(): void;
}
declare class TabbingApi {
	constructor();
	public windowActions: TabbingApiWindowActions;
	public addEventListener<T extends Event, U>(event: T, callback: (message: U) => void): void;
	public removeEventListener<T extends Event, U>(event: T, callback: (message: U) => void): void;
	public addTab(uuid: string, name: string, tabProperties?: TabProperties): void;
	public ejectTab(uuid: string, name: string): void;
	public activateTab(uuid: string, name: string): void;
	public closeTab(uuid: string, name: string): void;
	public updateTabProperties(uuid: string, name: string, properties: TabProperties): void;
	public startDrag(): void;
    public endDrag(event: DragEvent, uuid: string, name: string): void;
}

declare namespace fin.desktop {
	let InterApplicationBus: {
		send: (name: string, uuid: string, message: any) => void;
	};
}

beforeEach(() => {
	jest.restoreAllMocks();
	createFinMock();
});

describe("Tests for tab api", () => {
	describe("Add tab tests", () => {
		describe("Calling add with invalid uuid", () => {
			it("should throw an error with expected error message", () => {
				// Arrange
				jest.spyOn(window.console, "error");
				const errorMessage: string = "No uuid has been passed in";
				const tabbingApi: TabbingApi = new TabbingApi();

				// Act
				tabbingApi.addTab(null!, "somename", null!);

				// Assert
				expect(console.error).toBeCalledWith(errorMessage);
			});
		});

		describe("Calling add with invalid name", () => {
			it("should throw an error with expected error message", () => {
				// Arrange
				jest.spyOn(window.console, "error");
				const errorMessage: string = "No name has been passed in";
				const tabbingApi: TabbingApi = new TabbingApi();

				// Act
				tabbingApi.addTab("someuuid", null!, null!);

				// Assert
				expect(console.error).toBeCalledWith(errorMessage);
			});
		});

		describe("Calling add with valid parameters", () => {
			it("should call fin.desktop.InterApplicationBus.send with the correct parameters", () => {
				// Arrange
				const expectedAction: TabAPIActions = TabAPIActions.ADD;
				const expectedClientUuid: string = "some uuid";
				const expectedClientName: string = "some name";
				const expectedPayload/*: TabAPIInteractionMessage*/ = {
					action: expectedAction,
					uuid: expectedClientUuid,
					name: expectedClientName
				};
				const tabbingApi: TabbingApi = new TabbingApi();

				jest.spyOn(fin.desktop.InterApplicationBus, "send");

				// Act
				tabbingApi.addTab(expectedClientUuid, expectedClientName);

				// Assert
				expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("Layout-Manager", "tab-api", expectedPayload);
			});
		});
	});

	describe("Eject tab tests", () => {
		describe("Calling eject with invalid uuid", () => {
			it("should throw an error with an expected error message", () => {
				// Arrange
				const expectedErrorMessage: string = "No uuid has been passed in";
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.ejectTab(null!, "somerandomname");

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling eject with invalid name", () => {
			it("should throw an error with an expected error message", () => {
				// Arrange
				const expectedErrorMessage: string = "No name has been passed in";
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.ejectTab("somerandomuuid", null!);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling eject with valid parameters", () => {
			it("should call fin.desktop.InterApplicationBus.send with the correct parameters", () => {
				// Arrange
				const uuid: string = "some random uuid";
				const name: string = "some random name";
				const expectedPayload/*: TabAPIInteractionMessage*/ = {
					uuid,
					name,
					action: TabAPIActions.EJECT
				};
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(fin.desktop.InterApplicationBus, "send");

				// Act
				tabbingApi.ejectTab(uuid, name);

				// Assert
				expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("Layout-Manager", "tab-api", expectedPayload);
			});
		});
	});

	describe("Activate tab tests", () => {
		describe("Calling activate with invalid uuid", () => {
			it("should throw an error with an expected error message", () => {
				// Arrange
				const expectedErrorMessage: string = "No uuid has been passed in";
				const uuid: string = null!;
				const name: string = "testname";
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.activateTab(uuid, name);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling activate with invalid name", () => {
			it("should throw an error with an expected error message", () => {
				// Arrange
				const expectedErrorMessage: string = "No name has been passed in";
				const uuid: string = "testuuid";
				const name: string = null!;
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.activateTab(uuid, name);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling activate with valid parameters", () => {
			it("should call fin.desktop.InterApplicationBus.send with the correct parameters", () => {
				// Arrange
				const uuid: string = "someuuid";
				const name: string = "somename";
				jest.spyOn(fin.desktop.InterApplicationBus, "send");
				const tabbingApi: TabbingApi = new TabbingApi();
				const expectedPayload/*: TabAPIInteractionMessage*/ = {
					action: TabAPIActions.ACTIVATE,
					uuid,
					name
				};

				// Act
				tabbingApi.activateTab(uuid, name);

				// Assert
				expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("Layout-Manager", "tab-api", expectedPayload);
			});
		});
	});

	describe("Close tab tests", () => {
		describe("Calling close tab with invalid uuid", () => {
			it("should throw an error with an expected error message", () => {
				// Arrange
				const expectedErrorMessage: string = "No uuid has been passed in";
				const uuid: string = null!;
				const name: string = "somename";
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.closeTab(uuid, name);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling close tab with invalid name", () => {
			it("should throw an error with an expected error message", () => {
				// Arrange
				const expectedErrorMessage: string = "No name has been passed in";
				const uuid: string = "testuuid";
				const name: string = null!;
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.closeTab(uuid, name);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling close tab with valid parameters", () => {
			it("should call fin.desktop.InterApplicationBus.send with the correct parameters", () => {
				// Arrange
				const uuid: string = "someuuid";
				const name: string = "somename";
				jest.spyOn(fin.desktop.InterApplicationBus, "send");
				const tabbingApi: TabbingApi = new TabbingApi();
				const expectedPayload/*: TabAPIInteractionMessage*/ = {
					action: TabAPIActions.CLOSE,
					uuid,
					name
				};

				// Act
				tabbingApi.closeTab(uuid, name);

				// Assert
				expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("Layout-Manager", "tab-api", expectedPayload);
			});
		});
	});

	describe("Update tab properties tests", () => {
		describe("Calling update tab properties with invalid uuid", () => {
			it("should throw an error with an expected error message", () => {
				// Arrange
				const expectedErrorMessage: string = "No uuid has been passed in";
				const uuid: string = null!;
				const name: string = "somename";
				const tabProperties/*: TabProperties*/ = {
					title: "sometitle",
					icon: "someicon"
				};
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.updateTabProperties(uuid, name, tabProperties);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling update tab properties with invalid name", () => {
			it("should throw an error with an expected error message", () => {
				// Arrange
				const expectedErrorMessage: string = "No name has been passed in";
				const uuid: string = "testuuid";
				const name: string = null!;
				const tabProperties/*: TabProperties*/ = {
					title: "sometitle",
					icon: "someicon"
				};
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.updateTabProperties(uuid, name, tabProperties);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling update tab properties with invalid properties", () => {
			it("should throw an error with an expected error message", () => {
				// Arrange
				const expectedErrorMessage: string = "No properties has been passed in";
				const uuid: string = "testuuid";
				const name: string = "testname";
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.updateTabProperties(uuid, name, null!);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling update tab properties with valid parameters", () => {
			it("should call fin.desktop.InterApplicationBus.send with the correct parameters", () => {
				// Arrange
				const uuid: string = "someuuid";
				const name: string = "somename";
				const tabProperties/*: TabProperties*/ = {
					title: "sometitle",
					icon: "someicon"
				};
				jest.spyOn(fin.desktop.InterApplicationBus, "send");
				const tabbingApi: TabbingApi = new TabbingApi();
				const expectedPayload/*: TabAPIInteractionMessage*/ = {
					action: TabAPIActions.UPDATEPROPERTIES,
					uuid,
					name,
					properties: tabProperties
				};

				// Act
				tabbingApi.updateTabProperties(uuid, name, tabProperties);

				// Assert
				expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("Layout-Manager", "tab-api", expectedPayload);
			});
		});
	});

	describe("Tests for start drag", () => {
		describe("Calling startDrag", () => {
			it("should call fin.desktop.InterApplicationBus.send", () => {
				// Arrange
				const expectedPayload/*: TabAPIMessage*/ = {
					action: TabAPIActions.STARTDRAG
				};
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(fin.desktop.InterApplicationBus, "send");

				// Act
				tabbingApi.startDrag();

				// Assert
				expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("Layout-Manager", "tab-api", expectedPayload);
			});
		});
	});

	describe("Tests for end drag", () => {
		describe("Calling endDrag with a null drag event", () => {
			it("should throw an error with an expected exception message", () => {
				// Arrange
				const expectedErrorMessage: string = "No drag event has been passed in";
				const tabbingApi: TabbingApi = new TabbingApi();
				const uuid: string = "someuuid";
				const name: string = "somename";
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.endDrag(null!, uuid, name);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling endDrag with a invalid uuid", () => {
			it("should throw an error with an expected exception message", () => {
				// Arrange
				const expectedErrorMessage: string = "No uuid has been passed in";
				const tabbingApi: TabbingApi = new TabbingApi();
				const uuid: string = null!;
				const name: string = "somename";
				const dragEvent: Event = new Event("dragend");
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.endDrag(dragEvent as DragEvent, uuid, name);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling endDrag with a invalid uuid", () => {
			it("should throw an error with an expected exception message", () => {
				// Arrange
				const expectedErrorMessage: string = "No name has been passed in";
				const tabbingApi: TabbingApi = new TabbingApi();
				const uuid: string = "someuuid";
				const name: string = null!;
				const dragEvent: Event = new Event("dragend");
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.endDrag(dragEvent as DragEvent, uuid, name);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling endDrag with a null drag event", () => {
			it("should throw an error with an expected exception message", () => {
				// Arrange
				const expectedErrorMessage: string = "No drag event has been passed in";
				const tabbingApi: TabbingApi = new TabbingApi();
				const uuid: string = "someuuid";
				const name: string = "somename";
				jest.spyOn(window.console, "error");

				// Act
				tabbingApi.endDrag(null!, uuid, name);

				// Assert
				expect(console.error).toBeCalledWith(expectedErrorMessage);
			});
		});

		describe("Calling endDrag with valid parameters", () => {
			it("should call fin.desktop.InterApplicationBus.send", () => {
				// Arrange
				const tabbingApi: TabbingApi = new TabbingApi();
				jest.spyOn(fin.desktop.InterApplicationBus, "send");
				const mockDragEvent: Event = new Event("dragend");
				const screenX: number = 12;
				const screenY: number = 12;
				const uuid: string = "someuuid";
				const name: string = "somename";
				Object.defineProperty(mockDragEvent, "screenX", { get: () => screenX });
				Object.defineProperty(mockDragEvent, "screenY", { get: () => screenY });
				const expectedPayload/*: TabAPIDragMessage*/ = {
					action: TabAPIActions.ENDDRAG,
					uuid,
					name,
					event: {
						screenX: (mockDragEvent as DragEvent).screenX,
						screenY: (mockDragEvent as DragEvent).screenX
					}
				};

				// Act
				tabbingApi.endDrag(mockDragEvent as DragEvent, uuid, name);

				// Assert
				expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("Layout-Manager", "tab-api", expectedPayload);
			});
		});
	});

	describe("Tests for get window api actions", () => {
		describe("Call windowActions property", () => {
			it("should not return null", () => {
				// Arrange
				const tabbingApi: TabbingApi = new TabbingApi();

				// Act
				const windowActions = tabbingApi.windowActions;

				// Arrange
				expect(windowActions).toBeTruthy();
			});
		});
	});
});
