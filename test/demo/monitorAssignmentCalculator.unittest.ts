import {MonitorAssignmentCalculator} from '../../src/provider/model/MonitorAssignmentCalculator';

const leftMonitor = {
    center: {x: -1500, y: 500},
    halfSize: {x: 500, y: 500}
};

const rightMonitor = {
    center: {x: 1500, y: 500},
    halfSize: {x: 500, y: 500}
};

describe('When removing a central monitor', () => {
    const calculator = new MonitorAssignmentCalculator([
        leftMonitor,
        rightMonitor
    ]);

    it('A window to the left of center is moved to the left monitor', () => {
        const result = calculator.getMovedEntityRectangle({beforeMaximizeBounds: {
            center: {
                x: -1, y: 500
            },
            halfSize: {
                x: 100, y: 100
            }
        }});

        expect(result).toEqual({
            center: {x: -1100, y: 500},
            halfSize: {x: 100, y: 100}
        });
    });

    it('A window to the right of center is moved to the right monitor', () => {
        const result = calculator.getMovedEntityRectangle({beforeMaximizeBounds: {
            center: {x: 1, y: 500},
            halfSize: {x: 100, y: 100}
        }});

        expect(result).toEqual({
            center: {x: 1100, y: 500},
            halfSize: {x: 100, y: 100}
        });
    });
});

describe('When removing a big monitor', () => {
    const calculator = new MonitorAssignmentCalculator([
        leftMonitor
    ]);

    it('A big window is moved over the smaller monitor as expected', () => {
        const result = calculator.getMovedEntityRectangle({beforeMaximizeBounds: {
            center: {x: 0, y: 500},
            halfSize: {x: 1500, y: 1500}
        }});

        expect(result).toEqual({
            center: {x: -1500, y: 1500},
            halfSize: {x: 1500, y: 1500}
        });
    });
});
