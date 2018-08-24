/**
 * The maximum distance at which two windows will snap together.
 */
export const SNAP_DISTANCE = 35;

/**
 * If two window corners would snap to a distance less than this threshold, the active window will be snapped to the
 * corner of the candidate window.
 *
 * This radius essentially defines how "sticky" the corners of windows are. Larger values makes it easier to align
 * windows.
 */
export const ANCHOR_DISTANCE = 100;

/**
 * The minimum amount of overlap required for two window edges to snap together.
 */
export const MIN_OVERLAP = 50;
