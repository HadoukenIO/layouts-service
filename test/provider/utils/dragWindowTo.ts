import {Point} from 'hadouken-js-adapter/out/types/src/api/system/point';
import * as robot from 'robotjs';

import {dragWindowAndHover} from './dragWindowAndHover';
import {getBounds} from './getBounds';
import {Win} from './getWindow';
import {Side} from './SideUtils';

export const dragWindowTo = async (identityOrWindow: Win, x: number, y: number) => {
    await dragWindowAndHover(identityOrWindow, x, y);
    robot.mouseToggle('up');
    await new Promise((r) => setTimeout(r, 500));
};

enum CornerEnum {
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right'
}

export type Corner = keyof typeof CornerEnum;

export const dragWindowToOtherWindow =
    async (draggedWindow: Win, draggedCorner: Corner, targetWindow: Win, targetCorner: Corner, offset?: Point, dropWindow = true) => {
    const draggedBounds = await getBounds(draggedWindow);
    const targetBounds = await getBounds(targetWindow);

    const draggedDimensions: Point = {x: draggedBounds.right - draggedBounds.left, y: draggedBounds.bottom - draggedBounds.top};
    const targetDimensions: Point = {x: targetBounds.right - targetBounds.left, y: targetBounds.bottom - targetBounds.top};

    // Find adjustment to movement based on corner of dragged window
    let draggedAdjustment: Point = {x: 0, y: 0};
    switch (draggedCorner) {
        case 'top-left':
            // Since dragWindow uses the top-left as it's anchor, no adjustment is
            // needed
            break;
        case 'top-right':
            draggedAdjustment = {x: -draggedDimensions.x, y: 0};
            break;
        case 'bottom-left':
            draggedAdjustment = {x: 0, y: -draggedDimensions.y};
            break;
        case 'bottom-right':
            draggedAdjustment = {x: -draggedDimensions.x, y: -draggedDimensions.y};
            break;
        default:
            break;
    }

    let targetAdjustment: Point = {x: 0, y: 0};
    switch (targetCorner) {
        case 'top-left':
            // Since dragWindow uses the top-left as it's anchor, no adjustment is
            // needed
            break;
        case 'top-right':
            targetAdjustment = {x: targetDimensions.x, y: 0};
            break;
        case 'bottom-left':
            targetAdjustment = {x: 0, y: targetDimensions.y};
            break;
        case 'bottom-right':
            targetAdjustment = {x: targetDimensions.x, y: targetDimensions.y};
            break;
        default:
            break;
    }

    const finalAdjustment = {
        x: draggedAdjustment.x + targetAdjustment.x + (offset ? offset.x : 0),
        y: draggedAdjustment.y + targetAdjustment.y + (offset ? offset.y : 0)
    };

    if (dropWindow) {
        await dragWindowTo(draggedWindow, targetBounds.left + finalAdjustment.x, targetBounds.top + finalAdjustment.y);
    } else {
        await dragWindowAndHover(draggedWindow, targetBounds.left + finalAdjustment.x, targetBounds.top + finalAdjustment.y);
    }
};

export const dragSideToSide = async (draggedWindow: Win, draggedSide: Side, targetWindow: Win, targetSide: Side, offset?: Point, dropWindow = true) => {
    let draggedCorner: Corner, targetCorner: Corner;
    if (draggedSide === 'top' || draggedSide === 'bottom') {
        draggedCorner = draggedSide + '-left' as Corner;
    } else {
        draggedCorner = 'top-' + draggedSide as Corner;
    }
    if (targetSide === 'top' || targetSide === 'bottom') {
        targetCorner = targetSide + '-left' as Corner;
    } else {
        targetCorner = 'top-' + targetSide as Corner;
    }

    await dragWindowToOtherWindow(draggedWindow, draggedCorner, targetWindow, targetCorner, offset, dropWindow);
};