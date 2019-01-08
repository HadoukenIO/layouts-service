import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';

export type Side = 'left'|'top'|'right'|'bottom';

/**
 * Can be used as an enum for available 'Side' values.
 */
export class Sides {
    public static readonly left: Side = 'left';
    public static readonly top: Side = 'top';
    public static readonly right: Side = 'right';
    public static readonly bottom: Side = 'bottom';
}


export function opposite(side: Side): Side {
    switch (side) {
        case 'top':
            return 'bottom';
        case 'bottom':
            return 'top';
        case 'left':
            return 'right';
        case 'right':
            return 'left';
        default:
            throw new Error('Invalid Argument in side calculation');
    }
}

export function perpendicular(side: Side): Side {
    switch (side) {
        case 'top':
            return 'left';
        case 'bottom':
            return 'right';
        case 'left':
            return 'top';
        case 'right':
            return 'bottom';
        default:
            throw new Error('Invalid Argument in side calculation');
    }
}

export const sideArray = ['top', 'bottom', 'left', 'right'] as Side[];