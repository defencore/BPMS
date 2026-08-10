export const BODY_POSITION_VALUES = Object.freeze([
    'lying',
    'sitting',
    'standing',
    'sitting-standing',
    'physical-activity',
    'unknown'
]);

export const BODY_POSITION_SET = new Set(BODY_POSITION_VALUES);

export const MANUAL_BODY_POSITIONS = Object.freeze([
    'lying',
    'sitting',
    'standing',
    'physical-activity',
    'unknown'
]);

export function bodyPositionLabelKey(value) {
    return `position.${BODY_POSITION_SET.has(value) ? value : 'unknown'}`;
}

export function isLyingPosition(value) {
    return value === 'lying';
}
