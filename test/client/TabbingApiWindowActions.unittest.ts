﻿import "jest";
import { TabbingApiWindowActions } from "../../src/client/TabbingApiWindowActions";
import { TabAPIWindowActions } from "../../src/client/APITypes";
import { TabAPIMessage } from "../../src/client/types";
import { createFinMock } from "./utils/FinMock";

// tslint:disable:variable-name
// tslint:disable:no-any

declare namespace fin.desktop {
	let InterApplicationBus: {
		send: (name: string, uuid: string, message: any) => void;
	};
}

beforeEach(() => {
	jest.restoreAllMocks();
	createFinMock();
});

describe("Tests for tabbing api window actions", () => {
	describe("Tests for maximizing the window", () => {
		describe("A call to maximize", () => {
			it("should call fin.desktop.InterApplicationBus.send", () => {
				// Arrange
				const expectedPayload: TabAPIMessage = {
					action: TabAPIWindowActions.MAXIMIZE
				};
				const tabbingApiWindowActions: TabbingApiWindowActions = new TabbingApiWindowActions();
				jest.spyOn(fin.desktop.InterApplicationBus, "send");

				// Act
				tabbingApiWindowActions.maximize();

				// Assert
				expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("layouts-service", "tab-api", expectedPayload);
			});
		});
	});

	describe("Tests for minimizing a window", () => {
		it("should call fin.desktop.InterApplicationBus.send", () => {
			// Arrange
			const expectedPayload: TabAPIMessage = {
				action: TabAPIWindowActions.MINIMIZE
			};
			const tabbingApiWindowActions: TabbingApiWindowActions = new TabbingApiWindowActions();
			jest.spyOn(fin.desktop.InterApplicationBus, "send");

			// Act
			tabbingApiWindowActions.minimize();

			// Assert
			expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("layouts-service", "tab-api", expectedPayload);
		});
	});

	describe("Tests for restoring a window", () => {
		it("should call fin.desktop.InterApplicationBus.send", () => {
			// Arrange
			const expectedPayload: TabAPIMessage = {
				action: TabAPIWindowActions.RESTORE
			};
			const tabbingApiWindowActions: TabbingApiWindowActions = new TabbingApiWindowActions();
			jest.spyOn(fin.desktop.InterApplicationBus, "send");

			// Act
			tabbingApiWindowActions.restore();

			// Assert
			expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("layouts-service", "tab-api", expectedPayload);
		});
	});

	describe("Tests for closing a window", () => {
		it("should call fin.desktop.InterApplicationBus.send", () => {
			// Arrange
			const expectedPayload: TabAPIMessage = {
				action: TabAPIWindowActions.CLOSE
			};
			const tabbingApiWindowActions: TabbingApiWindowActions = new TabbingApiWindowActions();
			jest.spyOn(fin.desktop.InterApplicationBus, "send");

			// Act
			tabbingApiWindowActions.close();

			// Assert
			expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("layouts-service", "tab-api", expectedPayload);
		});
	});

	describe("Tests for toggling maximize", () => {
		it("should call fin.desktop.InterApplicationBus.send", () => {
			// Arrange
			const expectedPayload: TabAPIMessage = {
				action: TabAPIWindowActions.TOGGLEMAXIMIZE
			};
			const tabbingApiWindowActions: TabbingApiWindowActions = new TabbingApiWindowActions();
			jest.spyOn(fin.desktop.InterApplicationBus, "send");

			// Act
			tabbingApiWindowActions.toggleMaximize();

			// Assert
			expect(fin.desktop.InterApplicationBus.send).toBeCalledWith("layouts-service", "tab-api", expectedPayload);
		});
	});
});
