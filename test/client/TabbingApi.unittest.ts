import 'jest';

import {TabAPIActions} from '../../src/client/APITypes';
import {TabbingApi} from '../../src/client/TabbingApi';
import {TabAPIDragMessage, TabAPIInteractionMessage, TabAPIMessage, TabProperties} from '../../src/client/types';

import {createFinMock} from './utils/FinMock';

beforeEach(() => {
    jest.restoreAllMocks();
    createFinMock();
});

describe.skip('Tests for tab api', () => {
    describe('Add tab tests', () => {
        describe('Calling add with invalid uuid', () => {
            it('should throw an error with expected error message', () => {
                // Arrange
                jest.spyOn(window.console, 'error');
                const errorMessage = 'No uuid has been passed in';
                const tabbingApi: TabbingApi = new TabbingApi();

                // Act
                tabbingApi.addTab(null!, 'somename', null!);

                // Assert
                expect(console.error).toBeCalledWith(errorMessage);
            });
        });

        describe('Calling add with invalid name', () => {
            it('should throw an error with expected error message', () => {
                // Arrange
                jest.spyOn(window.console, 'error');
                const errorMessage = 'No name has been passed in';
                const tabbingApi: TabbingApi = new TabbingApi();

                // Act
                tabbingApi.addTab('someuuid', null!, null!);

                // Assert
                expect(console.error).toBeCalledWith(errorMessage);
            });
        });

        describe('Calling add with valid parameters', () => {
            it('should call fin.desktop.InterApplicationBus.send with the correct parameters', () => {
                // Arrange
                const expectedAction: TabAPIActions = TabAPIActions.ADD;
                const expectedClientUuid = 'some uuid';
                const expectedClientName = 'some name';
                const expectedPayload: TabAPIInteractionMessage = {action: expectedAction, uuid: expectedClientUuid, name: expectedClientName};
                const tabbingApi: TabbingApi = new TabbingApi();

                jest.spyOn(fin.desktop.InterApplicationBus, 'send');

                // Act
                tabbingApi.addTab(expectedClientUuid, expectedClientName);

                // Assert
                expect(fin.desktop.InterApplicationBus.send).toBeCalledWith('Layout-Manager', 'tab-api', expectedPayload);
            });
        });
    });

    describe('Eject tab tests', () => {
        describe('Calling eject with invalid uuid', () => {
            it('should throw an error with an expected error message', () => {
                // Arrange
                const expectedErrorMessage = 'No uuid has been passed in';
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.ejectTab(null!, 'somerandomname');

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling eject with invalid name', () => {
            it('should throw an error with an expected error message', () => {
                // Arrange
                const expectedErrorMessage = 'No name has been passed in';
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.ejectTab('somerandomuuid', null!);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling eject with valid parameters', () => {
            it('should call fin.desktop.InterApplicationBus.send with the correct parameters', () => {
                // Arrange
                const uuid = 'some random uuid';
                const name = 'some random name';
                const expectedPayload: TabAPIInteractionMessage = {uuid, name, action: TabAPIActions.EJECT};
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(fin.desktop.InterApplicationBus, 'send');

                // Act
                tabbingApi.ejectTab(uuid, name);

                // Assert
                expect(fin.desktop.InterApplicationBus.send).toBeCalledWith('Layout-Manager', 'tab-api', expectedPayload);
            });
        });
    });

    describe('Activate tab tests', () => {
        describe('Calling activate with invalid uuid', () => {
            it('should throw an error with an expected error message', () => {
                // Arrange
                const expectedErrorMessage = 'No uuid has been passed in';
                const uuid: string = null!;
                const name = 'testname';
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.activateTab(uuid, name);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling activate with invalid name', () => {
            it('should throw an error with an expected error message', () => {
                // Arrange
                const expectedErrorMessage = 'No name has been passed in';
                const uuid = 'testuuid';
                const name: string = null!;
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.activateTab(uuid, name);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling activate with valid parameters', () => {
            it('should call fin.desktop.InterApplicationBus.send with the correct parameters', () => {
                // Arrange
                const uuid = 'someuuid';
                const name = 'somename';
                jest.spyOn(fin.desktop.InterApplicationBus, 'send');
                const tabbingApi: TabbingApi = new TabbingApi();
                const expectedPayload: TabAPIInteractionMessage = {action: TabAPIActions.ACTIVATE, uuid, name};

                // Act
                tabbingApi.activateTab(uuid, name);

                // Assert
                expect(fin.desktop.InterApplicationBus.send).toBeCalledWith('Layout-Manager', 'tab-api', expectedPayload);
            });
        });
    });

    describe('Close tab tests', () => {
        describe('Calling close tab with invalid uuid', () => {
            it('should throw an error with an expected error message', () => {
                // Arrange
                const expectedErrorMessage = 'No uuid has been passed in';
                const uuid: string = null!;
                const name = 'somename';
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.closeTab(uuid, name);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling close tab with invalid name', () => {
            it('should throw an error with an expected error message', () => {
                // Arrange
                const expectedErrorMessage = 'No name has been passed in';
                const uuid = 'testuuid';
                const name: string = null!;
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.closeTab(uuid, name);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling close tab with valid parameters', () => {
            it('should call fin.desktop.InterApplicationBus.send with the correct parameters', () => {
                // Arrange
                const uuid = 'someuuid';
                const name = 'somename';
                jest.spyOn(fin.desktop.InterApplicationBus, 'send');
                const tabbingApi: TabbingApi = new TabbingApi();
                const expectedPayload: TabAPIInteractionMessage = {action: TabAPIActions.CLOSE, uuid, name};

                // Act
                tabbingApi.closeTab(uuid, name);

                // Assert
                expect(fin.desktop.InterApplicationBus.send).toBeCalledWith('Layout-Manager', 'tab-api', expectedPayload);
            });
        });
    });

    describe('Update tab properties tests', () => {
        describe('Calling update tab properties with invalid uuid', () => {
            it('should throw an error with an expected error message', () => {
                // Arrange
                const expectedErrorMessage = 'No uuid has been passed in';
                const uuid: string = null!;
                const name = 'somename';
                const tabProperties: TabProperties = {title: 'sometitle', icon: 'someicon'};
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.updateTabProperties(uuid, name, tabProperties);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling update tab properties with invalid name', () => {
            it('should throw an error with an expected error message', () => {
                // Arrange
                const expectedErrorMessage = 'No name has been passed in';
                const uuid = 'testuuid';
                const name: string = null!;
                const tabProperties: TabProperties = {title: 'sometitle', icon: 'someicon'};
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.updateTabProperties(uuid, name, tabProperties);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling update tab properties with invalid properties', () => {
            it('should throw an error with an expected error message', () => {
                // Arrange
                const expectedErrorMessage = 'No properties has been passed in';
                const uuid = 'testuuid';
                const name = 'testname';
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.updateTabProperties(uuid, name, null!);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling update tab properties with valid parameters', () => {
            it('should call fin.desktop.InterApplicationBus.send with the correct parameters', () => {
                // Arrange
                const uuid = 'someuuid';
                const name = 'somename';
                const tabProperties: TabProperties = {title: 'sometitle', icon: 'someicon'};
                jest.spyOn(fin.desktop.InterApplicationBus, 'send');
                const tabbingApi: TabbingApi = new TabbingApi();
                const expectedPayload: TabAPIInteractionMessage = {action: TabAPIActions.UPDATEPROPERTIES, uuid, name, properties: tabProperties};

                // Act
                tabbingApi.updateTabProperties(uuid, name, tabProperties);

                // Assert
                expect(fin.desktop.InterApplicationBus.send).toBeCalledWith('Layout-Manager', 'tab-api', expectedPayload);
            });
        });
    });

    describe('Tests for start drag', () => {
        describe('Calling startDrag', () => {
            it('should call fin.desktop.InterApplicationBus.send', () => {
                // Arrange
                const expectedPayload: TabAPIMessage = {action: TabAPIActions.STARTDRAG};
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(fin.desktop.InterApplicationBus, 'send');

                // Act
                tabbingApi.startDrag();

                // Assert
                expect(fin.desktop.InterApplicationBus.send).toBeCalledWith('Layout-Manager', 'tab-api', expectedPayload);
            });
        });
    });

    describe('Tests for end drag', () => {
        describe('Calling endDrag with a null drag event', () => {
            it('should throw an error with an expected exception message', () => {
                // Arrange
                const expectedErrorMessage = 'No drag event has been passed in';
                const tabbingApi: TabbingApi = new TabbingApi();
                const uuid = 'someuuid';
                const name = 'somename';
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.endDrag(null!, uuid, name);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling endDrag with a invalid uuid', () => {
            it('should throw an error with an expected exception message', () => {
                // Arrange
                const expectedErrorMessage = 'No uuid has been passed in';
                const tabbingApi: TabbingApi = new TabbingApi();
                const uuid: string = null!;
                const name = 'somename';
                const dragEvent: Event = new Event('dragend');
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.endDrag(dragEvent as DragEvent, uuid, name);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling endDrag with a invalid uuid', () => {
            it('should throw an error with an expected exception message', () => {
                // Arrange
                const expectedErrorMessage = 'No name has been passed in';
                const tabbingApi: TabbingApi = new TabbingApi();
                const uuid = 'someuuid';
                const name: string = null!;
                const dragEvent: Event = new Event('dragend');
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.endDrag(dragEvent as DragEvent, uuid, name);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling endDrag with a null drag event', () => {
            it('should throw an error with an expected exception message', () => {
                // Arrange
                const expectedErrorMessage = 'No drag event has been passed in';
                const tabbingApi: TabbingApi = new TabbingApi();
                const uuid = 'someuuid';
                const name = 'somename';
                jest.spyOn(window.console, 'error');

                // Act
                tabbingApi.endDrag(null!, uuid, name);

                // Assert
                expect(console.error).toBeCalledWith(expectedErrorMessage);
            });
        });

        describe('Calling endDrag with valid parameters', () => {
            it('should call fin.desktop.InterApplicationBus.send', () => {
                // Arrange
                const tabbingApi: TabbingApi = new TabbingApi();
                jest.spyOn(fin.desktop.InterApplicationBus, 'send');
                const mockDragEvent: Event = new Event('dragend');
                const screenX = 12;
                const screenY = 12;
                const uuid = 'someuuid';
                const name = 'somename';
                Object.defineProperty(mockDragEvent, 'screenX', {get: () => screenX});
                Object.defineProperty(mockDragEvent, 'screenY', {get: () => screenY});
                const expectedPayload: TabAPIDragMessage = {
                    action: TabAPIActions.ENDDRAG,
                    uuid,
                    name,
                    event: {screenX: (mockDragEvent as DragEvent).screenX, screenY: (mockDragEvent as DragEvent).screenX}
                };

                // Act
                tabbingApi.endDrag(mockDragEvent as DragEvent, uuid, name);

                // Assert
                expect(fin.desktop.InterApplicationBus.send).toBeCalledWith('Layout-Manager', 'tab-api', expectedPayload);
            });
        });
    });

    describe('Tests for get window api actions', () => {
        describe('Call windowActions property', () => {
            it('should not return null', () => {
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
