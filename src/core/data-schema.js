import { BODY_POSITION_SET } from './body-positions.js';
import { normalizeEvent } from './event-schema.js';

export const DATA_SCHEMA = 'bpms';
export const DATA_VERSION = 2;
const ERRORS = new Set(['none', 'interrupted', 'movement', 'cuff-pressure', 'unknown']);
const MEASUREMENT_EVENTS = new Set(['automatic', 'manual', 'retest', 'unknown']);

export function createExportPayload({ deviceInfo = {}, measurements = [], events = [], sources = [] } = {}) {
    return {
        schema: DATA_SCHEMA,
        version: DATA_VERSION,
        exportedAt: new Date().toISOString(),
        device: sanitizeDevice(deviceInfo),
        measurements: measurements.map(normalizeMeasurement),
        events: events.map(normalizeEvent),
        sources: sources.filter(value => typeof value === 'string')
    };
}

export function parseExportPayload(payload) {
    if (!payload || typeof payload !== 'object') throw new TypeError('Import payload must be an object');
    if (payload.schema !== DATA_SCHEMA || ![1, DATA_VERSION].includes(payload.version)) {
        throw new TypeError(`Unsupported data schema. Expected ${DATA_SCHEMA} v1 or v${DATA_VERSION}`);
    }
    if (!Array.isArray(payload.measurements)) throw new TypeError('Measurements must be an array');
    return {
        deviceInfo: sanitizeDevice(payload.device),
        measurements: payload.measurements.map(normalizeMeasurement),
        events: payload.version === 1 ? [] : normalizeEvents(payload.events),
        sources: Array.isArray(payload.sources) ? payload.sources.filter(value => typeof value === 'string') : []
    };
}

function normalizeEvents(events) {
    if (!Array.isArray(events)) throw new TypeError('Events must be an array');
    return events.map(normalizeEvent);
}

export function normalizeMeasurement(value, index = 0) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`Measurement ${index + 1} must be an object`);
    }
    const systolic = integerInRange(value.systolic, 20, 300, 'systolic', index);
    const diastolic = integerInRange(value.diastolic, 20, 200, 'diastolic', index);
    const pulse = integerInRange(value.pulse, 20, 250, 'pulse', index);
    const datetime = normalizeDateTime(value.datetime, index);
    return {
        index,
        systolic,
        diastolic,
        pulse,
        datetime,
        errorCode: integerInRange(value.errorCode ?? 0, 0, 255, 'errorCode', index),
        error: enumOr(value.error, ERRORS, 'none'),
        bodyPosition: requiredEnum(value.bodyPosition, BODY_POSITION_SET, 'bodyPosition', index),
        measurementMethod: value.measurementMethod === 'manual' ? 'manual' : 'automatic',
        measurementEvent: enumOr(
            value.measurementEvent,
            MEASUREMENT_EVENTS,
            value.measurementMethod === 'manual' ? 'manual' : 'automatic'
        ),
        hasMovement: Boolean(value.hasMovement),
        comment: normalizeComment(value.comment),
        edited: Boolean(value.edited),
        editedAt: normalizeEditedAt(value.editedAt)
    };
}

export function measurementIdentity(measurement) {
    return `${measurement.datetime}|${measurement.systolic}|${measurement.diastolic}|${measurement.pulse}`;
}

function normalizeDateTime(value, index) {
    const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(value);
    if (!match) {
        throw new TypeError(`Invalid datetime in measurement ${index + 1}`);
    }
    const normalized = value.replace('T', ' ');
    const [, year, month, day, hour, minute] = match.map(Number);
    const date = new Date(year, month - 1, day, hour, minute);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day
        || date.getHours() !== hour || date.getMinutes() !== minute) {
        throw new TypeError(`Invalid datetime in measurement ${index + 1}`);
    }
    return normalized;
}

function integerInRange(value, min, max, field, index) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
        throw new TypeError(`Invalid ${field} in measurement ${index + 1}`);
    }
    return number;
}

function sanitizeDevice(device = {}) {
    return {
        id: nullableString(device?.id),
        numRecords: Number.isInteger(Number(device?.numRecords)) ? Number(device.numRecords) : 0,
        username: nullableString(device?.username),
        userId: nullableString(device?.userId),
        serialNumber: nullableString(device?.serialNumber),
        macAddress: nullableString(device?.macAddress)
    };
}

function nullableString(value) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, 128) : null;
}

function normalizeComment(value) {
    return typeof value === 'string' ? value.trim().slice(0, 500) : '';
}

function normalizeEditedAt(value) {
    if (value === null || value === undefined || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('Invalid measurement edit timestamp');
    return date.toISOString();
}

function enumOr(value, allowed, fallback) {
    return typeof value === 'string' && allowed.has(value) ? value : fallback;
}

function requiredEnum(value, allowed, field, index) {
    if (typeof value !== 'string' || !allowed.has(value)) {
        throw new TypeError(`Invalid ${field} in measurement ${index + 1}`);
    }
    return value;
}
