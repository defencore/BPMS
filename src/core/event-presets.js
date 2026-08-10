import { EVENT_TYPES } from './event-schema.js';

const EVENT_TYPE_SET = new Set(EVENT_TYPES);

export const DEFAULT_EVENT_PRESETS = Object.freeze([
    preset('preset-medication', 'medication', 0, 240),
    preset('preset-procedure', 'procedure', 0, 120),
    preset('preset-activity', 'activity', -30, 120),
    preset('preset-exercise', 'exercise', -30, 120),
    preset('preset-coffee', 'coffee', -15, 120),
    preset('preset-meal', 'meal', -30, 120),
    preset('preset-stress', 'stress', -15, 120),
    preset('preset-symptom', 'symptom', 0, 120)
]);

export function cloneDefaultEventPresets() {
    return DEFAULT_EVENT_PRESETS.map(item => ({ ...item }));
}

export function normalizeEventPresets(value) {
    if (!Array.isArray(value)) return cloneDefaultEventPresets();
    const ids = new Set();
    return value.slice(0, 50).map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new TypeError(`Event preset ${index + 1} must be an object`);
        }
        const id = cleanText(item.id, 80);
        if (!id || ids.has(id)) throw new TypeError(`Event preset ${index + 1} must have a unique id`);
        ids.add(id);
        if (!EVENT_TYPE_SET.has(item.type)) throw new TypeError(`Invalid event type in preset ${index + 1}`);
        return Object.freeze({
            id,
            type: item.type,
            label: cleanText(item.label, 80),
            name: cleanText(item.name, 120),
            dose: item.type === 'medication' ? cleanText(item.dose, 80) : '',
            defaultOffsetMinutes: integer(item.defaultOffsetMinutes, -1440, 1440, 0, 'offset', index),
            durationMinutes: integer(item.durationMinutes, 0, 1440, 0, 'duration', index),
            analysisWindowMinutes: integer(item.analysisWindowMinutes, 30, 1440, item.type === 'medication' ? 240 : 120, 'analysis window', index)
        });
    });
}

function preset(id, type, defaultOffsetMinutes, analysisWindowMinutes) {
    return Object.freeze({
        id,
        type,
        label: '',
        name: '',
        dose: '',
        defaultOffsetMinutes,
        durationMinutes: 0,
        analysisWindowMinutes
    });
}

function integer(value, min, max, fallback, field, index) {
    if (value === null || value === undefined || value === '') return fallback;
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
        throw new TypeError(`Invalid ${field} in event preset ${index + 1}`);
    }
    return number;
}

function cleanText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
