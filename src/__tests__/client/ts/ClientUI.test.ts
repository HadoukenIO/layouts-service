import 'jest';
import { ClientUI } from '../../../client/ts/ClientUI';
import 'node';


describe('Tests for tab api', () => {
    test('Calling add with invalid uuid', () => {
        it('should throw an error with expected error message', () => {
            // Arrange
            createFinMock();
            jest.spyOn(global.console, 'error');
            const errorMessage: string = 'No uuid has been passed in';
            const tabbingAPI: ClientUI = new ClientUI();

            // Act
            tabbingAPI.add(null, 'somename', null);

            // Assert
            expect(console.error).toBeCalledWith(errorMessage);
        });
    });
});

/**
 * @function CreateFinMock Attaches a fin mock to the window
 */
function createFinMock(): void {
    (global as any).fin = {
        desktop: {
            InterApplicationBus: {
                send: function (uuid: string, topic: string, message: any): void { },
                subscribe: function (uuid: string, topic: string, message: any): void { }
            },
            Application: {
                getCurrent: function (): any {
                    return {
                        uuid: null
                    };
                }
            },
            Window: {
                getCurrent: function (): any {
                    return {
                        name: null
                    }
                }
            }
        }
    }; 
}