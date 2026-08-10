import { measurementIdentity } from './data-schema.js';
import { parseMeasurementDate, toLocalDateTimeValue } from './analytics/time.js';

export function measurementAnchorKey(measurement) {
    return measurementIdentity(measurement);
}

export function eventsForMeasurement(events, measurement) {
    const key = measurementAnchorKey(measurement);
    return events.filter(event => event.anchorMeasurementKey === key);
}

export function eventDateTimeFromMeasurement(measurement, offsetMinutes) {
    const date = parseMeasurementDate(measurement.datetime);
    if (!date) throw new TypeError('Invalid measurement datetime for context event');
    date.setMinutes(date.getMinutes() + Number(offsetMinutes));
    return toLocalDateTimeValue(date);
}

export function formatEventOffset(offsetMinutes) {
    const value = Number(offsetMinutes);
    if (!Number.isFinite(value)) return '—';
    const sign = value < 0 ? '-' : value > 0 ? '+' : '±';
    const absolute = Math.abs(Math.trunc(value));
    return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}
