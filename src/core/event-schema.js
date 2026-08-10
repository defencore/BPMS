export const EVENT_TYPES = Object.freeze([
    'sleep-start',
    'wake-up',
    'medication',
    'procedure',
    'activity',
    'coffee',
    'alcohol',
    'meal',
    'smoking',
    'stress',
    'exercise',
    'symptom',
    'other'
]);

const EVENT_TYPE_SET = new Set(EVENT_TYPES);

export function normalizeEvent(value, index = 0) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`Event ${index + 1} must be an object`);
    }
    const type = requiredEnum(value.type, EVENT_TYPE_SET, 'type', index);
    const datetime = normalizeEventDateTime(value.datetime, index);
    const durationMinutes = optionalInteger(value.durationMinutes, 0, 1440, 0, 'durationMinutes', index);
    const intensity = value.intensity === null || value.intensity === '' || value.intensity === undefined
        ? null
        : optionalInteger(value.intensity, 1, 5, null, 'intensity', index);
    return Object.freeze({
        id: cleanText(value.id, 80) || `event-${datetime}-${type}-${index}`,
        type,
        datetime,
        anchorMeasurementKey: cleanText(value.anchorMeasurementKey, 180),
        offsetMinutes: optionalInteger(value.offsetMinutes, -1440, 1440, 0, 'offsetMinutes', index),
        presetId: cleanText(value.presetId, 80),
        label: cleanText(value.label, 80),
        name: cleanText(value.name, 120),
        dose: type === 'medication' ? cleanText(value.dose, 80) : '',
        durationMinutes,
        intensity,
        analysisWindowMinutes: optionalInteger(
            value.analysisWindowMinutes,
            30,
            1440,
            defaultAnalysisWindow(type),
            'analysisWindowMinutes',
            index
        ),
        note: cleanText(value.note, 500),
        edited: Boolean(value.edited),
        editedAt: normalizeEditedAt(value.editedAt)
    });
}

function defaultAnalysisWindow(type) {
    return type === 'medication' ? 240 : 120;
}

export function normalizeEventDateTime(value, index = 0) {
    const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/u.exec(value);
    if (!match) throw new TypeError(`Invalid datetime in event ${index + 1}`);
    const [, year, month, day, hour, minute] = match.map(Number);
    const date = new Date(year, month - 1, day, hour, minute);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day
        || date.getHours() !== hour || date.getMinutes() !== minute) {
        throw new TypeError(`Invalid datetime in event ${index + 1}`);
    }
    return value.replace(' ', 'T');
}

function requiredEnum(value, allowed, field, index) {
    if (typeof value !== 'string' || !allowed.has(value)) throw new TypeError(`Invalid ${field} in event ${index + 1}`);
    return value;
}

function optionalInteger(value, min, max, fallback, field, index) {
    if (value === null || value === undefined || value === '') return fallback;
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) throw new TypeError(`Invalid ${field} in event ${index + 1}`);
    return number;
}

function cleanText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeEditedAt(value) {
    if (value === null || value === undefined || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('Invalid event edit timestamp');
    return date.toISOString();
}
