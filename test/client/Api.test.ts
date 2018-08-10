import 'jest';
import { createFinMock } from './utils/FinMock';
// import { Api } from '../../src/client/Api';
// import { TabApiEvents } from '../../src/client/APITypes';

// Need to re-declare any definitions that exist outside of the 'test' directory into test class.
// This is a temporary work-around, a solution will be found as part of SERVICE-182
enum TabApiEvents {
	TABADDED = "TABADDED",
	TABREMOVED = "TABREMOVED",
	PROPERTIESUPDATED = "PROPERTIESUPDATED",
	TABACTIVATED = "TABACTIVATED"
}
declare class Api {
	public addEventListener<U>(event: string, callback: (message: U) => void): void;
	public removeEventListener<U>(event: string, callback: (message: U) => void): void;
}

/**
 * Execute before each test
 */
beforeEach(() => {
    jest.resetAllMocks();
    createFinMock();
});

/**
 * @class
 * This is a class that is used as a stub for the base class to test some base
 * functionality
 */
class MockApi extends Api {
}

describe('Testing api base class', () => {
    describe('Tests for addEventListener', () => {
        describe('add an event listener with no event', () => {
            it('should throw an error with an expected error message', () => {
                // Arrange
                const expectedErrorMessage: string = "No event has been passed in";
                const mockApi: Api = new MockApi();
                jest.spyOn(window.console, 'error');

                // Act
                mockApi.addEventListener(null!, console.log);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('add an event listener with no callback', () => {
            it('should throw an error with an expected error message', () => {
                // Arrange
                const expectedErrorMessage: string = "No callback has been passed in";
                const mockApi: Api = new MockApi();
                jest.spyOn(window.console, 'error');

                // Act
                mockApi.addEventListener(TabApiEvents.PROPERTIESUPDATED, null!);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });
    });
});