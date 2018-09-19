enum SideEnum {
    'top',
    'bottom',
    'left',
    'right'
}

export type Side = keyof typeof SideEnum;

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